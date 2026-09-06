export const CATALOG = {
  front: { label: "Front bumper", options: [
    { name: "Original", parts: [272] }, { name: "Street 01", parts: [263] }, { name: "Street 02", parts: [270] }, { name: "Track 01", parts: [278] },
  ] },
  rear: { label: "Rear bumper", options: [
    { name: "Original", parts: [256] }, { name: "Street 01", parts: [259] }, { name: "Track 01", parts: [260] },
  ] },
  bonnet: { label: "Bonnet", options: [
    { name: "Original", parts: [165] }, { name: "Alternative", parts: [164] }, { name: "Exposed engine", parts: [] },
  ] },
  skirts: { label: "Side skirts", options: [
    { name: "Original", parts: [63, 69] }, { name: "Extended", parts: [67, 73] }, { name: "Street", parts: [68, 74] },
  ] },
  spoiler: { label: "Rear wing", options: [
    { name: "None", parts: [] }, { name: "Low lip", parts: [48] }, { name: "Raised wing", parts: [51] },
    { name: "GT wing 01", parts: [47] }, { name: "GT wing 02", parts: [53] }, { name: "GT wing 03", parts: [54] },
  ] },
  trunk: { label: "Trunk", options: [
    { name: "Original lid", parts: [11] }, { name: "Smooth lid", parts: [10] }, { name: "Stripped frame", parts: [9] },
  ] },
  fenders: { label: "Front fenders", options: [
    { name: "Original flared", parts: [214, 219] },
    { name: "Slim 01", parts: [215, 220] },
    { name: "Slim 02", parts: [216, 221] },
    { name: "Dark wide", parts: [217, 222] },
    { name: "Dark flared", parts: [218, 223] },
  ] },
  widebody: { label: "Widebody", options: [
    { name: "Original shell", parts: [103] },
    { name: "Wide rear arches", parts: [104] },
    { name: "Slim rear arches", parts: [105] },
  ] },
};
export type Category = keyof typeof CATALOG;
export const CATEGORIES = Object.keys(CATALOG) as Category[];
export const PAINTS = [
  { name: "Pearl silver", color: "#bbc7ce" }, { name: "Midnight", color: "#202830" },
  { name: "Racing red", color: "#af2029" }, { name: "Glacier", color: "#e4e9e6" },
  { name: "Petrol blue", color: "#17687c" }, { name: "Acid yellow", color: "#c9d63a" },
];
export type Build = { parts: Record<Category, number>; paint: string };
export const DEFAULT_BUILD: Build = { parts: { front: 0, rear: 0, bonnet: 0, skirts: 0, spoiler: 0, trunk: 0, fenders: 0, widebody: 0 }, paint: PAINTS[0].color };
export function validateBuild(value: unknown): Build {
  const input = value as Partial<Build> | null;
  const parts = { ...DEFAULT_BUILD.parts };
  for (const category of CATEGORIES) {
    const option = input?.parts?.[category];
    if (typeof option === "number" && Number.isInteger(option) && option >= 0 && option < CATALOG[category].options.length) parts[category] = option;
  }
  return { parts, paint: PAINTS.some(p => p.color === input?.paint) ? input!.paint! : DEFAULT_BUILD.paint };
}
export function selectedParts(build: Build) {
  const valid = validateBuild(build);
  return new Set(CATEGORIES.flatMap(category => CATALOG[category].options[valid.parts[category]].parts));
}
export const CUSTOM_PARTS = new Set(CATEGORIES.flatMap(category => CATALOG[category].options.flatMap(option => option.parts)));
