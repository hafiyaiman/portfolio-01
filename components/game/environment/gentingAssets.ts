// Keep scenery, route heights and tree instances on the same export revision.
const revision = "20260907-003828";
export const GENTING_ASSETS = {
  scenery: `/maps/genting/game-scenery.glb?v=${revision}`,
  preview: `/maps/genting/game-scenery.glb?v=${revision}`,
  alignment: `/maps/genting/alignment.json?v=${revision}`,
  trees: `/maps/genting/trees.json?v=${revision}`,
  hybridScenery: `/maps/genting/hybrid-scenery.glb?v=${revision}-hybrid1`,
  hybridTrees: `/maps/genting/hybrid-trees.json?v=${revision}-hybrid1`,
  customScenery: `/maps/genting/custom-scenery.glb?v=${revision}-custom1`,
  customTrees: `/maps/genting/custom-trees.json?v=${revision}-custom1`,
};
