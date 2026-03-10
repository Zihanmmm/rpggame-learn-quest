// TODO: Replace with phaser-adapter.ts in Phase 2
// Stub to maintain compilation

export interface AdapterInput {
  textAnalysis: unknown;
  gameDesign: unknown;
  scenePlan: unknown;
  sceneDetails: unknown;
  assetMapping: unknown;
  projectName?: string;
}

export async function adaptToRPGMaker(_state: AdapterInput): Promise<string> {
  throw new Error("RPG Maker adapter removed. Phaser adapter coming in Phase 2.");
}
