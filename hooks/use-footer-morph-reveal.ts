"use client";

import { useEffect, type MutableRefObject, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const NUM_POINTS = 9;
const NUM_PATHS = 2;
const DELAY_POINTS_MAX = 0.22;
const DELAY_PER_PATH = 0.18;
const MORPH_DURATION = 0.9;
const INITIAL_COVERAGE = 100;

function buildPath(points: number[]) {
  let d = `M 0 ${points[0]} C`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const point = ((index + 1) / (points.length - 1)) * 100;
    const controlPoint = point - (100 / (points.length - 1)) / 2;
    d += ` ${controlPoint} ${points[index]} ${controlPoint} ${
      points[index + 1]
    } ${point} ${points[index + 1]}`;
  }

  d += " V 0 H 0";

  return d;
}

interface UseFooterMorphRevealOptions {
  sectionRef: RefObject<HTMLElement | null>;
  pathRefs: MutableRefObject<Array<SVGPathElement | null>>;
  enabled: boolean;
}

export function useFooterMorphReveal({
  sectionRef,
  pathRefs,
  enabled,
}: UseFooterMorphRevealOptions) {
  useEffect(() => {
    const section = sectionRef.current;
    const paths = pathRefs.current.filter(
      (path): path is SVGPathElement => path !== null,
    );

    if (!enabled || !section || paths.length !== NUM_PATHS) {
      return;
    }

    const allPoints = Array.from({ length: NUM_PATHS }, () =>
      Array.from({ length: NUM_POINTS }, () => 100),
    );
    const pointsDelay = Array.from({ length: NUM_POINTS }, () => 0);

    const render = () => {
      allPoints.forEach((points, index) => {
        paths[index]?.setAttribute("d", buildPath(points));
      });
    };

    const randomizeDelays = () => {
      pointsDelay.forEach((_, index) => {
        pointsDelay[index] = Math.random() * DELAY_POINTS_MAX;
      });
    };

    const setClosedState = () => {
      allPoints.forEach((points) => {
        points.forEach((_, index) => {
          points[index] = INITIAL_COVERAGE;
        });
      });

      render();
    };

    const ctx = gsap.context(() => {
      setClosedState();
      randomizeDelays();

      const timeline = gsap.timeline({
        defaults: {
          duration: MORPH_DURATION,
          ease: "power2.inOut",
        },
        onUpdate: render,
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "top 35%",
          scrub: 0.9,
          invalidateOnRefresh: true,
          onRefreshInit: () => {
            setClosedState();
            randomizeDelays();
          },
        },
      });

      allPoints.forEach((points, pathIndex) => {
        const pathDelay = DELAY_PER_PATH * pathIndex;

        points.forEach((_, pointIndex) => {
          timeline.to(
            points,
            { [pointIndex]: 0 },
            pointsDelay[pointIndex] + pathDelay,
          );
        });
      });
    }, section);

    return () => {
      ctx.revert();
    };
  }, [enabled, pathRefs, sectionRef]);
}
