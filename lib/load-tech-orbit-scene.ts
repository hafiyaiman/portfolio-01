let techOrbitSceneModulePromise:
  | Promise<typeof import("@/components/decor/tech-orbit-scene")>
  | null = null;

export function loadTechOrbitSceneModule() {
  techOrbitSceneModulePromise ??= import("@/components/decor/tech-orbit-scene");

  return techOrbitSceneModulePromise;
}
