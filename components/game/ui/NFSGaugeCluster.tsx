"use client";

import { useEffect, useId, useRef } from "react";
import { useGameStore } from "../stores/useGameStore";

const DIAL = {
  x: 125,
  y: 124,
  radius: 96,
  start: 135,
  sweep: 270,
  maxRpm: 8000,
};
const CYAN = "oklch(0.83 0.13 205)";
const RED = "oklch(0.7 0.2 25)";
const MUTED = "oklch(0.7 0.015 250)";
const clamp = (v: number, max: number) =>
  Math.max(0, Math.min(max, Number.isFinite(v) ? v : 0));
const angleFor = (rpm: number) =>
  DIAL.start + (clamp(rpm, DIAL.maxRpm) / DIAL.maxRpm) * DIAL.sweep;

function point(radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.round((DIAL.x + Math.cos(rad) * radius) * 100) / 100,
    y: Math.round((DIAL.y + Math.sin(rad) * radius) * 100) / 100,
  };
}

function arc(radius: number, start: number, end: number) {
  const a = point(radius, start),
    b = point(radius, end);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

// Static SVG geometry is shared across mounts; only telemetry nodes change per frame.
const TICKS = Array.from({ length: 33 }, (_, i) => {
  const rpm = i * 250;
  const major = i % 4 === 0;
  const outer = point(89, angleFor(rpm));
  const inner = point(major ? 78 : 84, angleFor(rpm));
  const label = point(66, angleFor(rpm));
  return {
    rpm,
    major,
    x1: inner.x,
    y1: inner.y,
    x2: outer.x,
    y2: outer.y,
    labelX: label.x,
    labelY: label.y,
  };
});
const BOOST_TICKS = Array.from({ length: 11 }, (_, i) => {
  const angle = ((135 + i * 27) * Math.PI) / 180;
  const major = i % 5 === 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rInner = major ? 29 : 32;
  return {
    value: i / 10,
    major,
    x1: Math.round(cos * rInner * 100) / 100,
    y1: Math.round(sin * rInner * 100) / 100,
    x2: Math.round(cos * 36 * 100) / 100,
    y2: Math.round(sin * 36 * 100) / 100,
    labelX: Math.round(cos * 23 * 100) / 100,
    labelY: Math.round(sin * 23 * 100) / 100,
  };
});

export function NFSGaugeCluster({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const needle = useRef<SVGGElement>(null);
  const rpmArc = useRef<SVGPathElement>(null);
  const speed = useRef<SVGTextElement>(null);
  const gear = useRef<SVGTextElement>(null);
  const rpmText = useRef<SVGTextElement>(null);
  const boostText = useRef<SVGTextElement>(null);
  const boostNeedle = useRef<SVGGElement>(null);
  const shift = useRef<SVGGElement>(null);
  const description = useRef<SVGDescElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousTime = 0;
    let previousReset = -1;
    let displayedRpm = 0;
    let displayedBoost = 0;
    let describedAt = -1000;
    const update = (time: number) => {
      const state = useGameStore.getState();
      const rpm = clamp(state.rpm, DIAL.maxRpm);
      const boost = clamp(state.boost, 1);
      const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0;
      const snap = previousReset !== state.resetId || reducedMotion.matches;
      const blend = snap ? 1 : 1 - Math.exp(-dt * 16);
      displayedRpm += (rpm - displayedRpm) * blend;
      displayedBoost += (boost - displayedBoost) * blend;
      previousReset = state.resetId;
      previousTime = time;
      needle.current?.setAttribute(
        "transform",
        `rotate(${angleFor(displayedRpm)} ${DIAL.x} ${DIAL.y})`,
      );
      rpmArc.current?.setAttribute(
        "stroke-dasharray",
        `${(displayedRpm / DIAL.maxRpm) * 100} 100`,
      );
      const speedValue = String(Math.round(clamp(state.speed, 999)));
      const gearValue =
        state.gear === -1 ? "R" : state.gear === 0 ? "N" : String(state.gear);
      if (speed.current)
        speed.current.textContent = speedValue.padStart(3, "0");
      if (gear.current) gear.current.textContent = gearValue;
      if (rpmText.current)
        rpmText.current.textContent = String(Math.round(rpm / 50) * 50);
      if (boostText.current) boostText.current.textContent = boost.toFixed(2);
      boostNeedle.current?.setAttribute(
        "transform",
        `rotate(${135 + displayedBoost * 270})`,
      );
      shift.current?.setAttribute("opacity", rpm >= 6500 ? "1" : "0");
      // Keep accessible telemetry current without a constantly announcing live region.
      if (description.current && time - describedAt >= 1000) {
        description.current.textContent = `${speedValue} kilometres per hour, gear ${gearValue}, ${Math.round(rpm)} RPM, boost ${boost.toFixed(2)} bar.`;
        describedAt = time;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      suppressHydrationWarning
      className={`pointer-events-none relative select-none ${className}`}
      style={{ width: "370px", maxWidth: "90vw", aspectRatio: "430 / 250" }}
    >
      <svg
        suppressHydrationWarning
        viewBox="0 0 430 250"
        className="h-full w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        fontFamily="'Bahnschrift', 'DIN Alternate', monospace"
      >
        <title id={`${id}-title`}>Silvia S15 instrument cluster</title>
        <desc id={`${id}-description`} ref={description}>
          Speed, gear, engine RPM and turbo boost.
        </desc>
        <defs>
          <linearGradient id={`${id}-case`} x2="0.8" y2="1">
            <stop stopColor="oklch(0.31 0.015 250)" />
            <stop offset="1" stopColor="oklch(0.14 0.008 250)" />
          </linearGradient>
          <radialGradient id={`${id}-face`}>
            <stop stopColor="oklch(0.25 0.03 210)" />
            <stop offset="1" stopColor="oklch(0.14 0.008 250)" />
          </radialGradient>
        </defs>

        <path
          d="M 125 18 H 389 L 419 48 V 223 L 401 239 H 125 A 110 110 0 0 1 125 18 Z"
          fill={`url(#${id}-case)`}
          stroke="oklch(0.43 0.02 250)"
        />
        <path
          d="M 244 35 H 385 L 404 54 V 218 H 244 Z"
          fill="oklch(0.16 0.008 250)"
        />
        <circle
          cx={DIAL.x}
          cy={DIAL.y}
          r="104"
          fill={`url(#${id}-face)`}
          stroke="oklch(0.38 0.02 250)"
          strokeWidth="2"
        />
        <path
          d={arc(DIAL.radius, DIAL.start, DIAL.start + DIAL.sweep)}
          fill="none"
          stroke="oklch(0.3 0.025 220)"
          strokeWidth="4"
        />
        <path
          ref={rpmArc}
          d={arc(DIAL.radius, DIAL.start, DIAL.start + DIAL.sweep)}
          pathLength="100"
          strokeDasharray="0 100"
          fill="none"
          stroke={CYAN}
          strokeWidth="4"
        />
        <path
          d={arc(DIAL.radius, angleFor(7500), angleFor(8000))}
          fill="none"
          stroke={RED}
          strokeWidth="5"
        />
        {TICKS.map((t) => (
          <g key={t.rpm} fill={t.rpm >= 7500 ? RED : CYAN}>
            <line
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="currentColor"
              style={{ color: t.rpm >= 7500 ? RED : CYAN }}
              strokeWidth={t.major ? 2.5 : 1}
            />
            {t.major && (
              <text
                x={t.labelX}
                y={t.labelY}
                dominantBaseline="central"
                textAnchor="middle"
                fontSize="14"
                fontWeight="600"
              >
                {t.rpm / 1000}
              </text>
            )}
          </g>
        ))}
        <text
          x="125"
          y="85"
          textAnchor="middle"
          fill={MUTED}
          fontSize="9"
          letterSpacing="1.5"
        >
          SR20DET
        </text>
        <g ref={needle} transform={`rotate(${DIAL.start} ${DIAL.x} ${DIAL.y})`}>
          <path
            d="M 110 121 L 210 124 L 110 127 Z"
            fill="oklch(0.96 0.015 205)"
          />
        </g>
        <circle
          cx="125"
          cy="124"
          r="10"
          fill="oklch(0.18 0.015 250)"
          stroke={CYAN}
          strokeWidth="2"
        />
        <circle cx="125" cy="124" r="3" fill={CYAN} />
        <text
          ref={rpmText}
          x="125"
          y="177"
          textAnchor="middle"
          fill="white"
          fontSize="22"
          fontWeight="600"
        >
          950
        </text>
        <text
          x="125"
          y="193"
          textAnchor="middle"
          fill={MUTED}
          fontSize="9"
          letterSpacing="2"
        >
          RPM / x1000
        </text>
        <g ref={shift} opacity="0">
          <rect x="97" y="204" width="56" height="16" rx="2" fill={RED} />
          <text
            x="125"
            y="215"
            textAnchor="middle"
            fill="oklch(0.14 0.01 25)"
            fontSize="10"
            fontWeight="800"
            letterSpacing="1"
          >
            SHIFT
          </text>
        </g>

        <text x="253" y="53" fill={MUTED} fontSize="9" letterSpacing="2">
          S15 / SPEC-R
        </text>
        <path d="M 253 64 H 395" stroke="oklch(0.35 0.015 250)" />
        <text
          x="266"
          y="84"
          textAnchor="middle"
          fill={MUTED}
          fontSize="9"
          letterSpacing="1"
        >
          GEAR
        </text>
        <text
          ref={gear}
          x="266"
          y="130"
          textAnchor="middle"
          fill={CYAN}
          fontSize="36"
          fontWeight="700"
        >
          1
        </text>
        <path d="M 290 77 V 140" stroke="oklch(0.35 0.015 250)" />
        <text
          ref={speed}
          x="397"
          y="137"
          textAnchor="end"
          fill="oklch(0.96 0.015 205)"
          fontSize="52"
          fontWeight="700"
          textLength="96"
          lengthAdjust="spacingAndGlyphs"
          className="tabular-nums"
        >
          000
        </text>
        <text
          x="394"
          y="163"
          textAnchor="end"
          fill={MUTED}
          fontSize="10"
          letterSpacing="2"
        >
          KM/H
        </text>
        <g transform="translate(283 194)">
          <circle
            r="42"
            fill={`url(#${id}-face)`}
            stroke="oklch(0.43 0.02 250)"
            strokeWidth="2"
          />
          <path
            d="M -26.87 26.87 A 38 38 0 1 1 26.87 26.87"
            fill="none"
            stroke={CYAN}
            strokeWidth="1.5"
          />
          {BOOST_TICKS.map((t) => (
            <g key={t.value}>
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={CYAN}
                strokeWidth={t.major ? 2 : 1}
              />
              {t.major && (
                <text
                  x={t.labelX}
                  y={t.labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={MUTED}
                  fontSize="8"
                >
                  {t.value}
                </text>
              )}
            </g>
          ))}
          <g ref={boostNeedle} transform="rotate(135)">
            <path d="M -7 -1.5 L 32 0 L -7 1.5 Z" fill="white" />
          </g>
          <circle
            r="5"
            fill="oklch(0.18 0.015 250)"
            stroke={CYAN}
            strokeWidth="1.5"
          />
          <text
            ref={boostText}
            x="0"
            y="28"
            textAnchor="middle"
            fill={CYAN}
            fontSize="11"
            className="tabular-nums"
          >
            0.00
          </text>
        </g>
        <text x="338" y="198" fill={MUTED} fontSize="10" letterSpacing="1">
          BOOST
        </text>
        <text x="338" y="214" fill={CYAN} fontSize="9" letterSpacing="1">
          0-1 BAR
        </text>
      </svg>
    </div>
  );
}
