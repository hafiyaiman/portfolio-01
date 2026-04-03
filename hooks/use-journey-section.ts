"use client";

import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import { Flip } from "gsap/Flip";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(Flip, ScrollTrigger);

interface UseJourneySectionOptions {
  sectionRef: RefObject<HTMLElement | null>;
  introRef: RefObject<HTMLDivElement | null>;
  timelineRef: RefObject<HTMLDivElement | null>;
  coinStageRef: RefObject<HTMLDivElement | null>;
  markerRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  cardRefs: MutableRefObject<Array<HTMLElement | null>>;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  setScrollProgress: Dispatch<SetStateAction<number>>;
}

export function useJourneySection({
  sectionRef,
  introRef,
  timelineRef,
  coinStageRef,
  markerRefs,
  cardRefs,
  setActiveIndex,
  setScrollProgress,
}: UseJourneySectionOptions) {
  useEffect(() => {
    const section = sectionRef.current;
    const intro = introRef.current;
    const timeline = timelineRef.current;
    const coinStage = coinStageRef.current;
    const markers = markerRefs.current.filter(
      (marker): marker is HTMLDivElement => marker !== null,
    );
    const cards = cardRefs.current.filter(
      (card): card is HTMLElement => card !== null,
    );

    if (!section || !intro || !timeline || !coinStage || !markers.length || !cards.length) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      const introItems =
        intro.querySelectorAll<HTMLElement>("[data-journey-reveal]");

      const fitToMarker = (marker: HTMLDivElement) => {
        const state = Flip.getState(marker);
        const tween = Flip.fit(coinStage, state, {
          duration: 1,
          ease: "none",
        }) as gsap.core.Tween | null;

        return tween;
      };

      const syncActiveIndex = () => {
        const viewportCenter = window.innerHeight / 2;
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        cards.forEach((card, index) => {
          const rect = card.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const distance = Math.abs(center - viewportCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        setActiveIndex(closestIndex);
      };

      if (reduceMotion) {
        fitToMarker(markers[0]);
        setActiveIndex(0);
        setScrollProgress(0);
        return;
      }

      gsap.fromTo(
        introItems,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: section,
            start: "top 76%",
            once: true,
          },
        },
      );

      cards.forEach((card, index) => {
        const offset = index % 2 === 0 ? -28 : 28;

        gsap.fromTo(
          card,
          { y: 40, x: offset, opacity: 0 },
          {
            y: 0,
            x: 0,
            opacity: 1,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 84%",
              once: true,
            },
          },
        );
      });

      fitToMarker(markers[0]);

      const travelTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: timeline,
          start: "top center",
          end: "bottom center",
          scrub: 1.1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            setScrollProgress(self.progress);
            syncActiveIndex();
          },
          onRefresh: () => {
            fitToMarker(markers[0]);
            syncActiveIndex();
          },
        },
      });

      markers.slice(1).forEach((marker) => {
        const tween = fitToMarker(marker);

        if (tween) {
          travelTimeline.add(tween);
          travelTimeline.to(
            {},
            { duration: 0.18, ease: "none" },
            ">",
          );
        }
      });

      syncActiveIndex();
    }, section);

    return () => {
      ctx.revert();
    };
  }, [
    cardRefs,
    coinStageRef,
    introRef,
    markerRefs,
    sectionRef,
    setActiveIndex,
    setScrollProgress,
    timelineRef,
  ]);
}
