"use client";

import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface UseJourneySectionOptions {
  sectionRef: RefObject<HTMLElement | null>;
  introRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  railRef: RefObject<HTMLDivElement | null>;
  panelRefs: MutableRefObject<Array<HTMLElement | null>>;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  setScrollProgress: Dispatch<SetStateAction<number>>;
}

export function useJourneySection({
  sectionRef,
  introRef,
  stageRef,
  railRef,
  panelRefs,
  setActiveIndex,
  setScrollProgress,
}: UseJourneySectionOptions) {
  useEffect(() => {
    const section = sectionRef.current;
    const intro = introRef.current;
    const stage = stageRef.current;
    const rail = railRef.current;
    const panels = panelRefs.current.filter(
      (panel): panel is HTMLElement => panel !== null,
    );

    if (!section || !intro || !stage || !rail || !panels.length) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      const introItems =
        intro.querySelectorAll<HTMLElement>("[data-journey-reveal]");

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

      if (reduceMotion) {
        setActiveIndex(0);
        setScrollProgress(0);
        gsap.set(rail, { x: 0 });
        return;
      }

      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        const getTravel = () =>
          Math.max(rail.scrollWidth - stage.clientWidth, 0);

        const updateActiveFromRail = () => {
          const stageRect = stage.getBoundingClientRect();
          const stageCenter = stageRect.left + stageRect.width * 0.68;
          let closestIndex = 0;
          let closestDistance = Number.POSITIVE_INFINITY;

          panels.forEach((panel, index) => {
            const rect = panel.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const distance = Math.abs(center - stageCenter);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = index;
            }
          });

          setActiveIndex(closestIndex);
        };

        panels.forEach((panel, index) => {
          gsap.fromTo(
            panel,
            { y: 36, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: "power3.out",
              delay: Math.min(index * 0.04, 0.18),
            },
          );
        });

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: () => `+=${getTravel() + window.innerWidth * 0.75}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              setScrollProgress(self.progress);
              updateActiveFromRail();
            },
            onRefresh: () => {
              setScrollProgress(0);
              updateActiveFromRail();
            },
          },
        });

        timeline.to(rail, {
          x: () => -getTravel(),
          ease: "none",
          duration: 1,
        });
      });

      mm.add("(max-width: 1023px)", () => {
        const updateActiveVertical = () => {
          const viewportCenter = window.innerHeight / 2;
          let closestIndex = 0;
          let closestDistance = Number.POSITIVE_INFINITY;

          panels.forEach((panel, index) => {
            const rect = panel.getBoundingClientRect();
            const center = rect.top + rect.height / 2;
            const distance = Math.abs(center - viewportCenter);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = index;
            }
          });

          setActiveIndex(closestIndex);
        };

        panels.forEach((panel, index) => {
          gsap.fromTo(
            panel,
            { y: 28, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.75,
              ease: "power3.out",
              scrollTrigger: {
                trigger: panel,
                start: "top 88%",
                once: true,
              },
            },
          );

          ScrollTrigger.create({
            trigger: panel,
            start: "top center",
            end: "bottom center",
            onEnter: () => {
              setActiveIndex(index);
            },
            onEnterBack: () => {
              setActiveIndex(index);
            },
          });
        });

        ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            setScrollProgress(self.progress);
            updateActiveVertical();
          },
          onRefresh: () => {
            setScrollProgress(0);
            updateActiveVertical();
          },
        });
      });

      return () => {
        mm.revert();
      };
    }, section);

    return () => {
      ctx.revert();
    };
  }, [
    introRef,
    panelRefs,
    railRef,
    sectionRef,
    setActiveIndex,
    setScrollProgress,
    stageRef,
  ]);
}
