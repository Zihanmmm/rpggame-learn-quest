"use client";

export interface StageInfo {
  key: string;
  label: string;
  sectionIndex?: number;
}

const ARTICLE_STAGES: StageInfo[] = [
  { key: "text_analysis", label: "文本分析" },
  { key: "game_design", label: "游戏设计" },
  { key: "scene_planning", label: "场景规划" },
  { key: "scene_building", label: "场景构建" },
  { key: "phaser_asset_mapper", label: "地图生成" },
  { key: "phaser_adapter", label: "工程生成" },
];

// For backward compatibility
const STAGES = ARTICLE_STAGES;

const STAGE_INDEX: Record<string, number> = {};
STAGES.forEach((s, i) => (STAGE_INDEX[s.key] = i));
STAGE_INDEX["complete"] = STAGES.length;

export interface BookSectionMeta {
  index: number;
  title: string;
}

export function buildBookStages(sections: BookSectionMeta[]): StageInfo[] {
  const stages: StageInfo[] = [
    { key: "section_splitting", label: "章节拆分" },
    { key: "text_analysis", label: "文本分析" },
  ];
  for (const sec of sections) {
    const shortTitle = sec.title.length > 6 ? sec.title.slice(0, 6) + "…" : sec.title;
    stages.push(
      { key: `game_design:${sec.index}`, label: `设计·${shortTitle}`, sectionIndex: sec.index },
      { key: `scene_planning:${sec.index}`, label: `规划·${shortTitle}`, sectionIndex: sec.index },
      { key: `scene_building:${sec.index}`, label: `构建·${shortTitle}`, sectionIndex: sec.index },
    );
  }
  stages.push(
    { key: "phaser_asset_mapper", label: "地图生成" },
    { key: "phaser_adapter", label: "工程生成" },
  );
  return stages;
}

interface Props {
  currentStage: string;
  status: string;
  completedStages: Set<string>;
  staleStages: Set<string>;
  activeStage: string | null;
  onStageClick: (stage: string) => void;
  stages?: StageInfo[];
}

