"use client";

import { useEffect, type RefObject } from "react";

interface UseHeroParallaxOptions {
  sceneRef: RefObject<HTMLDivElement | null>;
  humanSceneRef: RefObject<HTMLDivElement | null>;
}

export function useHeroParallax({
  sceneRef,
  humanSceneRef,
}: UseHeroParallaxOptions) {
  useEffect(() => {
    const scene = sceneRef.current;
    const humanScene = humanSceneRef.current;

    if (!scene || !humanScene) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let instance: { destroy: () => void } | null = null;
    let humanInstance: { destroy: () => void } | null = null;

    void import("parallax-js").then((module) => {
      const Parallax = module.default ?? module;

      instance = new Parallax(scene, {
        relativeInput: true,
        hoverOnly: true,
        clipRelativeInput: true,
        scalarX: 10,
        scalarY: 10,
        frictionX: 0.12,
        frictionY: 0.12,
      });

      humanInstance = new Parallax(humanScene, {
        relativeInput: true,
        hoverOnly: true,
        clipRelativeInput: true,
        scalarX: 6,
        scalarY: 6,
        frictionX: 0.1,
        frictionY: 0.1,
      });
    });

    return () => {
      instance?.destroy();
      humanInstance?.destroy();
    };
  }, [humanSceneRef, sceneRef]);
}
