"use client";

import { Download } from "lucide-react";

import { footerData } from "@/data/footer-data";

import { primaryMenuLinks } from "./menu-data";
import { NavbarMenuLink } from "./navbar-menu-link";

interface NavbarOverlayProps {
  pathname: string;
  currentYear: number;
  isMenuOpen: boolean;
  prefersReducedMotion: boolean;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  swipeLayerRef: React.RefObject<HTMLDivElement | null>;
  swipePathRef: React.RefObject<SVGPathElement | null>;
  setMenuItemRef: (index: number, node: HTMLAnchorElement | null) => void;
  setMetaRef: (index: number, node: HTMLElement | null) => void;
  onClose: () => void;
}

export function NavbarOverlay({
  pathname,
  currentYear,
  isMenuOpen,
  prefersReducedMotion,
  overlayRef,
  panelRef,
  swipeLayerRef,
  swipePathRef,
  setMenuItemRef,
  setMetaRef,
  onClose,
}: NavbarOverlayProps) {
  return (
    <div
      ref={overlayRef}
      className="pointer-events-none fixed inset-0 z-[70] opacity-0"
      aria-hidden={!isMenuOpen}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={swipeLayerRef}
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-0"
        aria-hidden="true"
      >
        <svg
          className="h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="navbarCurveSwipeFill"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor="color-mix(in oklab, var(--brand) 92%, black 8%)"
              />
              <stop offset="100%" stopColor="#090707" />
            </linearGradient>
          </defs>
          <path
            ref={swipePathRef}
            fill="url(#navbarCurveSwipeFill)"
            d="M 0 0 V 0 Q 50 0 100 0 V 0 z"
          />
        </svg>
      </div>

      <div
        ref={panelRef}
        className="absolute inset-0 overflow-hidden text-brand-foreground"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
        <div className="navbar-menu__grain absolute inset-0 opacity-30" />
        <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-white/6 lg:block" />

        <div className="relative z-10 mx-auto flex min-h-svh max-w-[1700px] flex-col px-4 pb-6 pt-20 backdrop-blur-[10px] sm:px-5 sm:pb-7 sm:pt-24">
          <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
            <nav
              aria-label="Primary menu"
              className="flex w-full justify-center"
            >
              <div className="mx-auto flex w-fit max-w-full flex-col items-center justify-center">
                {primaryMenuLinks.map((link, index) => {
                  const isActive =
                    (link.href === "/" && pathname === "/") ||
                    (link.href === "/works" && pathname.startsWith("/works")) ||
                    (link.href === "/about" && pathname.startsWith("/about"));

                  return (
                    <NavbarMenuLink
                      key={link.href}
                      link={link}
                      index={index}
                      isActive={isActive}
                      disableHoverMotion={prefersReducedMotion}
                      onClose={onClose}
                      setMenuItemRef={setMenuItemRef}
                    />
                  );
                })}
              </div>
            </nav>
          </div>

          <div className="flex flex-col gap-7 border-t border-white/10 pt-5 text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-brand-foreground/78 sm:flex-row sm:items-end sm:justify-between sm:text-[0.84rem]">
            <div
              ref={(node) => {
                setMetaRef(2, node);
              }}
            >
              <p>{`(c)${currentYear} all rights reserved by Hafiy Aiman`}</p>
            </div>

            <div
              ref={(node) => {
                setMetaRef(3, node);
              }}
              className="flex flex-wrap gap-4 sm:justify-end"
            >
              {footerData.socialLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onClose}
                  className="transition-colors duration-200 hover:text-brand-accent"
                >
                  {link.label}
                </a>
              ))}

              <a
                href="/cv/1Apr26ResumeHafiy.pdf"
                download
                onClick={onClose}
                className="inline-flex items-center gap-1.5 transition-colors duration-200 hover:text-brand-accent"
              >
                Resume
                <Download className="size-3.5" strokeWidth={2.4} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .navbar-menu__grain {
          background-image:
            radial-gradient(
              rgba(255, 255, 255, 0.045) 0.7px,
              transparent 0.7px
            ),
            radial-gradient(rgba(212, 82, 31, 0.045) 0.8px, transparent 0.8px);
          background-position:
            0 0,
            12px 12px;
          background-size: 24px 24px;
          mix-blend-mode: overlay;
        }
      `}</style>
    </div>
  );
}
