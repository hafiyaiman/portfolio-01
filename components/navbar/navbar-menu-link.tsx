"use client";

import { gsap } from "gsap";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

import type { NavbarMenuLink } from "./menu-data";

interface NavbarMenuLinkProps {
  link: NavbarMenuLink;
  index: number;
  isActive: boolean;
  disableHoverMotion: boolean;
  onClose: () => void;
  setMenuItemRef: (index: number, node: HTMLAnchorElement | null) => void;
}

function createCursorDataUri(label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="36" viewBox="0 0 96 36" fill="none">
      <rect x="6" y="7" width="84" height="22" rx="4" fill="#d4521f"/>
      <text x="48" y="21.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="700" letter-spacing="1.2" fill="#ffffff">${label.toUpperCase()}</text>
    </svg>
  `;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 9 9, pointer`;
}

export function NavbarMenuLink({
  link,
  index,
  isActive,
  disableHoverMotion,
  onClose,
  setMenuItemRef,
}: NavbarMenuLinkProps) {
  const rotatorRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const hoverTweenRef = useRef<gsap.core.Tween | null>(null);
  const isHoverAnimatingRef = useRef(false);
  const characters = useMemo(() => link.label.split(""), [link.label]);
  const flipDirection = index % 2 === 0 ? -180 : 180;
  const isComingSoon = link.comingSoon === true;
  const customCursor = useMemo(
    () => (isComingSoon ? createCursorDataUri("Coming soon") : undefined),
    [isComingSoon],
  );

  const playHoverFlip = () => {
    if (disableHoverMotion || isHoverAnimatingRef.current) {
      return;
    }

    const rotators = rotatorRefs.current.filter(
      (char): char is HTMLSpanElement => char !== null,
    );

    if (rotators.length === 0) {
      return;
    }

    hoverTweenRef.current = gsap.to(rotators, {
      rotationX: `+=${flipDirection}`,
      duration: 0.72,
      stagger: 0.03,
      ease: "power3.inOut",
      overwrite: "auto",
      onStart: () => {
        isHoverAnimatingRef.current = true;
      },
      onComplete: () => {
        rotators.forEach((rotator) => {
          const rotationX = Number(gsap.getProperty(rotator, "rotationX"));
          const snappedRotation = Math.round(rotationX / 180) * 180;
          gsap.set(rotator, { rotationX: snappedRotation });
        });
        isHoverAnimatingRef.current = false;
        hoverTweenRef.current = null;
      },
      onInterrupt: () => {
        isHoverAnimatingRef.current = false;
        hoverTweenRef.current = null;
      },
    });
  };

  useEffect(() => {
    return () => {
      hoverTweenRef.current?.kill();
      isHoverAnimatingRef.current = false;
    };
  }, []);

  return (
    <Link
      ref={(node) => {
        setMenuItemRef(index, node);
      }}
      href={link.href}
      onClick={(event) => {
        if (isComingSoon) {
          event.preventDefault();
          return;
        }

        onClose();
      }}
      onMouseEnter={playHoverFlip}
      onFocus={playHoverFlip}
      aria-label={isComingSoon ? `${link.label} coming soon` : link.label}
      className={`group relative mx-auto flex w-fit justify-center overflow-hidden text-center font-heading text-[3.3rem] font-black uppercase leading-[0.88] tracking-[-0.07em] transition-[color,transform] duration-200 sm:text-[5.8rem] lg:text-[7.8rem] xl:text-[9rem] ${
        isActive ? "text-brand-accent" : "text-brand-foreground"
      }`}
      style={{
        perspective: "1000px",
        cursor: customCursor,
      }}
    >
      <span className="inline-block transition-transform duration-300 group-hover:scale-[1.01]">
        {characters.map((character, charIndex) => (
          <span
            key={`${link.href}-${character}-${charIndex}`}
            className="relative inline-grid place-items-center [perspective:1000px]"
          >
            <span
              ref={(node) => {
                rotatorRefs.current[charIndex] = node;
              }}
              className="relative inline-grid place-items-center [transform-style:preserve-3d] will-change-transform"
              style={{ transformOrigin: "50% 50% -24px" }}
            >
              <span className="col-start-1 row-start-1 inline-block [backface-visibility:hidden]">
                {character === " " ? "\u00A0" : character}
              </span>
              <span className="col-start-1 row-start-1 inline-block [backface-visibility:hidden] [transform:rotateX(180deg)]">
                {character === " " ? "\u00A0" : character}
              </span>
            </span>
          </span>
        ))}
      </span>
    </Link>
  );
}
