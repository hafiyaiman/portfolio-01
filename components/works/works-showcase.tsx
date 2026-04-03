"use client";

import { worksData } from "@/data/works-data";
import { gsap } from "gsap";
import { useEffect, useRef, type RefObject } from "react";

interface WorksShowcaseProps {
  projectsRef?: RefObject<HTMLDivElement | null>;
  activeIndex?: number;
  onIndicatorClick?: (index: number) => void;
}

export function WorksShowcase({
  projectsRef,
  activeIndex = 0,
  onIndicatorClick,
}: WorksShowcaseProps) {
  const indicatorSquareRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasAnimatedIndicatorRef = useRef(false);
  const indicatorRotationRef = useRef(0);

  useEffect(() => {
    const square = indicatorSquareRef.current;
    const activeItem = itemRefs.current[activeIndex];

    if (!square || !activeItem) return;

    const top = activeItem.offsetTop + activeItem.offsetHeight / 2 - 8;

    if (!hasAnimatedIndicatorRef.current) {
      gsap.set(square, {
        y: top,
        rotate: indicatorRotationRef.current,
      });
      hasAnimatedIndicatorRef.current = true;
      return;
    }

    indicatorRotationRef.current += 90;

    gsap.killTweensOf(square);
    gsap.to(square, {
      y: top,
      rotate: indicatorRotationRef.current,
      scale: 1.08,
      duration: 0.56,
      ease: "power3.out",
      overwrite: true,
      onComplete: () => {
        gsap.to(square, {
          scale: 1,
          duration: 0.18,
          ease: "power2.out",
          overwrite: true,
        });
      },
    });
  }, [activeIndex]);

  return (
    <div className="relative isolate mx-auto max-w-[1700px] pt-10 sm:pt-16 lg:pt-24">
      <div className="pointer-events-none absolute left-0 top-0 z-40 sm:top-5">
        <h2 className="font-heading text-[2.6rem] font-black uppercase leading-[0.82] tracking-[-0.04em] text-white mix-blend-difference sm:text-[5.2rem] lg:text-[6.9rem]">
          {worksData.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>
      </div>

      <div className="grid gap-8 pt-28 sm:pt-40 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10 lg:pt-0">
        <div className="flex flex-col gap-8 pt-16 sm:pt-32 lg:sticky lg:top-12 lg:max-h-[calc(100vh-14rem)] lg:justify-between">
          <div>
            <p className="max-w-[18rem] text-base leading-[1.3] text-white sm:max-w-[14rem] sm:text-lg sm:leading-[1.15]">
              {worksData.description}
            </p>
          </div>

          <div className="relative flex max-w-full flex-row gap-3 self-start overflow-x-auto pb-2 lg:mt-10 lg:flex-col lg:overflow-visible lg:pb-0">
            <div
              ref={indicatorSquareRef}
              className="pointer-events-none absolute left-[6.5rem] top-0 z-20 hidden size-4 border border-[#d46a1f] bg-[#d46a1f] shadow-[0_0_0_6px_rgba(212,82,31,0.14)] lg:block"
              style={{ willChange: "transform" }}
            />
            {worksData.items.map((item, index) => (
              <button
                type="button"
                key={item.id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                onClick={() => onIndicatorClick?.(index)}
                className="group flex min-w-fit items-center gap-3 text-left transition-all duration-300 focus-visible:outline-none lg:min-w-0"
                style={{
                  opacity: index === activeIndex ? 1 : 0.58,
                  transform:
                    index === activeIndex
                      ? "translateX(0)"
                      : "translateX(-4px)",
                }}
                aria-label={`Show project ${item.title}`}
                aria-pressed={index === activeIndex}
              >
                <div
                  className="relative aspect-video w-20 overflow-hidden border border-white/10 bg-[#c9c9c9] transition-all duration-300 sm:w-24"
                  style={{
                    backgroundImage:
                      index === 2
                        ? "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06))"
                        : `linear-gradient(135deg, ${item.accent}66, rgba(255,255,255,0.08))`,
                    transform:
                      index === activeIndex ? "scale(1.04)" : "scale(0.96)",
                    boxShadow:
                      index === activeIndex
                        ? "0 0 0 1px rgba(212,82,31,0.55), 0 12px 24px rgba(0,0,0,0.24)"
                        : "none",
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-300"
                    style={{
                      width: index === activeIndex ? "4px" : "0px",
                      backgroundColor: "#d46a1f",
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="size-2 shrink-0 border transition-all duration-300"
                    style={{
                      backgroundColor: "transparent",
                      borderColor:
                        index === activeIndex ? "transparent" : "#ffffff55",
                      transform:
                        index === activeIndex ? "scale(0.7)" : "scale(1)",
                      opacity: index === activeIndex ? 0 : 1,
                    }}
                  />
                  <div
                    className="h-px transition-all duration-300"
                    style={{
                      width: index === activeIndex ? "22px" : "10px",
                      backgroundColor:
                        index === activeIndex ? "#d46a1f" : "#ffffff33",
                    }}
                  />
                </div>
              </button>
            ))}

            <div className="mt-4 inline-flex w-fit shrink-0 items-center">
              <button className="bg-[#d4521f] px-4 py-3 text-sm font-semibold text-white">
                {worksData.ctaLabel}
              </button>
              <button
                aria-label="View all works"
                className="border-l border-white/20 bg-[#d4521f] px-3 py-3 text-sm font-semibold text-white"
              >
                ↗
              </button>
            </div>
          </div>
        </div>

        <div
          ref={projectsRef}
          className="flex flex-col gap-10 will-change-transform lg:gap-14"
        >
          {worksData.items.map((item, index) => (
            <article key={item.id} data-showcase-item className="w-full">
              <div
                className="relative aspect-video overflow-hidden border border-white/10 bg-[#111111]"
                style={{
                  backgroundImage: `radial-gradient(circle at 18% 22%, ${item.accent}33, transparent 22%), linear-gradient(135deg, #202020 0%, #0b0b0b 100%)`,
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 sm:p-7">
                  <span className="border border-white/15 bg-white/5 px-3 py-1 text-[0.65rem] uppercase tracking-[0.24em] text-white/80">
                    Placeholder 16:9
                  </span>
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: item.accent }}
                  />
                </div>
                {index === 0 ? (
                  <>
                    <div className="absolute left-[12%] top-[10%] hidden aspect-video w-20 border border-white/20 bg-white/20 md:block" />
                    <div className="absolute bottom-[18%] right-[0.5%] hidden aspect-video w-28 border border-white/20 bg-white/20 md:block" />
                  </>
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
                  <h3 className="max-w-3xl text-2xl font-bold leading-[0.95] text-white sm:text-5xl lg:text-6xl">
                    {item.subtitle}
                  </h3>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 text-white sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                  <h4 className="text-xl font-semibold sm:text-2xl">{item.title}</h4>
                </div>
                <p className="text-sm text-white/80 sm:pt-1">
                  [{item.stack.join("] [")}]
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
