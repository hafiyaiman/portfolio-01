"use client";

import { useEffect, useRef, useState } from "react";

import { WorksSection } from "@/components/works/works-section";
import { WorksShowcase } from "@/components/works/works-showcase";
import { useWhatIDoMaskSequence } from "@/hooks/use-what-i-do-mask-sequence";
import { WhatIDoSection } from "./what-i-do-section";
import { WhatIDoIntro } from "./what-i-do-intro";
import { WhatIDoList } from "./what-i-do-list";
import { whatIDoData } from "@/data/what-i-do-data";

export function WhatIDoMaskSequence() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [useStaticLayout, setUseStaticLayout] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce), (max-width: 1023px)",
    );
    const updatePreference = () => {
      setUseStaticLayout(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  const handleProjectSelect = useWhatIDoMaskSequence({
    sectionRef,
    pinRef,
    overlayRef,
    svgRef,
    circleRef,
    projectsRef,
    onActiveIndexChange: setActiveIndex,
  });

  if (useStaticLayout) {
    return (
      <>
        <WhatIDoSection />
        <WorksSection />
      </>
    );
  }

  return (
    <section ref={sectionRef} id="what-i-do" className="relative">
      <div
        ref={pinRef}
        className="bg-background relative h-screen overflow-hidden px-4 sm:px-5"
      >
        <div className="mx-auto grid h-full max-w-[1700px] content-center gap-8 pt-20 sm:items-center sm:gap-12 sm:pt-0 lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-10">
          <WhatIDoIntro
            eyebrow={whatIDoData.eyebrow}
            description={whatIDoData.description}
            ctaLabel={whatIDoData.ctaLabel}
            ctaHref={whatIDoData.ctaHref}
          />
          <WhatIDoList items={whatIDoData.items} />
        </div>

        <div
          ref={overlayRef}
          className="absolute inset-0 z-20"
        >
          <svg
            ref={svgRef}
            className="h-full w-full"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
          >
            <defs>
              <mask id="whatido-works-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="black" />
                <circle ref={circleRef} cx="50%" cy="50%" r="0" fill="white" />
              </mask>
            </defs>

            <foreignObject
              x="0"
              y="0"
              width="100%"
              height="120%"
              mask="url(#whatido-works-mask)"
            >
              <div
                // xmlns="http://www.w3.org/1999/xhtml"
                className="bg-brand h-full w-full overflow-hidden"
              >
                <div className="h-full px-4 py-14 sm:px-5 lg:py-18">
                  <WorksShowcase
                    projectsRef={projectsRef}
                    activeIndex={activeIndex}
                    onIndicatorClick={handleProjectSelect}
                  />
                </div>
              </div>
            </foreignObject>
          </svg>
        </div>
      </div>
    </section>
  );
}
