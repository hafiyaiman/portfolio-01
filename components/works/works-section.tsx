"use client";

import { useRef, useState } from "react";

import { worksData } from "@/data/works-data";
import { useWorksActiveIndex } from "@/hooks/use-works-active-index";
import { WorkCard } from "./work-card";
import { WorksIndicator } from "./works-indicator";

export function WorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const continuedItems = worksData.items.slice(1);

  useWorksActiveIndex({
    sectionRef,
    onIndexChange: setActiveIndex,
  });

  return (
    <section
      ref={sectionRef}
      id="works"
      className="relative z-10 min-h-svh bg-[#4b0600]"
    >
      <div className="min-h-svh px-5 pb-20 pt-10 lg:pb-28 lg:pt-12">
        <div className="mx-auto grid max-w-[1700px] gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
          <div className="flex flex-col justify-between lg:sticky lg:top-28 lg:h-[calc(100vh-9rem)]">
            <div>
              <p className="mb-4 text-xs uppercase tracking-[0.28em] text-white/55">
                Selected Works
              </p>
              <p className="max-w-xs text-lg leading-[1.2] text-white">
                A small collection of projects built with equal care for
                function, motion, and visual clarity.
              </p>
            </div>

            <div className="hidden lg:block">
              <WorksIndicator
                items={continuedItems}
                activeIndex={activeIndex}
                ctaLabel={worksData.ctaLabel}
              />
            </div>
          </div>

          <div className="flex flex-col gap-14 lg:gap-20">
            {continuedItems.map((item) => (
              <div key={item.id} data-work-card>
                <WorkCard item={item} />
              </div>
            ))}

            <div className="flex justify-start lg:hidden">
              <div className="inline-flex w-fit items-center">
                <button
                  disabled
                  className="bg-brand-accent text-brand-foreground px-4 py-3 text-sm font-semibold"
                >
                  {worksData.ctaLabel}
                </button>
                <button
                  disabled
                  aria-label="View all works"
                  className="bg-brand-accent text-brand-foreground border-l border-white/20 px-3 py-3 text-sm font-semibold"
                >
                  {"\u2197"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
