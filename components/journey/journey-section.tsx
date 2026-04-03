"use client";

import { useRef, useState } from "react";

import { journeyData } from "@/data/journey-data";
import { useJourneySection } from "@/hooks/use-journey-section";
import { JourneyCoinScene } from "./journey-coin-scene";
import { JourneyTimeline } from "./journey-timeline";

export function JourneySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const coinStageRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useJourneySection({
    sectionRef,
    introRef,
    timelineRef,
    coinStageRef,
    markerRefs,
    cardRefs,
    setActiveIndex,
    setScrollProgress,
  });

  const activeMilestone = journeyData.milestones[activeIndex];

  return (
    <section
      ref={sectionRef}
      id="journey"
      className="relative overflow-hidden bg-[#f7f4ef] px-4 py-20 text-[#1d140f] sm:px-5 sm:py-32 lg:py-36"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(212,106,31,0.06),transparent_22%),linear-gradient(180deg,#f7f4ef_0%,#f4eee6_100%)]" />

      <div className="relative mx-auto max-w-[1500px]">
        <div
          ref={introRef}
          className="mb-14 max-w-[48rem] text-center sm:mb-18 lg:mb-24 lg:text-left"
        >
          <p
            data-journey-reveal
            className="text-sm uppercase tracking-[0.32em] text-[#8a6a58]"
          >
            {journeyData.eyebrow}
          </p>
          <h2
            data-journey-reveal
            className="mt-4 font-heading text-[2rem] font-black uppercase leading-[0.96] tracking-tight text-[#3a0b05] sm:text-[2.9rem] lg:text-[3.4rem]"
          >
            {journeyData.title}
          </h2>
          <p
            data-journey-reveal
            className="mt-6 text-base leading-8 text-[#3a0b05]/72 sm:text-lg"
          >
            {journeyData.intro}
          </p>
          <p
            data-journey-reveal
            className="mt-8 text-sm uppercase tracking-[0.18em] text-[#d46a1f]"
          >
            Active now: {activeMilestone.year}
          </p>
        </div>

        <div className="relative">
          <div
            ref={coinStageRef}
            className="pointer-events-none absolute left-0 top-0 z-20 aspect-square w-[132px] overflow-hidden border bg-[#f1ebe2] shadow-[0_10px_24px_rgba(0,0,0,0.05)] sm:w-[210px]"
          >
            <JourneyCoinScene progressSeed={scrollProgress} isActive />
          </div>

          <JourneyTimeline
            activeIndex={activeIndex}
            timelineRef={timelineRef}
            markerRefs={markerRefs}
            cardRefs={cardRefs}
          />
        </div>
      </div>
    </section>
  );
}
