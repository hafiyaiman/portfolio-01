"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { JourneyCoinScene } from "@/components/journey/journey-coin-scene";

gsap.registerPlugin(ScrollTrigger);

interface SiteSplashRevealProps {
  children: ReactNode;
}

// Pads progress to '000', '045', '100' for a consistent typographic footprint
function formatProgress(value: number) {
  return `${String(value).padStart(3, "0")}`;
}

export function SiteSplashReveal({ children }: SiteSplashRevealProps) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const splashBodyRef = useRef<HTMLDivElement | null>(null);
  const coinShellRef = useRef<HTMLDivElement | null>(null);

  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const progressLabel = useMemo(() => formatProgress(progress), [progress]);

  useEffect(() => {
    const scope = scopeRef.current;
    const content = contentRef.current;
    const overlay = overlayRef.current;
    const splashBody = splashBodyRef.current;
    const coinShell = coinShellRef.current;

    if (!scope || !content || !overlay || !splashBody || !coinShell) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const progressValue = { value: 0 };

    const ctx = gsap.context(() => {
      // 1. Initial State Setup
      gsap.set(content, {
        opacity: 0,
        scale: reduceMotion ? 1 : 1.05,
        y: reduceMotion ? 0 : 40,
        clipPath: reduceMotion
          ? "inset(0% 0% 0% 0%)"
          : "inset(20% 10% 20% 10% round 24px)",
      });

      gsap.set(overlay, { clipPath: "inset(0% 0% 0% 0%)" });
      gsap.set(coinShell, { scale: 0.8, opacity: 0 });

      // 2. The Timeline
      const timeline = gsap.timeline({
        onComplete: () => {
          gsap.set(content, {
            clearProps: "opacity,transform,clipPath",
          });
          document.body.style.overflow = previousOverflow;
          setIsComplete(true);
          requestAnimationFrame(() => {
            ScrollTrigger.refresh();
          });
        },
      });

      // Fade in the coin gently
      timeline.to(
        coinShell,
        {
          scale: 1,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
        },
        0,
      );

      // Count up the progress
      timeline.to(
        progressValue,
        {
          value: 100,
          duration: reduceMotion ? 0.5 : 2.0,
          ease: "power2.inOut",
          onUpdate: () => setProgress(Math.round(progressValue.value)),
        },
        0,
      );

      // Fade out the splash body elements (Text, Coin)
      timeline.to(
        splashBody,
        {
          opacity: 0,
          scale: 0.95,
          duration: reduceMotion ? 0.2 : 0.6,
          ease: "power3.inOut",
        },
        reduceMotion ? 0.6 : 2.2,
      );

      // Cinematic Curtain Sweep for the Overlay
      timeline.to(
        overlay,
        {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: reduceMotion ? 0.3 : 1.2,
          ease: "expo.inOut",
        },
        reduceMotion ? 0.8 : 2.4,
      );

      // Reveal the main content beautifully
      timeline.to(
        content,
        {
          opacity: 1,
          scale: 1,
          y: 0,
          clipPath: "inset(0% 0% 0% 0% round 0px)",
          duration: reduceMotion ? 0.4 : 1.4,
          ease: "expo.inOut",
        },
        reduceMotion ? 0.8 : 2.4,
      );
    }, scope);

    return () => {
      document.body.style.overflow = previousOverflow;
      ctx.revert();
    };
  }, []);

  return (
    <div ref={scopeRef} className="relative bg-[#0a0a0a] min-h-screen">
      {/* Main Site Content */}
      <div ref={contentRef}>{children}</div>

      {/* Splash Screen Overlay */}
      {!isComplete && (
        <div
          ref={overlayRef}
          className="pointer-events-none fixed inset-0 z-[200] bg-[#0a0a0a] flex flex-col justify-between p-6 sm:p-12"
          aria-hidden="true"
        >
          <div ref={splashBodyRef} className="flex flex-col h-full w-full">
            {/* Top Region - Left Empty for Breathing Room */}
            <div className="flex-none h-12" />

            {/* Center Region - The Coin */}
            <div className="flex flex-1 items-center justify-center">
              <div
                ref={coinShellRef}
                className="relative w-full max-w-[14rem] sm:max-w-[16rem] aspect-square"
              >
                {/* Notice the removal of borders and backgrounds. We let the 3D scene speak for itself. */}
                <JourneyCoinScene progressSeed={progress / 100} />
              </div>
            </div>

            {/* Bottom Region - Typography */}
            <div className="flex-none flex items-end justify-between w-full overflow-hidden">
              {/* Progress Number */}
              <div className="flex flex-col">
                <span className="text-[0.65rem] uppercase tracking-[0.2em] text-white/40 mb-1">
                  System Load
                </span>
                <p className="font-mono text-5xl sm:text-7xl font-light tabular-nums text-white leading-none">
                  {progressLabel}
                  <span className="text-white/30 text-3xl sm:text-5xl">%</span>
                </p>
              </div>

              {/* Status Text */}
              <div className="flex flex-col items-end text-right">
                <div className="h-[1px] w-12 bg-white/20 mb-3" />
                <p className="text-[0.65rem] sm:text-xs uppercase tracking-[0.4em] text-white/70">
                  Loading
                  <br />
                  Portfolio
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
