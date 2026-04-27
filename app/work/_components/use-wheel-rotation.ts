"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";

import {
  DESKTOP_FOCUS_ANGLE,
  MOBILE_FOCUS_ANGLE,
  ROTATION_PER_PIXEL,
} from "./works-wheel.constants";

interface UseWheelRotationOptions {
  sectionRef: RefObject<HTMLElement | null>;
  desktopWheelRef: RefObject<HTMLDivElement | null>;
  mobileWheelRef: RefObject<HTMLDivElement | null>;
  onActiveProjectChange: (index: number) => void;
  onActiveSlotChange: (index: number) => void;
  projectCount: number;
  desktopOrbitRadius: number;
  mobileOrbitRadius: number;
}

export function useWheelRotation({
  sectionRef,
  desktopWheelRef,
  mobileWheelRef,
  onActiveProjectChange,
  onActiveSlotChange,
  projectCount,
  desktopOrbitRadius,
  mobileOrbitRadius,
}: UseWheelRotationOptions) {
  const activeProjectIndexRef = useRef(0);
  const activeSlotIndexRef = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    const desktopWheel = desktopWheelRef.current;
    const mobileWheel = mobileWheelRef.current;

    if (!section || !desktopWheel || !mobileWheel) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopCards = gsap.utils.toArray<HTMLElement>(
      "[data-wheel-card-desktop]",
    );
    const mobileCards = gsap.utils.toArray<HTMLElement>(
      "[data-wheel-card-mobile]",
    );

    const refreshWheels = () => {
      setupWheelPositions(desktopWheel, desktopCards, desktopOrbitRadius);
      setupWheelPositions(mobileWheel, mobileCards, mobileOrbitRadius);
    };

    const syncActiveState = (rotation: number) => {
      const nextState = getActiveStateFromRotation({
        desktopCards,
        mobileCards,
        projectCount,
        rotation,
      });

      if (nextState.slotIndex !== activeSlotIndexRef.current) {
        activeSlotIndexRef.current = nextState.slotIndex;
        onActiveSlotChange(nextState.slotIndex);
      }

      if (nextState.projectIndex !== activeProjectIndexRef.current) {
        activeProjectIndexRef.current = nextState.projectIndex;
        onActiveProjectChange(nextState.projectIndex);
      }
    };

    refreshWheels();
    syncActiveState(0);

    if (reducedMotion.matches) {
      const handleResize = () => {
        refreshWheels();
        syncActiveState(0);
      };

      gsap.set([desktopWheel, mobileWheel], { rotation: 0 });
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    let animationFrameId = 0;
    let currentRotation = 0;
    let lastScrollY = window.scrollY;
    let isWrapping = false;

    const render = () => {
      gsap.set([desktopWheel, mobileWheel], { rotation: currentRotation });
      gsap.set([...desktopCards, ...mobileCards], { rotation: -currentRotation });
      syncActiveState(currentRotation);
      animationFrameId = window.requestAnimationFrame(render);
    };

    const wrapScrollIfNeeded = (delta: number) => {
      const sectionTop = section.offsetTop;
      const sectionBottom =
        sectionTop + section.offsetHeight - window.innerHeight;
      const buffer = window.innerHeight * 1.8;

      if (delta > 0 && window.scrollY >= sectionBottom - buffer) {
        isWrapping = true;
        const nextScroll = sectionTop + buffer;
        window.scrollTo({ top: nextScroll, behavior: "auto" });
        lastScrollY = nextScroll;
        window.requestAnimationFrame(() => {
          syncActiveState(currentRotation);
          isWrapping = false;
        });
      }

      if (
        delta < 0 &&
        window.scrollY <= sectionTop + buffer * 0.75 &&
        sectionBottom > buffer * 2
      ) {
        isWrapping = true;
        const nextScroll = sectionBottom - buffer;
        window.scrollTo({ top: nextScroll, behavior: "auto" });
        lastScrollY = nextScroll;
        window.requestAnimationFrame(() => {
          syncActiveState(currentRotation);
          isWrapping = false;
        });
      }
    };

    const handleScroll = () => {
      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollY;
      lastScrollY = nextScrollY;

      if (isWrapping || Math.abs(delta) > window.innerHeight) {
        return;
      }

      currentRotation -= delta * ROTATION_PER_PIXEL;
      wrapScrollIfNeeded(delta);
    };

    const handleResize = () => {
      refreshWheels();
      syncActiveState(currentRotation);
    };

    animationFrameId = window.requestAnimationFrame(render);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    desktopOrbitRadius,
    desktopWheelRef,
    mobileOrbitRadius,
    mobileWheelRef,
    onActiveProjectChange,
    onActiveSlotChange,
    projectCount,
    sectionRef,
  ]);
}

function setupWheelPositions(
  wheel: HTMLDivElement,
  cards: HTMLElement[],
  orbitRadius: number,
) {
  const center = wheel.offsetWidth / 2;
  const slice = 360 / cards.length;
  const deg2rad = Math.PI / 180;

  gsap.set(cards, {
    x: (index) => center + orbitRadius * Math.sin(index * slice * deg2rad),
    y: (index) => center - orbitRadius * Math.cos(index * slice * deg2rad),
    rotation: 0,
    xPercent: -50,
    yPercent: -50,
  });
}

function getActiveStateFromRotation({
  desktopCards,
  mobileCards,
  projectCount,
  rotation,
}: {
  desktopCards: HTMLElement[];
  mobileCards: HTMLElement[];
  projectCount: number;
  rotation: number;
}) {
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  const cards = isDesktop ? desktopCards : mobileCards;
  const focusAngle = isDesktop ? DESKTOP_FOCUS_ANGLE : MOBILE_FOCUS_ANGLE;
  const slice = 360 / cards.length;
  const roundedStep = Math.round((focusAngle - rotation) / slice);
  const closestSlotIndex = mod(roundedStep, cards.length);
  const closestProjectIndex =
    projectCount > 0 ? mod(roundedStep, projectCount) : 0;

  return {
    slotIndex: closestSlotIndex,
    projectIndex: closestProjectIndex,
  };
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
