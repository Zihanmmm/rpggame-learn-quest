import type {
  PipelineStage,
  TextAnalysis,
  GameDesign,
  ScenePlan,
  SceneDetail,
  AssetMapping,
  SectionContext,
  BookSection,
} from "@/pipeline/types";
import { analyzeText } from "@/pipeline/text-analyzer";
import { designGame } from "@/pipeline/game-designer";
import { planScenes } from "@/pipeline/scene-planner";
import { buildScenes } from "@/pipeline/scene-builder";
import { mapAssets } from "@/pipeline/asset-mapper";
import { adaptToRPGMaker } from "@/pipeline/rpgmaker-adapter";
import { splitSections } from "@/pipeline/section-splitter";
import { getStagePrompt } from "@/pipeline/prompts";
import {
  getProject,
  getStepResult,
  saveStepResult,
  updateProject,
  updateSections,
  getSections,
  STAGE_ORDER,
} from "@/lib/db";
import type { LlmCallContext } from "@/llm/client";
import { chatCompletionStream } from "@/llm/client";

// ---- Stage key parsing ----

interface ParsedStage {
  baseStage: PipelineStage;
  sectionIndex: number | null;
}

/** Parse "game_design:2" → { baseStage: "game_design", sectionIndex: 2 } */
export function parseStageKey(key: string): ParsedStage {
  const parts = key.split(":");
  return {
    baseStage: parts[0] as PipelineStage,
    sectionIndex: parts.length > 1 ? parseInt(parts[1], 10) : null,
  };
}

/** Build composite stage key */
function stageKey(base: PipelineStage, sectionIndex: number | null): string {
  return sectionIndex !== null ? `${base}:${sectionIndex}` : base;
}

// Per-section stages (run once per section in book mode)
const PER_SECTION_STAGES: PipelineStage[] = ["game_design", "scene_planning", "scene_building"];

function isPerSectionStage(stage: PipelineStage): boolean {
  return PER_SECTION_STAGES.includes(stage);
}

// ---- Next stage logic ----

function nextStageArticle(stage: PipelineStage): string {
  // Article mode: skip section_splitting
  const articleOrder = STAGE_ORDER.filter(s => s !== "section_splitting");
  const idx = articleOrder.indexOf(stage as typeof articleOrder[number]);
  if (idx < 0 || idx >= articleOrder.length - 1) return "complete";
  return articleOrder[idx + 1];
}

function nextStageBook(currentKey: string, sections: BookSection[]): string {
  const { baseStage, sectionIndex } = parseStageKey(currentKey);
  const sectionCount = sections.length;

  if (baseStage === "section_splitting") return "text_analysis";
  if (baseStage === "text_analysis") return stageKey("game_design", 0);

  if (isPerSectionStage(baseStage) && sectionIndex !== null) {
    // Within a section: game_design → scene_planning → scene_building
    const perSectionOrder: PipelineStage[] = ["game_design", "scene_planning", "scene_building"];
    const idx = perSectionOrder.indexOf(baseStage);

    if (idx < perSectionOrder.length - 1) {
      // Next per-section stage, same section
      return stageKey(perSectionOrder[idx + 1], sectionIndex);
    }
    // Finished this section's scene_building
    if (sectionIndex < sectionCount - 1) {
      // Start next section
      return stageKey("game_design", sectionIndex + 1);
    }
    // All sections done → asset_mapping
    return "asset_mapping";
  }

  if (baseStage === "asset_mapping") return "rpgmaker_adapter";
  if (baseStage === "rpgmaker_adapter") return "complete";

  return "complete";
}

// ---- Helpers ----

function loadStepJson<T>(projectId: string, stage: string): T {
  const row = getStepResult(projectId, stage);
  if (!row) throw new Error(`Missing prerequisite step result: ${stage}`);
  return JSON.parse(row.result_json) as T;
}

function getSectionText(fullText: string, section: BookSection): string {
  return fullText.slice(section.startOffset, section.endOffset + 1);
}

function buildSectionContext(
  sections: BookSection[],
  index: number,
  fullText: string,
  projectId: string,
): SectionContext {
  const section = sections[index];
  let prevSummary: string | undefined;

  // Get previous section's game_design as summary
  if (index > 0) {
    const prevDesign = getStepResult(projectId, stageKey("game_design", index - 1));
    if (prevDesign) {
      try {
        const pd = JSON.parse(prevDesign.result_json) as GameDesign;
        prevSummary = pd.anchorEvents.map(e => e.description).join("; ");
      } catch { /* ignore */ }
    }
  }

  return {
    index,
    title: section.title,
    totalSections: sections.length,
    sectionText: getSectionText(fullText, section),
    prevSectionSummary: prevSummary,
  };
}

