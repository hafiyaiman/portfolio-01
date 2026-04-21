"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { JourneyCoinScene } from "@/components/journey/journey-coin-scene";
import { preloadFooterOrbitAssets } from "@/lib/footer-orbit-preload";

gsap.registerPlugin(ScrollTrigger);

interface SiteSplashRevealProps {
  children: ReactNode;
}

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
    if (typeof window === "undefined") {
      return;
    }

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    const scope = scopeRef.current;
    const content = contentRef.current;
    const overlay = overlayRef.current;
    const splashBody = splashBodyRef.current;
    const coinShell = coinShellRef.current;

    if (!scope || !content || !overlay || !splashBody || !coinShell) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const progressValue = { value: 0 };
    let introTimeline: gsap.core.Timeline | null = null;
    let revealTimeline: gsap.core.Timeline | null = null;
    let progressTween: gsap.core.Tween | null = null;
    let isDisposed = false;

    const ctx = gsap.context(() => {
      gsap.set(content, {
        opacity: 0,
        scale: reduceMotion ? 1 : 1.01,
        y: reduceMotion ? 0 : 12,
      });

      gsap.set(overlay, {
        opacity: 1,
        clipPath: "inset(0% 0% 0% 0%)",
      });
      gsap.set(coinShell, { scale: 0.8, opacity: 0 });
      setProgress(0);

      introTimeline = gsap.timeline();
      introTimeline.to(
        coinShell,
        {
          scale: 1,
          opacity: 1,
          duration: reduceMotion ? 0.5 : 1.1,
          ease: "power2.out",
        },
        0,
      );

      progressTween = gsap.to(progressValue, {
        value: reduceMotion ? 88 : 92,
        duration: reduceMotion ? 0.55 : 2.1,
        ease: "sine.inOut",
        onUpdate: () => {
          setProgress(Math.round(progressValue.value));
        },
      });

      Promise.all([
        introTimeline.then(),
        preloadFooterOrbitAssets({ timeoutMs: reduceMotion ? 1800 : 4200 }),
      ]).then(async () => {
        if (isDisposed) {
          return;
        }

        progressTween?.kill();

        await new Promise<void>((resolve) => {
          gsap.to(progressValue, {
            value: 100,
            duration: reduceMotion ? 0.28 : 0.55,
            ease: "sine.out",
            onUpdate: () => {
              setProgress(Math.round(progressValue.value));
            },
            onComplete: () => {
              setProgress(100);
              resolve();
            },
          });
        });

        if (isDisposed) {
          return;
        }

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, reduceMotion ? 120 : 260);
        });

        if (isDisposed) {
          return;
        }

        revealTimeline = gsap.timeline({
          onComplete: () => {
            gsap.set(content, {
              clearProps: "opacity,transform",
            });
            document.body.style.overflow = previousOverflow;
            setIsComplete(true);
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          },
        });

        revealTimeline
          .to(
            splashBody,
            {
              opacity: 0,
              scale: 0.97,
              duration: reduceMotion ? 0.22 : 0.65,
              ease: "sine.inOut",
            },
            reduceMotion ? 0.06 : 0.1,
          )
          .to(
            overlay,
            {
              clipPath: "inset(0% 0% 100% 0%)",
              duration: reduceMotion ? 0.34 : 1.1,
              ease: "power3.inOut",
            },
            reduceMotion ? 0.12 : 0.18,
          )
          .to(
            content,
            {
              opacity: 1,
              scale: 1,
              y: 0,
              duration: reduceMotion ? 0.3 : 0.65,
              ease: "sine.out",
            },
            "<22%",
          );
      });
    }, scope);

    return () => {
      isDisposed = true;
      introTimeline?.kill();
      revealTimeline?.kill();
      progressTween?.kill();
      document.body.style.overflow = previousOverflow;
      ctx.revert();
    };
  }, []);

  return (
    <div ref={scopeRef} className="bg-splash relative min-h-screen">
      <div ref={contentRef}>{children}</div>

      {!isComplete && (
        <div
          ref={overlayRef}
          className="bg-splash pointer-events-none fixed inset-0 z-[200] flex flex-col justify-between p-6 sm:p-12"
          aria-hidden="true"
        >
          <div ref={splashBodyRef} className="flex h-full w-full flex-col">
            <div className="h-12 flex-none" />

            <div className="flex flex-1 items-center justify-center">
              <div
                ref={coinShellRef}
                className="relative aspect-square w-full max-w-[14rem] sm:max-w-[16rem]"
              >
                <JourneyCoinScene progressSeed={progress / 100} />
              </div>
            </div>

            <div className="flex-none flex w-full items-end justify-between overflow-hidden">
              <div className="flex flex-col">
                <span className="text-splash-foreground/40 mb-1 text-[0.65rem] uppercase tracking-[0.2em]">
                  System Load
                </span>
                <p className="text-splash-foreground font-mono text-5xl font-light leading-none tabular-nums sm:text-7xl">
                  {progressLabel}
                  <span className="text-splash-foreground/30 text-3xl sm:text-5xl">
                    %
                  </span>
                </p>
              </div>

              <div className="flex flex-col items-end text-right">
                <div className="bg-splash-foreground/20 mb-3 h-[1px] w-12" />
                <p className="text-splash-foreground/70 text-[0.65rem] uppercase tracking-[0.4em] sm:text-xs">
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