export default function StepStepper({
  currentStage,
  status,
  completedStages,
  staleStages,
  activeStage,
  onStageClick,
  stages,
}: Props) {
  const stageList = stages ?? ARTICLE_STAGES;
  const stageIndexMap: Record<string, number> = {};
  stageList.forEach((s, i) => (stageIndexMap[s.key] = i));
  stageIndexMap["complete"] = stageList.length;

  const currentIdx = stageIndexMap[currentStage] ?? 0;
  const isRunning = status === "running";

  // Group stages by section for book mode (collapsible)
  const isBooksMode = stageList.some(s => s.sectionIndex !== undefined);

  // For book mode with many stages, show a compact view
  if (isBooksMode && stageList.length > 10) {
    return (
      <BookModeStepper
        stages={stageList}
        currentStage={currentStage}
        status={status}
        completedStages={completedStages}
        staleStages={staleStages}
        activeStage={activeStage}
        onStageClick={onStageClick}
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      {stageList.map((s, i) => {
        const done = completedStages.has(s.key);
        const stale = staleStages.has(s.key);
        const selected = activeStage === s.key;
        const running = isRunning && currentIdx === i;
        const clickable = done || s.key === currentStage;

        return (
          <div key={s.key} className="flex flex-1 items-center">
            <button
              onClick={() => clickable && onStageClick(s.key)}
              disabled={!clickable}
              className={`relative flex flex-col items-center gap-1.5 rounded-lg px-2 py-2 transition-all disabled:cursor-default ${
                selected
                  ? "bg-blue-50 ring-2 ring-blue-400/60"
                  : "hover:bg-gray-100"
              }`}
              title={stale ? "上游步骤已更新，此步骤结果可能已过时" : undefined}
            >
              <StepCircle
                index={i}
                done={done}
                stale={stale}
                running={running}
                selected={selected}
                isError={status === "error" && currentIdx === i}
              />
              <span
                className={`hidden text-center text-xs font-medium sm:block ${
                  running
                    ? "text-blue-600"
                    : stale
                      ? "text-amber-600"
                      : done
                        ? "text-emerald-600"
                        : selected
                          ? "text-blue-600"
                          : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
              {stale && (
                <span className="hidden text-[10px] text-amber-500 sm:block">
                  需要同步
                </span>
              )}
            </button>
            {i < stageList.length - 1 && (
              <div
                className={`mx-1 h-0.5 flex-1 rounded transition-colors ${
                  stale
                    ? "bg-amber-400/50"
                    : completedStages.has(s.key)
                      ? "bg-emerald-400/50"
                      : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Compact stepper for book mode: groups per-section stages */
function BookModeStepper({
  stages,
  currentStage,
  status,
  completedStages,
  staleStages,
  activeStage,
  onStageClick,
}: {
  stages: StageInfo[];
  currentStage: string;
  status: string;
  completedStages: Set<string>;
  staleStages: Set<string>;
  activeStage: string | null;
  onStageClick: (stage: string) => void;
}) {
  // Group: global stages + section groups + global stages
  const globalBefore = stages.filter(s => s.sectionIndex === undefined && (s.key === "section_splitting" || s.key === "text_analysis"));
  const globalAfter = stages.filter(s => s.sectionIndex === undefined && s.key !== "section_splitting" && s.key !== "text_analysis");

  // Group section stages by index
  const sectionMap = new Map<number, StageInfo[]>();
  for (const s of stages) {
    if (s.sectionIndex !== undefined) {
      const list = sectionMap.get(s.sectionIndex) ?? [];
      list.push(s);
      sectionMap.set(s.sectionIndex, list);
    }
  }

  const isRunning = status === "running";

  function renderGlobalStage(s: StageInfo, i: number, total: number) {
    const done = completedStages.has(s.key);
    const stale = staleStages.has(s.key);
    const selected = activeStage === s.key;
    const running = isRunning && currentStage === s.key;
    const clickable = done || s.key === currentStage;

    return (
      <div key={s.key} className="flex items-center">
        <button
          onClick={() => clickable && onStageClick(s.key)}
          disabled={!clickable}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            selected ? "bg-blue-50 ring-2 ring-blue-400/60" : clickable ? "hover:bg-gray-100" : "cursor-default"
          } ${running ? "text-blue-600" : stale ? "text-amber-600" : done ? "text-emerald-600" : "text-gray-400"}`}
        >
          <StepCircle index={i} done={done} stale={stale} running={running} selected={selected} isError={status === "error" && currentStage === s.key} small />
          <span className="hidden sm:inline">{s.label}</span>
        </button>
      </div>
    );
  }

  function renderSectionGroup(sectionIndex: number, sectionStages: StageInfo[]) {
    const allDone = sectionStages.every(s => completedStages.has(s.key));
    const anyRunning = sectionStages.some(s => isRunning && currentStage === s.key);
    const anyStale = sectionStages.some(s => staleStages.has(s.key));
    const anySelected = sectionStages.some(s => activeStage === s.key);

    // Extract section title from the first stage label
    const titleMatch = sectionStages[0].label.match(/·(.+)$/);
    const sectionTitle = titleMatch ? titleMatch[1] : `章节${sectionIndex + 1}`;

    const doneCount = sectionStages.filter(s => completedStages.has(s.key)).length;

    return (
      <div key={`section-${sectionIndex}`} className="flex flex-col gap-1">
        <div className={`rounded-lg border px-3 py-2 ${
          anySelected ? "border-blue-300 bg-blue-50" : anyRunning ? "border-blue-200 bg-blue-50/50" : allDone ? "border-emerald-200 bg-emerald-50/50" : "border-gray-200"
        }`}>
          <div className="mb-1 flex items-center justify-between">
            <span className={`text-xs font-semibold ${anyRunning ? "text-blue-600" : anyStale ? "text-amber-600" : allDone ? "text-emerald-600" : "text-gray-500"}`}>
              {sectionTitle}
            </span>
            <span className="text-[10px] text-gray-400">{doneCount}/{sectionStages.length}</span>
          </div>
          <div className="flex gap-1">
            {sectionStages.map((s) => {
              const done = completedStages.has(s.key);
              const stale = staleStages.has(s.key);
              const selected = activeStage === s.key;
              const running = isRunning && currentStage === s.key;
              const clickable = done || s.key === currentStage;
              const shortLabel = s.label.split("·")[0];

              return (
                <button
                  key={s.key}
                  onClick={() => clickable && onStageClick(s.key)}
                  disabled={!clickable}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition-all ${
                    selected ? "bg-blue-100 text-blue-700" : running ? "bg-blue-100 text-blue-600" : done ? "bg-emerald-100 text-emerald-700" : stale ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"
                  } ${clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                >
                  {running && <span className="mr-1 inline-block h-2 w-2 animate-spin rounded-full border border-blue-500 border-t-transparent" />}
                  {shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Global before */}
      <div className="flex items-center gap-1">
        {globalBefore.map((s, i) => renderGlobalStage(s, i, globalBefore.length))}
      </div>

      {/* Section groups */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[...sectionMap.entries()].sort((a, b) => a[0] - b[0]).map(([idx, ss]) => renderSectionGroup(idx, ss))}
      </div>

      {/* Global after */}
      <div className="flex items-center gap-1">
        {globalAfter.map((s, i) => renderGlobalStage(s, globalBefore.length + sectionMap.size * 3 + i, globalAfter.length))}
      </div>
    </div>
  );
}

function StepCircle({ index, done, stale, running, selected, isError, small }: {
  index: number;
  done: boolean;
  stale: boolean;
  running: boolean;
  selected: boolean;
  isError: boolean;
  small?: boolean;
}) {
  const size = small ? "h-6 w-6 text-xs" : "h-9 w-9 text-sm";
  const iconSize = small ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div
      className={`flex ${size} items-center justify-center rounded-full font-semibold transition-all ${
        running
          ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
          : stale
            ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
            : done
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
              : isError
                ? "bg-red-500 text-white"
                : selected
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                  : "bg-gray-200 text-gray-400"
      }`}
    >
      {running ? (
        <svg className={`${iconSize} animate-spin`} viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : stale ? (
        <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ) : done ? (
        <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        index + 1
      )}
    </div>
  );
}

export { STAGES, STAGE_INDEX };