// ---- Main runStep ----

export async function runStep(
  projectId: string,
  stage: string,
  onToken?: (token: string) => void,
): Promise<unknown> {
  const project = getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const isBook = project.input_mode === "book";
  const { baseStage, sectionIndex } = parseStageKey(stage);

  updateProject(projectId, { status: "running", current_stage: stage, error: null });

  const ctx: LlmCallContext = { projectId, stage, onToken };

  console.log(`[Pipeline] Running step: ${stage} for project ${projectId.slice(0, 8)}`);
  const start = Date.now();

  try {
    let result: unknown;

    switch (baseStage) {
      case "section_splitting": {
        if (!isBook) throw new Error("section_splitting is only for book mode");
        const sections = await splitSections(project.article_text, ctx);
        updateSections(projectId, sections);
        result = sections;
        break;
      }
      case "text_analysis": {
        result = await analyzeText(project.article_text, ctx);
        break;
      }
      case "game_design": {
        const analysis = loadStepJson<TextAnalysis>(projectId, "text_analysis");
        if (isBook && sectionIndex !== null) {
          const sections = getSections(projectId);
          const sectionCtx = buildSectionContext(sections, sectionIndex, project.article_text, projectId);
          result = await designGame(analysis, ctx, sectionCtx);
        } else {
          result = await designGame(analysis, ctx);
        }
        break;
      }
      case "scene_planning": {
        const analysis = loadStepJson<TextAnalysis>(projectId, "text_analysis");
        const designKey = sectionIndex !== null ? stageKey("game_design", sectionIndex) : "game_design";
        const design = loadStepJson<GameDesign>(projectId, designKey);
        if (isBook && sectionIndex !== null) {
          const sections = getSections(projectId);
          const sectionCtx = buildSectionContext(sections, sectionIndex, project.article_text, projectId);
          result = await planScenes(analysis, design, ctx, sectionCtx);
        } else {
          result = await planScenes(analysis, design, ctx);
        }
        break;
      }
      case "scene_building": {
        const analysis = loadStepJson<TextAnalysis>(projectId, "text_analysis");
        const designKey = sectionIndex !== null ? stageKey("game_design", sectionIndex) : "game_design";
        const planKey = sectionIndex !== null ? stageKey("scene_planning", sectionIndex) : "scene_planning";
        const design = loadStepJson<GameDesign>(projectId, designKey);
        const plan = loadStepJson<ScenePlan>(projectId, planKey);
        if (isBook && sectionIndex !== null) {
          const sections = getSections(projectId);
          const sectionCtx = buildSectionContext(sections, sectionIndex, project.article_text, projectId);
          result = await buildScenes(analysis, design, plan, ctx, sectionCtx);
        } else {
          result = await buildScenes(analysis, design, plan, ctx);
        }
        break;
      }
      case "asset_mapping": {
        const analysis = loadStepJson<TextAnalysis>(projectId, "text_analysis");
        if (isBook) {
          // Merge all section scene plans into one
          const sections = getSections(projectId);
          const mergedPlan = mergeScenePlans(projectId, sections);
          result = await mapAssets(analysis, mergedPlan, ctx);
        } else {
          const plan = loadStepJson<ScenePlan>(projectId, "scene_planning");
          result = await mapAssets(analysis, plan, ctx);
        }
        break;
      }
      case "rpgmaker_adapter": {
        const textAnalysis = loadStepJson<TextAnalysis>(projectId, "text_analysis");
        const assetMapping = loadStepJson<AssetMapping>(projectId, "asset_mapping");

        if (isBook) {
          const sections = getSections(projectId);
          const { gameDesign, scenePlan, sceneDetails } = mergeAllSectionData(projectId, sections);

          onToken?.("\nGenerating RPG Maker MZ project files (book mode)...\n");
          const outputPath = await adaptToRPGMaker({
            textAnalysis,
            gameDesign,
            scenePlan,
            sceneDetails,
            assetMapping,
          });
          result = { outputPath };
          updateProject(projectId, { output_path: outputPath });
        } else {
          const gameDesign = loadStepJson<GameDesign>(projectId, "game_design");
          const scenePlan = loadStepJson<ScenePlan>(projectId, "scene_planning");
          const sceneDetails = loadStepJson<SceneDetail[]>(projectId, "scene_building");

          onToken?.("\nGenerating RPG Maker MZ project files...\n");
          const outputPath = await adaptToRPGMaker({
            textAnalysis,
            gameDesign,
            scenePlan,
            sceneDetails,
            assetMapping,
          });
          result = { outputPath };
          updateProject(projectId, { output_path: outputPath });
        }
        break;
      }
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }

    saveStepResult(projectId, stage, JSON.stringify(result));

    const sections = isBook ? getSections(projectId) : [];
    const next = isBook
      ? nextStageBook(stage, sections)
      : nextStageArticle(baseStage);

    updateProject(projectId, {
      current_stage: next,
      status: next === "complete" ? "completed" : "idle",
    });

    const elapsed = Date.now() - start;
    console.log(`[Pipeline] Step ${stage} completed in ${elapsed}ms`);

    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Pipeline] Step ${stage} failed: ${errMsg}`);
    updateProject(projectId, { status: "error", error: errMsg });
    throw err;
  }
}

// ---- Book mode: merge section data ----

/** Merge all section ScenePlans into one, prefixing scene IDs with section index */
function mergeScenePlans(projectId: string, sections: BookSection[]): ScenePlan {
  const allScenes: ScenePlan["scenes"] = [];
  const allConnections: ScenePlan["connections"] = [];
  let startSceneId = "";

  for (let i = 0; i < sections.length; i++) {
    const plan = loadStepJson<ScenePlan>(projectId, stageKey("scene_planning", i));

    const prefixed = prefixScenePlan(plan, i);
    allScenes.push(...prefixed.scenes);
    allConnections.push(...prefixed.connections);

    if (i === 0) {
      startSceneId = prefixed.startSceneId;
    }

    // Connect sections: last scene of section i → first scene of section i+1
    if (i < sections.length - 1) {
      const nextPlan = loadStepJson<ScenePlan>(projectId, stageKey("scene_planning", i + 1));
      const lastScene = prefixed.scenes[prefixed.scenes.length - 1];
      const nextFirstScene = `s${i + 1}_${nextPlan.startSceneId}`;

      allConnections.push({
        fromSceneId: lastScene.id,
        toSceneId: nextFirstScene,
        transitionType: "walk",
        description: `前往${sections[i + 1].title}`,
      });
    }
  }

  return { scenes: allScenes, connections: allConnections, startSceneId };
}

function prefixScenePlan(plan: ScenePlan, sectionIndex: number): ScenePlan {
  const prefix = `s${sectionIndex}_`;
  return {
    scenes: plan.scenes.map(s => ({ ...s, id: prefix + s.id })),
    connections: plan.connections.map(c => ({
      ...c,
      fromSceneId: prefix + c.fromSceneId,
      toSceneId: prefix + c.toSceneId,
    })),
    startSceneId: prefix + plan.startSceneId,
  };
}

/** Merge all section data for rpgmaker_adapter */
function mergeAllSectionData(projectId: string, sections: BookSection[]) {
  const allAnchorEvents: GameDesign["anchorEvents"] = [];
  const allDecisionNodes: GameDesign["decisionNodes"] = [];
  const allGameFlow: GameDesign["gameFlow"] = [];
  const allSceneDetails: SceneDetail[] = [];
  let protagonistId = "";
  let totalPlaytime = 0;

  const mergedScenePlan = mergeScenePlans(projectId, sections);

  for (let i = 0; i < sections.length; i++) {
    const design = loadStepJson<GameDesign>(projectId, stageKey("game_design", i));
    const details = loadStepJson<SceneDetail[]>(projectId, stageKey("scene_building", i));
    const prefix = `s${i}_`;

    if (i === 0) protagonistId = design.protagonistId;
    totalPlaytime += design.estimatedPlaytimeMinutes;

    // Prefix IDs in game design
    allAnchorEvents.push(...design.anchorEvents.map(e => ({
      ...e,
      id: prefix + e.id,
      locationId: prefix + e.locationId,
    })));
    allDecisionNodes.push(...design.decisionNodes.map(n => ({
      ...n,
      id: prefix + n.id,
      locationId: prefix + n.locationId,
      options: n.options.map(o => ({
        ...o,
        id: prefix + o.id,
        nextNodeId: prefix + o.nextNodeId,
      })),
    })));
    allGameFlow.push(...design.gameFlow.map(f => ({
      ...f,
      id: prefix + f.id,
      locationId: prefix + f.locationId,
      nextNodeIds: f.nextNodeIds.map(nid => prefix + nid),
    })));

    // Prefix scene IDs in scene details
    allSceneDetails.push(...details.map(d => ({
      ...d,
      sceneId: prefix + d.sceneId,
      events: d.events.map(evt => ({
        ...evt,
        transfer: evt.transfer ? {
          ...evt.transfer,
          targetSceneId: prefix + evt.transfer.targetSceneId,
        } : undefined,
      })),
    })));
  }

  const gameDesign: GameDesign = {
    protagonistId,
    anchorEvents: allAnchorEvents,
    decisionNodes: allDecisionNodes,
    gameFlow: allGameFlow,
    estimatedPlaytimeMinutes: totalPlaytime,
  };

  return { gameDesign, scenePlan: mergedScenePlan, sceneDetails: allSceneDetails };
}

// ---- Sync step (incremental update) ----

const STAGE_DEPS: Record<string, PipelineStage[]> = {
  section_splitting: [],
  text_analysis: [],
  game_design: ["text_analysis"],
  scene_planning: ["text_analysis", "game_design"],
  scene_building: ["text_analysis", "game_design", "scene_planning"],
  asset_mapping: ["text_analysis", "scene_planning"],
  rpgmaker_adapter: ["text_analysis", "game_design", "scene_planning", "scene_building", "asset_mapping"],
};

const STAGE_LABELS: Record<string, string> = {
  section_splitting: "章节拆分",
  text_analysis: "文本分析",
  game_design: "游戏设计",
  scene_planning: "场景规划",
  scene_building: "场景构建",
  asset_mapping: "素材映射",
  rpgmaker_adapter: "工程生成",
};

export async function syncStep(
  projectId: string,
  stage: string,
  onToken?: (token: string) => void,
): Promise<unknown> {
  const { baseStage } = parseStageKey(stage);

  // Deterministic or no-upstream stages: just re-run
  if (baseStage === "rpgmaker_adapter" || baseStage === "text_analysis" || baseStage === "section_splitting") {
    return runStep(projectId, stage, onToken);
  }

  const project = getProject(projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const currentResult = getStepResult(projectId, stage);
  if (!currentResult) {
    return runStep(projectId, stage, onToken);
  }

  updateProject(projectId, { status: "running", current_stage: stage, error: null });

  console.log(`[Pipeline] Syncing step: ${stage} for project ${projectId.slice(0, 8)}`);
  const start = Date.now();

  try {
    const deps = STAGE_DEPS[baseStage] || [];
    const { sectionIndex } = parseStageKey(stage);

    const upstreamSections = deps.map((dep) => {
      // For per-section deps, use the section-specific key
      const depKey = (isPerSectionStage(dep) && sectionIndex !== null)
        ? stageKey(dep, sectionIndex)
        : dep;
      const row = getStepResult(projectId, depKey);
      const label = STAGE_LABELS[dep] || dep;
      return `### ${label} (${depKey}):\n${row?.result_json ?? "(missing)"}`;
    }).join("\n\n");

    const originalPrompt = getStagePrompt(baseStage);

    const systemPrompt = `You are an assistant that incrementally updates a pipeline step result after upstream data has changed.

The JSON must follow this exact schema and format requirements:
${originalPrompt}

Your task: The upstream steps have been modified. You have the PREVIOUS result for this step and the NEW upstream data.
Revise the result to be consistent with the new upstream data while:
- Preserving all user-edited fields and customizations (e.g. manually set IDs, labels, positions, markers)
- Only changing what's necessary to maintain consistency with upstream changes
- If upstream added new items (characters, scenes, etc.), add corresponding entries
- If upstream removed items, remove corresponding entries
- If upstream renamed items, update references accordingly
- Keep the overall structure and schema intact

All human-readable text values (names, descriptions, dialogue, etc.) MUST be in Chinese (中文). Only IDs and technical fields stay in English.

Return ONLY the complete revised JSON object.`;

    const userPrompt = `## Previous Result (this step):\n${currentResult.result_json}\n\n## New Upstream Data:\n${upstreamSections}`;

    const result = await chatCompletionStream<unknown>(
      systemPrompt,
      userPrompt,
      {
        projectId,
        stage: `sync:${stage}`,
        onToken,
      },
      { temperature: 0.3 },
    );

    const resultJson = JSON.stringify(result);
    saveStepResult(projectId, stage, resultJson);

    updateProject(projectId, { status: "idle", error: null });

    const elapsed = Date.now() - start;
    console.log(`[Pipeline] Sync ${stage} completed in ${elapsed}ms`);

    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Pipeline] Sync ${stage} failed: ${errMsg}`);
    updateProject(projectId, { status: "error", error: errMsg });
    throw err;
  }
}

/** Get the full ordered list of stages for a project (used by UI) */
export function getBookStageOrder(sections: BookSection[]): string[] {
  const stages: string[] = ["section_splitting", "text_analysis"];
  for (let i = 0; i < sections.length; i++) {
    stages.push(stageKey("game_design", i));
    stages.push(stageKey("scene_planning", i));
    stages.push(stageKey("scene_building", i));
  }
  stages.push("asset_mapping", "rpgmaker_adapter");
  return stages;
}
