"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const HOLD_DURATION = 0.28;
const REVEAL_DURATION = 0.26;
const PROJECTS_DURATION = 0.46;
const TOTAL_DURATION =
  HOLD_DURATION + REVEAL_DURATION + PROJECTS_DURATION;

interface UseWhatIDoMaskSequenceOptions {
  sectionRef: RefObject<HTMLElement | null>;
  pinRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  svgRef: RefObject<SVGSVGElement | null>;
  circleRef: RefObject<SVGCircleElement | null>;
  projectsRef: RefObject<HTMLDivElement | null>;
  onActiveIndexChange?: (index: number) => void;
}

export function useWhatIDoMaskSequence({
  sectionRef,
  pinRef,
  overlayRef,
  svgRef,
  circleRef,
  projectsRef,
  onActiveIndexChange,
}: UseWhatIDoMaskSequenceOptions) {
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const getScrollTargetRef = useRef<(index: number) => number | null>(
    () => null,
  );

  const scrollToProject = useCallback((index: number) => {
    const targetScroll = getScrollTargetRef.current(index);

    if (targetScroll == null) return;

    const scrollState = { value: window.scrollY };

    gsap.to(scrollState, {
      value: targetScroll,
      duration: 0.85,
      ease: "power3.inOut",
      overwrite: true,
      onUpdate: () => {
        window.scrollTo(0, scrollState.value);
      },
    });
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const overlay = overlayRef.current;
    const svg = svgRef.current;
    const circle = circleRef.current;
    const projects = projectsRef.current;

    if (!section || !pin || !overlay || !svg || !circle || !projects) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const setGeometry = () => {
      const rect = overlay.getBoundingClientRect();
      gsap.set(svg, {
        attr: { viewBox: `0 0 ${rect.width} ${rect.height}` },
      });
      gsap.set(circle, {
        attr: {
          cx: rect.width / 2,
          cy: rect.height / 2,
        },
      });
      return Math.hypot(rect.width, rect.height) * 1.05;
    };

    if (reduceMotion) {
      setGeometry();
      gsap.set(circle, {
        attr: { r: Math.hypot(window.innerWidth, window.innerHeight) * 1.05 },
      });
      gsap.set(projects, { y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      const getProjectsTravel = () =>
        Math.max(projects.scrollHeight - overlay.clientHeight + 180, 0);

      const getProjectTimelineProgress = (index: number) => {
        const articles = Array.from(
          projects.querySelectorAll<HTMLElement>("[data-showcase-item]"),
        );
        const article = articles[index];
        const travel = getProjectsTravel();

        if (!article) {
          return HOLD_DURATION + REVEAL_DURATION;
        }

        if (travel <= 0) {
          return HOLD_DURATION + REVEAL_DURATION;
        }

        const currentY = Number(gsap.getProperty(projects, "y")) || 0;
        const projectsRect = projects.getBoundingClientRect();
        const projectsTopWithoutTransform = projectsRect.top - currentY;
        const articleCenter =
          article.offsetTop + article.offsetHeight / 2;
        const viewportCenter = overlay.clientHeight / 2;
        const desiredY = viewportCenter - projectsTopWithoutTransform - articleCenter;
        const clampedY = gsap.utils.clamp(-travel, 0, desiredY);
        const projectProgress = Math.abs(clampedY) / travel;

        return (
          HOLD_DURATION +
          REVEAL_DURATION +
          PROJECTS_DURATION * projectProgress
        );
      };

      const updateActiveIndex = () => {
        if (!onActiveIndexChange) return;

        const articles = Array.from(
          projects.querySelectorAll<HTMLElement>("[data-showcase-item]"),
        );

        if (!articles.length) return;

        const overlayRect = overlay.getBoundingClientRect();
        const viewportCenter = overlayRect.top + overlayRect.height / 2;
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        articles.forEach((article, index) => {
          const rect = article.getBoundingClientRect();
          const articleCenter = rect.top + rect.height / 2;
          const distance = Math.abs(articleCenter - viewportCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        onActiveIndexChange(closestIndex);
      };

      getScrollTargetRef.current = (index: number) => {
        const trigger = triggerRef.current;

        if (!trigger) return null;

        const progress = getProjectTimelineProgress(index) / TOTAL_DURATION;
        return trigger.start + (trigger.end - trigger.start) * progress;
      };

      setGeometry();
      gsap.set(circle, { attr: { r: 0 } });
      gsap.set(projects, { y: 0, force3D: true });
      updateActiveIndex();

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=320%",
          pin,
          pinSpacing: true,
          scrub: 0.9,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            setGeometry();
            updateActiveIndex();
          },
        },
      });

      triggerRef.current = timeline.scrollTrigger ?? null;

      timeline
      .to({}, { duration: 0.28 })
      .to(circle, {
        attr: {
          r: () => setGeometry(),
        },
        ease: "none",
        duration: 0.26,
      })
      .to(projects, {
        y: () => -getProjectsTravel(),
        ease: "none",
        duration: 0.46,
        onUpdate: updateActiveIndex,
      });
    }, section);

    return () => {
      triggerRef.current = null;
      getScrollTargetRef.current = () => null;
      ctx.revert();
    };
  }, [
    circleRef,
    onActiveIndexChange,
    overlayRef,
    pinRef,
    projectsRef,
    sectionRef,
    svgRef,
  ]);

  return scrollToProject;
}
