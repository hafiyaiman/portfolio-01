"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

interface UseNavbarMenuAnimationParams {
  isMenuOpen: boolean;
  prefersReducedMotion: boolean;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  swipeLayerRef: React.RefObject<HTMLDivElement | null>;
  swipePathRef: React.RefObject<SVGPathElement | null>;
  menuItemRefs: React.RefObject<Array<HTMLAnchorElement | null>>;
  metaRefs: React.RefObject<Array<HTMLElement | null>>;
}

export function useNavbarMenuAnimation({
  isMenuOpen,
  prefersReducedMotion,
  overlayRef,
  panelRef,
  swipeLayerRef,
  swipePathRef,
  menuItemRefs,
  metaRefs,
}: UseNavbarMenuAnimationParams) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    const swipeLayer = swipeLayerRef.current;
    const swipePath = swipePathRef.current;
    const menuItems = menuItemRefs.current.filter(Boolean);
    const metaItems = metaRefs.current.filter(Boolean);

    if (!overlay || !panel || !swipeLayer || !swipePath || menuItems.length === 0) {
      return;
    }

    const ctx = gsap.context(() => {
      const visibleMenuItems = menuItems.filter(
        (item): item is HTMLAnchorElement => item !== null,
      );
      const visibleMetaItems = metaItems.filter(
        (item): item is HTMLElement => item !== null,
      );
      const swipeState = { y: 0, q: 0 };
      const drawSwipe = () => {
        swipePath.setAttribute(
          "d",
          `M 0 0 V ${swipeState.y} Q 50 ${swipeState.q} 100 ${swipeState.y} V 0 z`,
        );
      };

      const resetClosedState = () => {
        gsap.set(overlay, { autoAlpha: 0, pointerEvents: "none" });
        gsap.set(panel, { autoAlpha: 0 });
        gsap.set(swipeLayer, { autoAlpha: 0 });
        swipeState.y = 0;
        swipeState.q = 0;
        drawSwipe();
        gsap.set(visibleMenuItems, {
          opacity: 0,
          y: 42,
          force3D: true,
        });
        gsap.set(visibleMetaItems, { opacity: 0, y: 16, force3D: true });
      };

      timelineRef.current?.kill();

      if (prefersReducedMotion) {
        gsap.set(overlay, {
          autoAlpha: isMenuOpen ? 1 : 0,
          pointerEvents: isMenuOpen ? "auto" : "none",
        });
        gsap.set(panel, { autoAlpha: isMenuOpen ? 1 : 0 });
        gsap.set(swipeLayer, { autoAlpha: isMenuOpen ? 1 : 0 });
        swipeState.y = isMenuOpen ? 100 : 0;
        swipeState.q = isMenuOpen ? 100 : 0;
        drawSwipe();
        gsap.set(visibleMenuItems, {
          opacity: isMenuOpen ? 1 : 0,
          y: 0,
        });
        gsap.set(visibleMetaItems, {
          opacity: isMenuOpen ? 1 : 0,
          y: 0,
        });
        return;
      }

      if (isMenuOpen) {
        gsap.set(overlay, { autoAlpha: 0, pointerEvents: "auto" });
        gsap.set(panel, { autoAlpha: 0 });
        gsap.set(swipeLayer, { autoAlpha: 1 });
        swipeState.y = 0;
        swipeState.q = 0;
        drawSwipe();
        gsap.set(visibleMenuItems, {
          opacity: 0,
          y: 42,
          force3D: true,
        });
        gsap.set(visibleMetaItems, { opacity: 0, y: 16, force3D: true });

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        timelineRef.current = tl;

        tl.to(overlay, { autoAlpha: 1, duration: 0.12 })
          .to(
            swipeState,
            {
              y: 52,
              q: 100,
              duration: 0.34,
              ease: "power2.in",
              onUpdate: drawSwipe,
            },
            0,
          )
          .to(
            swipeState,
            {
              y: 100,
              q: 100,
              duration: 0.42,
              ease: "power2.out",
              onUpdate: drawSwipe,
            },
            0.3,
          )
          .to(
            visibleMenuItems,
            {
              opacity: 1,
              y: 0,
              stagger: 0.06,
              duration: 0.7,
              ease: "power3.out",
            },
            0.44,
          )
          .to(
            visibleMetaItems,
            { opacity: 1, y: 0, stagger: 0.05, duration: 0.32 },
            0.56,
          )
          .to(panel, { autoAlpha: 1, duration: 0.08 }, 0.68);

        return;
      }

      gsap.set(overlay, { autoAlpha: 1, pointerEvents: "auto" });
      gsap.set(panel, { autoAlpha: 1 });
      gsap.set(swipeLayer, { autoAlpha: 1 });
      swipeState.y = 100;
      swipeState.q = 100;
      drawSwipe();

      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: resetClosedState,
      });
      timelineRef.current = tl;

      tl.to(visibleMetaItems, {
        opacity: 0,
        y: 12,
        stagger: 0.03,
        duration: 0.18,
      })
        .to(
          visibleMenuItems,
          {
            opacity: 0,
            y: 20,
            stagger: 0.03,
            duration: 0.22,
          },
          0,
        )
        .to(
          swipeState,
          {
            y: 100,
            q: 132,
            duration: 0.26,
            ease: "power2.inOut",
            onUpdate: drawSwipe,
          },
          0.06,
        )
        .to(
          swipeState,
          {
            y: 0,
            q: 0,
            duration: 0.56,
            ease: "expo.inOut",
            onUpdate: drawSwipe,
          },
          0.24,
        )
        .to(panel, { autoAlpha: 0, duration: 0.12 }, 0.14)
        .to(swipeLayer, { autoAlpha: 0, duration: 0.12 }, 0.74)
        .to(overlay, { autoAlpha: 0, duration: 0.16 }, 0.78);
    }, overlay);

    return () => {
      timelineRef.current?.kill();
      ctx.revert();
    };
  }, [
    isMenuOpen,
    prefersReducedMotion,
    menuItemRefs,
    metaRefs,
    overlayRef,
    panelRef,
    swipeLayerRef,
    swipePathRef,
  ]);
}
