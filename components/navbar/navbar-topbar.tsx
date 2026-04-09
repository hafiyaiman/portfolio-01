"use client";

import { gsap } from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { LiveClock } from "@/components/live-clock";

interface NavbarTopbarProps {
  isMenuOpen: boolean;
  showHeroMenu: boolean;
  onToggleMenu: () => void;
}

export function NavbarTopbar({
  isMenuOpen,
  showHeroMenu,
  onToggleMenu,
}: NavbarTopbarProps) {
  const topLineRef = useRef<HTMLSpanElement>(null);
  const bottomLineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const topLine = topLineRef.current;
    const bottomLine = bottomLineRef.current;

    if (!topLine || !bottomLine) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.killTweensOf([topLine, bottomLine]);

      if (isMenuOpen) {
        gsap.to(topLine, {
          y: 3,
          rotation: 45,
          duration: 0.34,
          ease: "power3.out",
          overwrite: "auto",
        });

        gsap.to(bottomLine, {
          y: -3,
          rotation: -45,
          duration: 0.34,
          ease: "power3.out",
          overwrite: "auto",
        });

        return;
      }

      gsap.to(topLine, {
        y: 0,
        rotation: 0,
        duration: 0.3,
        ease: "power3.out",
        overwrite: "auto",
      });

      gsap.to(bottomLine, {
        y: 0,
        rotation: 0,
        duration: 0.3,
        ease: "power3.out",
        overwrite: "auto",
      });
    });

    return () => {
      ctx.revert();
    };
  }, [isMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 px-4 py-2 sm:px-5">
        <div className="mx-auto grid max-w-[1700px] grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center justify-start">
            <div className="h-14 w-14 overflow-hidden sm:h-20 sm:w-20">
              <Image
                src="/img/logo/logohafiymini.png"
                alt="HAH avatar"
                width={150}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="hidden sm:block" />
          <div />
        </div>
      </header>

      <div
        className={`pointer-events-none fixed inset-x-0 top-0 z-[90] px-4 py-2 sm:px-5 ${
          isMenuOpen ? "" : "mix-blend-difference"
        }`}
      >
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center justify-start">
            <div className="h-14 w-14 sm:h-20 sm:w-20" />
            <Link
              href="/"
              aria-label="Go to top"
              className="pointer-events-auto font-heading text-[1.7rem] font-black uppercase leading-none tracking-[-0.06em] text-splash-foreground sm:text-[2.4rem]"
            >
              HAH.
            </Link>
          </div>

          <div className="hidden justify-self-center text-splash-foreground sm:block">
            <LiveClock />
          </div>

          <div className="pointer-events-auto ml-auto flex justify-end">
            <button
              type="button"
              onClick={onToggleMenu}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              className={`group relative inline-flex size-11 items-center justify-center rounded-full border transition-[transform,border-color,background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03] sm:size-12 ${
                isMenuOpen
                  ? "border-white/18 bg-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
                  : showHeroMenu
                    ? "border-white/70 bg-white/8 text-splash-foreground hover:bg-white/14"
                    : "border-current/40 bg-transparent text-splash-foreground hover:bg-white/10"
              }`}
            >
              <span className="relative block h-4 w-5">
                <span
                  ref={topLineRef}
                  className="absolute left-0 top-[4px] block h-[2px] w-5 rounded-full bg-current will-change-transform"
                />
                <span
                  ref={bottomLineRef}
                  className="absolute left-0 top-[10px] block h-[2px] w-5 rounded-full bg-current will-change-transform"
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
