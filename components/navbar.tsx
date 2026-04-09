"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { NavbarOverlay } from "./navbar/navbar-overlay";
import { NavbarTopbar } from "./navbar/navbar-topbar";
import { useNavbarMenuAnimation } from "./navbar/use-navbar-menu-animation";

export function Navbar() {
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const swipeLayerRef = useRef<HTMLDivElement>(null);
  const swipePathRef = useRef<SVGPathElement>(null);
  const menuItemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const metaRefs = useRef<Array<HTMLElement | null>>([]);
  const [isInHero, setIsInHero] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const showHeroMenu = pathname === "/" && isInHero;
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const setMenuItemRef = (index: number, node: HTMLAnchorElement | null) => {
    menuItemRefs.current[index] = node;
  };
  const setMetaRef = (index: number, node: HTMLElement | null) => {
    metaRefs.current[index] = node;
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const hero = document.getElementById("hero");

    if (!hero) {
      return;
    }

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

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useNavbarMenuAnimation({
    isMenuOpen,
    prefersReducedMotion,
    overlayRef,
    panelRef,
    swipeLayerRef,
    swipePathRef,
    menuItemRefs,
    metaRefs,
  });

  return (
    <>
      <NavbarTopbar
        isMenuOpen={isMenuOpen}
        showHeroMenu={showHeroMenu}
        onToggleMenu={() => setIsMenuOpen((current) => !current)}
      />

      <NavbarOverlay
        pathname={pathname}
        currentYear={currentYear}
        isMenuOpen={isMenuOpen}
        prefersReducedMotion={prefersReducedMotion}
        overlayRef={overlayRef}
        panelRef={panelRef}
        swipeLayerRef={swipeLayerRef}
        swipePathRef={swipePathRef}
        setMenuItemRef={setMenuItemRef}
        setMetaRef={setMetaRef}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}
