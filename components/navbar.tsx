"use client";

import { useEffect, useState } from "react";

import { LiveClock } from "@/components/live-clock";
import { Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/about", label: "[ABOUT]" },
  { href: "/works", label: "[WORKS]" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isInHero, setIsInHero] = useState(true);
  const showHeroMenu = pathname === "/" && isInHero;

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const hero = document.getElementById("hero");

    if (!hero) return;

    const updateHeroState = () => {
      const { bottom } = hero.getBoundingClientRect();
      setIsInHero(bottom > 96);
    };

    updateHeroState();

    window.addEventListener("scroll", updateHeroState, { passive: true });
    window.addEventListener("resize", updateHeroState);

    return () => {
      window.removeEventListener("scroll", updateHeroState);
      window.removeEventListener("resize", updateHeroState);
    };
  }, [pathname]);

  return (
    <>
      {/* Structural navbar — transparent, no blend, handles layout/spacing */}
      <header className="sticky top-0 z-40 px-4 py-2 sm:px-5">
        <div className="mx-auto grid max-w-[1700px] grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Logo — sits in normal flow, no blend */}
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

          {/* Spacer cols to preserve layout */}
          <div className="hidden sm:block" />
          <div />
        </div>
      </header>

      {/* Separate fixed blend layer — blends against page content beneath */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 py-2 mix-blend-difference sm:px-5">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr]">
          {/* HAH text only (logo excluded) */}
          <div className="flex items-center justify-start">
            <div className="h-14 w-14 sm:h-20 sm:w-20" />
            {/* spacer matching logo size */}
            <Link
              href="/"
              aria-label="Go to top"
              className="text-splash-foreground pointer-events-auto font-heading text-[1.7rem] font-black uppercase leading-none tracking-[-0.06em] sm:text-[2.4rem]"
            >
              HAH.
            </Link>
          </div>

          <div className="text-splash-foreground hidden justify-self-center sm:block">
            <LiveClock />
          </div>

          {showHeroMenu ? (
            <button
              aria-label="Open menu"
              className="text-splash-foreground pointer-events-auto ml-auto flex flex-col gap-1.5 p-1 sm:gap-[5px]"
            >
              <span className="block h-[2px] w-5 bg-current sm:w-6" />
              <span className="block h-[2px] w-5 bg-current sm:w-6" />
              <span className="block h-[2px] w-5 bg-current sm:w-6" />
            </button>
          ) : (
            <nav
              aria-label="Primary"
              className="text-splash-foreground pointer-events-auto ml-auto flex items-center gap-4 text-[0.8rem] font-semibold uppercase tracking-[0.22em] sm:gap-6"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-opacity duration-200 hover:opacity-70"
                >
                  {link.label}
                </Link>
              ))}

              <a
                href="/cv/1Apr26ResumeHafiy.pdf"
                download
                aria-label="Download CV / Resume"
                className="flex items-center gap-1.5 transition-opacity duration-200 hover:opacity-70"
              >
                [CV / RESUME
                <Download className="h-3 w-3" strokeWidth={2.5} />]
              </a>
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
