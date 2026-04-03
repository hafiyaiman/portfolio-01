"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useRef } from "react";

import { useHeroParallax } from "@/hooks/use-hero-parallax";
import { cn } from "@/lib/utils";

type ParallaxLayer = {
  depth: number;
  src: string;
  wrapperClassName: string; // handles position + size + visibility
};

const layers: ParallaxLayer[] = [
  {
    depth: 0.52,
    src: "/img/hero/paper01.svg",
    // hidden on mobile, appears mid-right on sm+
    wrapperClassName:
      "hidden sm:block sm:left-[52%] sm:top-[2%] sm:w-[8rem] lg:left-[57%] lg:top-[2%]",
  },
  {
    depth: 0.72,
    src: "/img/hero/paper02.svg",
    // hidden on mobile
    wrapperClassName:
      "hidden sm:block sm:left-[43%] sm:top-[10%] sm:w-[8rem] lg:left-[48%] lg:top-[12%]",
  },
  {
    depth: 0.72,
    src: "/img/hero/paper03.svg",
    // visible on mobile but shifted left so it doesn't clash with human
    wrapperClassName:
      "left-[2%] top-[30%] w-[4rem] sm:left-[35%] sm:top-[25%] sm:w-[8rem] lg:left-[39%] lg:top-[25%]",
  },
  {
    depth: 0.56,
    src: "/img/hero/paper04.svg",
    // hidden on mobile, show sm+
    wrapperClassName:
      "hidden sm:block sm:left-[34%] sm:top-[48%] sm:w-[5.5rem] md:left-[40%] md:top-[50%] md:w-[8.5rem]",
  },
  {
    depth: 0.24,
    src: "/img/hero/paper05.svg",
    // small on mobile, tucked top-right
    wrapperClassName:
      "right-[0%] top-[2%] w-[4rem] sm:right-[-2%] sm:top-[0%] sm:w-[8rem] lg:right-[-4%] lg:w-[11rem]",
  },
  {
    depth: 0.18,
    src: "/img/hero/paper06.svg",
    // small on mobile, mid-right
    wrapperClassName:
      "right-[0%] top-[38%] w-[5.5rem] sm:right-[-1%] sm:top-[40%] sm:w-[11rem] lg:w-[16rem]",
  },
];

export function HeroParallax() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const humanSceneRef = useRef<HTMLDivElement>(null);

  useHeroParallax({ sceneRef, humanSceneRef });

  return (
    <>
      <div
        ref={sceneRef}
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
        data-relative-input="true"
        data-selector="[data-depth]"
      >
        {layers.map((layer) => (
          <div
            key={layer.src}
            className={cn("absolute", layer.wrapperClassName)}
          >
            <div data-depth={layer.depth} className="w-full">
              <Image
                src={layer.src}
                alt=""
                width={500}
                height={500}
                className="h-auto w-full select-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div
        ref={humanSceneRef}
        aria-hidden="true"
        style={{ position: "absolute", zIndex: 20 }}
        data-relative-input="true"
        data-selector="[data-depth]"
        className={cn(
          "pointer-events-none",
          "right-[-90%] top-[10%] w-[180%]",
          "sm:right-[-60%] sm:top-[17%] sm:w-[110%]",
          "md:right-[-35%] md:top-[16%] md:w-[80%]",
          "lg:right-[-10%] lg:top-[6%] lg:w-[60%]",
        )}
      >
        <div data-depth="0.22" className="w-full">
          <Image
            src="/img/hero/human.svg"
            alt=""
            width={900}
            height={900}
            priority
            className="h-auto w-9/12 select-none"
          />
        </div>
      </div>
    </>
  );
}
