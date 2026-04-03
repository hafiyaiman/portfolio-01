"use client";

import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface UseWorksActiveIndexOptions {
  sectionRef: RefObject<HTMLElement | null>;
  onIndexChange: (index: number) => void;
}

export function useWorksActiveIndex({
  sectionRef,
  onIndexChange,
}: UseWorksActiveIndexOptions) {
  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-work-card]");

      cards.forEach((card, index) => {
        ScrollTrigger.create({
          trigger: card,
          start: "top center+=120",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) {
              onIndexChange(index);
            }
          },
        });
      });
    }, section);

    return () => {
      ctx.revert();
    };
  }, [onIndexChange, sectionRef]);
}
