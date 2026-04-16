"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

const TechOrbitScene = dynamic(
  () =>
    import("@/components/decor/tech-orbit-scene").then(
      (module) => module.TechOrbitScene,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

const HOLD_DURATION_MS = 7200;
const HOLD_RELEASE_DURATION_MS = 3800;
const VACUUM_PARTICLES = Array.from({ length: 10 }, (_, index) => index);

export function FooterOrbitInteraction() {
  const PROGRESS_CIRCUMFERENCE = 194.78;
  const router = useRouter();
  const footerScopeRef = useRef<HTMLDivElement>(null);
  const holdFrameRef = useRef<number | null>(null);
  const holdLastTimestampRef = useRef<number | null>(null);
  const holdProgressRef = useRef(0);
  const progressCircleRef = useRef<SVGCircleElement | null>(null);
  const progressScaleRef = useRef<HTMLSpanElement | null>(null);
  const isHoldingRef = useRef(false);
  const navigateTimeoutRef = useRef<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const [isOrbitHovered, setIsOrbitHovered] = useState(false);
  const [cursorPoint, setCursorPoint] = useState({ x: 0, y: 0 });
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [shouldLoadScene, setShouldLoadScene] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof IntersectionObserver === "undefined",
  );

  const chargeProgress = holdProgress * holdProgress;
  const orbitSpeedMultiplier = 1 + chargeProgress * 48;
  const vacuumDuration = `${Math.max(0.22, 1.15 - chargeProgress * 0.8)}s`;

  const syncProgressVisuals = (progress: number) => {
    const charge = progress * progress;

    if (progressCircleRef.current) {
      progressCircleRef.current.style.strokeDashoffset = String(
        PROGRESS_CIRCUMFERENCE * (1 - charge),
      );
    }

    if (progressScaleRef.current) {
      progressScaleRef.current.style.transform = `scale(${1 + charge * 0.12})`;
    }
  };

  useEffect(() => {
    const scope = footerScopeRef.current;

    if (!scope || shouldLoadScene) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        setShouldLoadScene(true);
        observer.disconnect();
      },
      {
        rootMargin: "0px 0px 40% 0px",
      },
    );

    observer.observe(scope);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoadScene]);

  useEffect(() => {
    syncProgressVisuals(holdProgressRef.current);

    return () => {
      if (holdFrameRef.current !== null) {
        cancelAnimationFrame(holdFrameRef.current);
      }

      if (navigateTimeoutRef.current !== null) {
        window.clearTimeout(navigateTimeoutRef.current);
      }
    };
  }, []);

  const isPointerInsideOrbit = (clientX: number, clientY: number) => {
    const orbitScope = footerScopeRef.current;

    if (!orbitScope) {
      return false;
    }

    const orbitBounds = orbitScope.getBoundingClientRect();

    return (
      clientX >= orbitBounds.left &&
      clientX <= orbitBounds.right &&
      clientY >= orbitBounds.top &&
      clientY <= orbitBounds.bottom
    );
  };

  const stopHoldLoop = () => {
    if (holdFrameRef.current !== null) {
      cancelAnimationFrame(holdFrameRef.current);
      holdFrameRef.current = null;
    }

    holdLastTimestampRef.current = null;
  };

  const completeHold = () => {
    stopHoldLoop();
    holdProgressRef.current = 1;
    setHoldProgress(1);
    syncProgressVisuals(1);
    isHoldingRef.current = false;
    setIsHolding(false);

    navigateTimeoutRef.current = window.setTimeout(() => {
      router.push("/game");
    }, 120);
  };

  const tickHold = (timestamp: number) => {
    if (holdLastTimestampRef.current === null) {
      holdLastTimestampRef.current = timestamp;
    }

    const elapsed = timestamp - holdLastTimestampRef.current;
    holdLastTimestampRef.current = timestamp;

    const direction = isHoldingRef.current ? 1 : -1;
    const duration = isHoldingRef.current
      ? HOLD_DURATION_MS
      : HOLD_RELEASE_DURATION_MS;
    const delta = elapsed / duration;
    const nextProgress = gsap.utils.clamp(
      0,
      1,
      holdProgressRef.current + delta * direction,
    );

    holdProgressRef.current = nextProgress;
    setHoldProgress(nextProgress);
    syncProgressVisuals(nextProgress);

    if (nextProgress >= 1) {
      completeHold();
      return;
    }

    if (!isHoldingRef.current && nextProgress <= 0) {
      stopHoldLoop();
      return;
    }

    if (isHoldingRef.current) {
      const orbitBounds = footerScopeRef.current?.getBoundingClientRect();

      if (orbitBounds) {
        setCursorPoint({
          x: lastPointerRef.current.x - orbitBounds.left,
          y: lastPointerRef.current.y - orbitBounds.top,
        });
      }
    }

    holdFrameRef.current = requestAnimationFrame(tickHold);
  };

  const startHold = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (navigateTimeoutRef.current !== null) {
      window.clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = null;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    isHoldingRef.current = true;
    setIsHolding(true);

    if (holdFrameRef.current === null) {
      holdFrameRef.current = requestAnimationFrame(tickHold);
    }
  };

  const endHold = (event?: ReactPointerEvent<HTMLButtonElement>) => {
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (holdProgressRef.current < 1) {
      isHoldingRef.current = false;
      setIsHolding(false);

      if (holdFrameRef.current === null) {
        holdFrameRef.current = requestAnimationFrame(tickHold);
      }
    }

    const { x, y } = lastPointerRef.current;
    setIsOrbitHovered(isPointerInsideOrbit(x, y));
  };

  const updateHoverState = (event: React.PointerEvent<HTMLDivElement>) => {
    const orbitBounds = footerScopeRef.current?.getBoundingClientRect();

    if (!orbitBounds) {
      return;
    }

    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    const isInsideOrbit = isPointerInsideOrbit(event.clientX, event.clientY);

    if (!isInsideOrbit) {
      if (isOrbitHovered && !isHoldingRef.current) {
        setIsOrbitHovered(false);
      }

      if (!isHoldingRef.current) {
        endHold();
      }

      return;
    }

    if (!isHoldingRef.current) {
      setCursorPoint({
        x: event.clientX - orbitBounds.left,
        y: event.clientY - orbitBounds.top,
      });
    }

    if (!isOrbitHovered) {
      setIsOrbitHovered(true);
    }
  };

  const getVacuumParticleStyle = (particle: number) =>
    ({
      width: particle % 2 === 0 ? "10px" : "7px",
      height: particle % 2 === 0 ? "10px" : "7px",
      "--vacuum-angle": `${particle * 36}deg`,
      "--vacuum-delay": `${particle * 0.08}s`,
      "--vacuum-radius": `${54 + (particle % 3) * 14}px`,
      "--vacuum-duration": vacuumDuration,
    }) as CSSProperties;

  return (
    <div
      ref={footerScopeRef}
      className="absolute bottom-0 right-[-2rem] z-40 h-[44rem] w-[64rem] max-w-[98vw]"
      onPointerEnter={updateHoverState}
      onPointerMove={updateHoverState}
      onPointerLeave={() => {
        lastPointerRef.current = { x: -1, y: -1 };

        if (!isHoldingRef.current) {
          setIsOrbitHovered(false);
        }

        endHold();
      }}
    >
      {shouldLoadScene ? (
        <TechOrbitScene
          stageClassName="absolute bottom-0 right-[-2rem] z-0 h-[44rem] w-[64rem] max-w-[98vw] overflow-visible opacity-80"
          glowClassName="absolute inset-0 bg-[radial-gradient(circle_at_78%_76%,rgba(212,82,31,0.26),transparent_24%),radial-gradient(circle_at_74%_82%,rgba(255,240,220,0.08),transparent_20%),radial-gradient(circle_at_78%_82%,rgba(9,11,19,0.16),transparent_44%)]"
          sceneClassName="absolute bottom-[22rem] right-[14rem] h-0 w-0 scale-[0.78] will-change-transform xl:scale-[0.96]"
          speedMultiplier={orbitSpeedMultiplier}
        />
      ) : null}

      <div
        className={`pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150 ${
          isOrbitHovered || isHolding ? "opacity-100" : "opacity-0"
        }`}
        style={{ left: cursorPoint.x, top: cursorPoint.y }}
      >
        {VACUUM_PARTICLES.map((particle) => (
          <span
            key={particle}
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 top-1/2 block rounded-full transition-opacity duration-200 ${
              isHolding && isOrbitHovered ? "opacity-100" : "opacity-0"
            }`}
            style={getVacuumParticleStyle(particle)}
          />
        ))}

        <button
          type="button"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          className={`pointer-events-auto relative inline-flex size-20 items-center justify-center rounded-full border text-brand backdrop-blur-sm transition-[transform,border-color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 ${
            isHolding
              ? "border-brand/45 bg-brand/14 shadow-[0_0_0_10px_rgba(93,19,5,0.06),0_0_40px_rgba(93,19,5,0.18)]"
              : "border-brand/28 bg-brand/10 shadow-[0_0_0_10px_rgba(93,19,5,0.05),0_0_32px_rgba(93,19,5,0.14)] hover:scale-[1.04] hover:border-brand/40 hover:bg-brand/16"
          }`}
          aria-label="Hold to open the game page"
        >
          <span className="absolute inset-0 rounded-full border border-brand/10" />
          <span
            ref={progressScaleRef}
            className="absolute inset-[7px] rounded-full border border-brand/10 transition-transform duration-150"
          />
          <svg className="-rotate-90" viewBox="0 0 80 80" aria-hidden="true">
            <circle
              cx="40"
              cy="40"
              r="31"
              fill="none"
              stroke="rgba(93,19,5,0.14)"
              strokeWidth="3.5"
            />
            <circle
              ref={progressCircleRef}
              cx="40"
              cy="40"
              r="31"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={PROGRESS_CIRCUMFERENCE}
              strokeDashoffset={PROGRESS_CIRCUMFERENCE}
            />
          </svg>
          <span className="absolute flex size-8 items-center justify-center rounded-full bg-brand text-background text-[0.58rem] font-bold uppercase tracking-[0.24em]">
            HOLD
          </span>
        </button>
      </div>

      <style jsx>{`
        @keyframes footer-vacuum-in {
          0% {
            transform: translate(-50%, -50%) rotate(var(--vacuum-angle))
              translateX(var(--vacuum-radius)) scale(0.35);
            opacity: 0;
          }

          18% {
            opacity: 1;
          }

          100% {
            transform: translate(-50%, -50%) rotate(var(--vacuum-angle))
              translateX(0px) scale(1);
            opacity: 0;
          }
        }

        span[aria-hidden="true"] {
          background: radial-gradient(
            circle at 35% 35%,
            color-mix(in oklab, var(--brand-foreground) 92%, white 8%),
            color-mix(
                in oklab,
                var(--brand-accent) 78%,
                var(--brand-foreground) 22%
              )
              32%,
            color-mix(in oklab, var(--brand-accent) 70%, transparent) 62%,
            transparent 100%
          );
          box-shadow:
            0 0 10px
              color-mix(
                in oklab,
                var(--brand-accent) 55%,
                var(--brand-foreground) 45%
              ),
            0 0 22px color-mix(in oklab, var(--brand-accent) 42%, transparent);
          filter: blur(0.35px);
          animation-name: footer-vacuum-in;
          animation-duration: var(--vacuum-duration);
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-delay: var(--vacuum-delay);
          animation-play-state: ${isHolding ? "running" : "paused"};
        }
      `}</style>
    </div>
  );
}
