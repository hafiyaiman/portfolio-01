"use client";

import { gsap } from "gsap";
import Link from "next/link";
import { useMemo, useRef } from "react";

import type { NavbarMenuLink } from "./menu-data";

interface NavbarMenuLinkProps {
  link: NavbarMenuLink;
  index: number;
  isActive: boolean;
  disableHoverMotion: boolean;
  onClose: () => void;
  setMenuItemRef: (index: number, node: HTMLAnchorElement | null) => void;
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
  const characters = useMemo(() => link.label.split(""), [link.label]);
  const flipDirection = index % 2 === 0 ? -180 : 180;

  const playHoverFlip = () => {
    if (disableHoverMotion) {
      return;
    }

    const rotators = rotatorRefs.current.filter(
      (char): char is HTMLSpanElement => char !== null,
    );

    if (rotators.length === 0) {
      return;
    }

    hoverTweenRef.current?.kill();
    hoverTweenRef.current = gsap.to(rotators, {
      rotationX: `+=${flipDirection}`,
      duration: 0.72,
      stagger: 0.03,
      ease: "power3.inOut",
      overwrite: "auto",
    });
  };

  return (
    <Link
      ref={(node) => {
        setMenuItemRef(index, node);
      }}
      href={link.href}
      onClick={onClose}
      onMouseEnter={playHoverFlip}
      onFocus={playHoverFlip}
      className={`group relative mx-auto flex w-fit justify-center overflow-hidden text-center font-heading text-[3.3rem] font-black uppercase leading-[0.88] tracking-[-0.07em] transition-[color,transform] duration-200 sm:text-[5.8rem] lg:text-[7.8rem] xl:text-[9rem] ${
        isActive ? "text-brand-accent" : "text-brand-foreground"
      }`}
      style={{ perspective: "1000px" }}
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
