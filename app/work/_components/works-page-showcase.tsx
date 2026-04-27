"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { worksData } from "@/data/works-data";
import {
  buildVisibleWheelSlots,
  type VisibleWheelSlot,
} from "@/app/work/_components/build-visible-wheel-slots";
import { WorksDetailsPanel } from "@/app/work/_components/works-details-panel";
import { WheelCard } from "@/app/work/_components/works-wheel-card";
import { useWheelRotation } from "@/app/work/_components/use-wheel-rotation";
import {
  getDesktopWheelLayout,
  getMobileWheelLayout,
} from "@/app/work/_components/works-wheel.constants";

const WHEEL_CARD_COUNT = 10;

export function WorksPageShowcase() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const desktopWheelRef = useRef<HTMLDivElement | null>(null);
  const mobileWheelRef = useRef<HTMLDivElement | null>(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1440);

  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);

    return () => {
      window.removeEventListener("resize", updateViewportWidth);
    };
  }, []);

  const desktopLayout = useMemo(
    () => getDesktopWheelLayout(viewportWidth),
    [viewportWidth],
  );
  const mobileLayout = useMemo(
    () => getMobileWheelLayout(viewportWidth),
    [viewportWidth],
  );
  const wheelItems = useMemo<VisibleWheelSlot[]>(
    () =>
      buildVisibleWheelSlots({
        items: worksData.items,
        slotCount: WHEEL_CARD_COUNT,
        activeProjectIndex,
        activeSlotIndex,
      }),
    [activeProjectIndex, activeSlotIndex],
  );

  useWheelRotation({
    sectionRef,
    desktopWheelRef,
    mobileWheelRef,
    onActiveProjectChange: setActiveProjectIndex,
    onActiveSlotChange: setActiveSlotIndex,
    projectCount: worksData.items.length,
    desktopOrbitRadius: desktopLayout.orbitRadius,
    mobileOrbitRadius: mobileLayout.orbitRadius,
  });

  const activeItem = worksData.items[activeProjectIndex] ?? worksData.items[0];

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[1200vh] overflow-x-clip bg-background text-brand"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="relative h-full w-full">
          <div
            className="absolute left-0 top-1/2 hidden -translate-y-1/2 overflow-hidden lg:block"
            style={{
              width: `${desktopLayout.visibleWidth}px`,
              height: `${desktopLayout.wheelSize}px`,
            }}
          >
            <div
              className="absolute left-0 top-1/2"
              style={{
                width: `${desktopLayout.wheelSize}px`,
                height: `${desktopLayout.wheelSize}px`,
                transform: `translate(-${desktopLayout.offsetX}px, -50%)`,
              }}
            >
              <div
                ref={desktopWheelRef}
                className="relative flex h-full w-full items-center justify-center will-change-transform"
              >
                {wheelItems.map(({ key, item, projectIndex, slotIndex }) => (
                  <WheelCard
                    key={key}
                    item={item}
                    projectIndex={projectIndex}
                    slotIndex={slotIndex}
                    activeSlotIndex={activeSlotIndex}
                    onSelect={(nextSlotIndex, nextProjectIndex) => {
                      setActiveSlotIndex(nextSlotIndex);
                      setActiveProjectIndex(nextProjectIndex);
                    }}
                    variant="desktop"
                    cardWidth={desktopLayout.cardWidth}
                  />
                ))}
              </div>
            </div>
          </div>

          <div
            className="relative z-10 flex h-full w-full items-start px-4 pb-6 pt-20 sm:px-5 sm:pt-24 lg:pr-10"
            style={{
              paddingLeft:
                viewportWidth >= 1024
                  ? `${desktopLayout.contentInset}px`
                  : undefined,
            }}
          >
            <div className="ml-auto w-full min-w-0 max-w-[1200px]">
              <WorksDetailsPanel
                activeIndex={activeProjectIndex}
                totalCount={worksData.items.length}
                activeItem={activeItem}
              />

              <div className="mt-10 lg:hidden">
                <div className="relative aspect-[1.8/1] overflow-hidden rounded-[1.8rem] border border-brand/10 bg-[#26272c]">
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2"
                    style={{
                      width: `${mobileLayout.wheelSize}px`,
                      height: `${mobileLayout.wheelSize}px`,
                      transform: "translate(-50%, 38%)",
                    }}
                  >
                    <div
                      ref={mobileWheelRef}
                      className="relative flex h-full w-full items-center justify-center will-change-transform"
                    >
                      {wheelItems.map(
                        ({ key, item, projectIndex, slotIndex }) => (
                          <WheelCard
                            key={`${key}-mobile`}
                            item={item}
                            projectIndex={projectIndex}
                            slotIndex={slotIndex}
                            activeSlotIndex={activeSlotIndex}
                            onSelect={(nextSlotIndex, nextProjectIndex) => {
                              setActiveSlotIndex(nextSlotIndex);
                              setActiveProjectIndex(nextProjectIndex);
                            }}
                            variant="mobile"
                            cardWidth={mobileLayout.cardWidth}
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
