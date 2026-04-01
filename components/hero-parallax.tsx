"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

type ParallaxLayer = {
  depth: number;
  src: string;
  // Fixed anchor for the layer. Keep this on a wrapper element because
  // parallax-js resets the managed layer's `left` and `top` styles on mount.
  anchorStyle: CSSProperties;
  imageClassName: string;
};

const layers: ParallaxLayer[] = [
  {
    depth: 0.52,
    src: "/img/hero/paper01.svg",
    anchorStyle: { left: "57%", top: "2%", width: "8rem" },
    imageClassName: "",
  },
  {
    depth: 0.72,
    src: "/img/hero/paper02.svg",
    anchorStyle: { left: "48%", top: "12%", width: "8rem" },
    imageClassName: "",
  },
  {
    depth: 0.72,
    src: "/img/hero/paper03.svg",
    anchorStyle: { left: "39%", top: "25%", width: "8rem" },
    imageClassName: "",
  },
  {
    depth: 0.56,
    src: "/img/hero/paper04.svg",
    anchorStyle: { left: "40%", top: "50%", width: "8.5rem" },
    imageClassName: "",
  },
  {
    depth: 0.24,
    src: "/img/hero/paper05.svg",
    anchorStyle: { right: "4%", top: "0%", width: "11rem" },
    imageClassName: "",
  },
  {
    depth: 0.18,
    src: "/img/hero/paper06.svg",
    anchorStyle: { right: "-1%", top: "40%", width: "16rem" },
    imageClassName: "",
  },
];

export function HeroParallax() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const humanSceneRef = useRef<HTMLDivElement>(null);

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
  }, []);

  return (
    <>
      <div
        ref={sceneRef}
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
        data-relative-input="true"
        data-selector="[data-depth]"
      >
        {/* Papers: outer wrapper owns the fixed anchor, inner layer gets parallax transforms. */}
        {layers.map((layer) => (
          <div
            key={layer.src}
            style={{ position: "absolute", ...layer.anchorStyle }}
          >
            <div data-depth={layer.depth} className="w-full">
              <Image
                src={layer.src}
                alt=""
                width={500}
                height={500}
                className={`h-auto w-full select-none ${layer.imageClassName}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        ref={humanSceneRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "-3%",
          top: "5%",
          width: "55%",
          zIndex: 20,
        }}
        data-relative-input="true"
        data-selector="[data-depth]"
        className="pointer-events-none sm:right-[1%] sm:top-[4%] sm:w-[54%] md:right-[3%] md:top-[3%] md:w-[44%] lg:right-[6%] lg:top-[2%] lg:w-[37%]"
      >
        <div data-depth="0.22" className="w-full">
          <Image
            src="/img/hero/human.svg"
            alt=""
            width={900}
            height={900}
            priority
            className="h-auto w-full select-none"
          />
        </div>
      </div>
    </>
  );
}
