"use client";

import { FooterSection } from "@/components/footer/footer-section";
import { useFooterMorphReveal } from "@/hooks/use-footer-morph-reveal";
import { useEffect, useRef, useState } from "react";

function createClosedPath(pointCount: number) {
  const points = Array.from({ length: pointCount }, () => 100);
  let d = `M 0 ${points[0]} C`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const point = ((index + 1) / (points.length - 1)) * 100;
    const controlPoint = point - 100 / (points.length - 1) / 2;
    d += ` ${controlPoint} ${points[index]} ${controlPoint} ${
      points[index + 1]
    } ${point} ${points[index + 1]}`;
  }

  d += " V 0 H 0";

  return d;
}

const CLOSED_PATH = createClosedPath(9);

interface MorphFooterRevealProps {
  baseClassName?: string;
  morphPrimaryColor?: string;
  morphSecondaryColor?: string;
  morphStrokeColor?: string;
}

export function MorphFooterReveal({
  baseClassName = "bg-[#150503]",
  morphPrimaryColor = "#5d1305",
  morphSecondaryColor = "#d4521f",
  morphStrokeColor = "rgba(255,255,255,0.14)",
}: MorphFooterRevealProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
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

  useFooterMorphReveal({
    sectionRef,
    pathRefs,
    enabled: !useStaticLayout,
  });

  if (useStaticLayout) {
    return <FooterSection />;
  }

  return (
    <section
      ref={sectionRef}
      id="footer"
      className={`relative min-h-svh overflow-hidden text-white ${baseClassName}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_82%_24%,rgba(255,255,255,0.06),transparent_18%),linear-gradient(180deg,transparent_0%,transparent_28%,rgba(23,6,4,0.34)_48%,#090808_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />

      <div className="pointer-events-none absolute inset-x-0 -top-1 z-20 h-[24svh] min-h-[180px] overflow-hidden sm:h-[90svh]">
        <svg
          className="h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="footerMorphWarm"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={morphPrimaryColor} />
              <stop offset="100%" stopColor={morphPrimaryColor} />
            </linearGradient>
            <linearGradient
              id="footerMorphAccent"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={morphSecondaryColor} />
              <stop offset="100%" stopColor={morphSecondaryColor} />
            </linearGradient>
          </defs>

          <path
            ref={(node) => {
              pathRefs.current[0] = node;
            }}
            d={CLOSED_PATH}
            fill="url(#footerMorphWarm)"
            stroke={morphStrokeColor}
            strokeWidth="0.28"
          />
          <path
            ref={(node) => {
              pathRefs.current[1] = node;
            }}
            d={CLOSED_PATH}
            fill="url(#footerMorphAccent)"
            opacity="0.9"
            stroke={morphStrokeColor}
            strokeWidth="0.18"
          />
        </svg>
      </div>

      <div className="relative z-10 pt-24 sm:pt-28 bg-background">
        <FooterSection standalone={false} />
      </div>
    </section>
  );
}
