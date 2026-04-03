"use client";

import { useRef, useState } from "react";

import { journeyData } from "@/data/journey-data";
import { useJourneySection } from "@/hooks/use-journey-section";
import { JourneyCoinScene } from "./journey-coin-scene";
import { JourneyTimeline } from "./journey-timeline";

export function JourneySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useJourneySection({
    sectionRef,
    introRef,
    stageRef,
    railRef,
    panelRefs,
    setActiveIndex,
    setScrollProgress,
  });

  return (
    <section
      ref={sectionRef}
      id="journey"
      className="relative overflow-hidden bg-[#f7f4ef] px-4 py-20 text-[#1d140f] sm:px-5 sm:py-28 lg:py-36"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(212,106,31,0.06),transparent_18%),linear-gradient(180deg,#f7f4ef_0%,#f4eee6_100%)]" />

      <div className="relative mx-auto max-w-[1700px]">
        <div
          ref={introRef}
          className="mb-12 w-full text-center sm:mb-16 lg:mb-20 lg:text-left"
        >
          <p
            data-journey-reveal
            className="text-sm uppercase tracking-[0.32em] text-[#8a6a58]"
          >
            {journeyData.eyebrow}
          </p>
          <h2
            data-journey-reveal
            className="mt-4 w-full font-heading text-[2rem] font-black uppercase leading-[0.94] tracking-tight text-[#3a0b05] sm:text-[2.9rem] lg:text-[3.6rem]"
          >
            {journeyData.title}
          </h2>
          <p
            data-journey-reveal
            className="mt-6 w-full text-base leading-8 text-[#3a0b05]/72 sm:text-lg"
          >
            {journeyData.intro}
          </p>
        </div>

        <div
          ref={stageRef}
          className="relative grid gap-10 lg:min-h-screen lg:grid-cols-[minmax(220px,0.36fr)_minmax(0,1fr)] lg:items-start lg:gap-12"
        >
          <div className="lg:sticky lg:top-16">
            <div className="relative mx-auto aspect-square w-full max-w-[14rem] sm:max-w-[16rem] lg:max-w-[17rem]">
              <div className="absolute inset-0 rounded-[1.75rem] border border-[#3a0b05]/10 bg-white/45 backdrop-blur-[2px]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(58,11,5,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(58,11,5,0.025)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
              <JourneyCoinScene progressSeed={scrollProgress} />
            </div>
          </div>

          <div className="overflow-hidden lg:overflow-visible">
            <JourneyTimeline
              railRef={railRef}
              panelRefs={panelRefs}
              activeIndex={activeIndex}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
