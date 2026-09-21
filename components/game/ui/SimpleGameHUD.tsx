"use client";

import { useEffect, useId, useRef } from "react";
import { Pause, ArrowLeft, ArrowRight, MapPin, Volume2 } from "lucide-react";
import { useGameStore, initAssistFromStorage } from "../stores/useGameStore";
import { clearDrivingInput, drivingInput, type DrivingAction } from "../physics/useDrivingInput";
import { RacingPauseMenu } from "./RacingPauseMenu";
import { useAudioStore } from "../audio/useAudioStore";
import { ROUTE_POINTS } from "../environment/gentingRoute.mjs";
import styles from "./SimpleGameHUD.module.css";

const routePath = ROUTE_POINTS.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[2]}`).join(" ") + " Z";
const dialStart = 135;
const dialSweep = 225;
const rpmAngle = (rpm: number) => dialStart + Math.max(0, Math.min(8000, rpm)) / 8000 * dialSweep;
function dialPoint(radius: number, angle: number) {
  const radians = angle * Math.PI / 180;
  return [110 + Math.cos(radians) * radius, 110 + Math.sin(radians) * radius];
}
function dialArc(radius: number, from: number, to: number) {
  const a = dialPoint(radius, from), b = dialPoint(radius, to);
  return `M${a[0]} ${a[1]} A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${b[0]} ${b[1]}`;
}
const ticks = Array.from({ length: 41 }, (_, i) => {
  const angle = rpmAngle(i * 200);
  return { i, inner: dialPoint(i % 5 === 0 ? 82 : 88, angle), outer: dialPoint(95, angle), label: dialPoint(71, angle) };
});
const boostScale = 0.85;
// Keep the boost rim outside the RPM dial with a consistent gap as the HUD scales.
const boostCenter = dialPoint(96 + 37 * boostScale + 10, -56);
const boostTransform = `translate(${boostCenter[0] - 50 * boostScale} ${boostCenter[1] - 47 * boostScale}) scale(${boostScale})`;
const boostAngle = (boost: number) => 190 + (Math.max(-1, Math.min(2, boost)) + 1) / 3 * 240;
const boostPoint = (radius: number, angle: number) => {
  const radians = angle * Math.PI / 180;
  return [50 + Math.cos(radians) * radius, 47 + Math.sin(radians) * radius];
};
const boostArc = (from: number, to: number) => {
  const a = boostPoint(37, boostAngle(from)), b = boostPoint(37, boostAngle(to));
  return `M${a[0]} ${a[1]} A37 37 0 ${boostAngle(to) - boostAngle(from) > 180 ? 1 : 0} 1 ${b[0]} ${b[1]}`;
};
const boostTicks = Array.from({ length: 13 }, (_, i) => ({
  value: -1 + i / 4,
  inner: boostPoint(i % 4 === 0 ? 28 : 32, boostAngle(-1 + i / 4)),
  outer: boostPoint(37, boostAngle(-1 + i / 4)),
  label: boostPoint(22, boostAngle(-1 + i / 4)),
}));

function RacingTelemetry() {
  const mapId = useId().replace(/:/g, "");
  const map = useRef<SVGGElement>(null), car = useRef<SVGGElement>(null);
  const speed = useRef<SVGTextElement>(null), gear = useRef<SVGTextElement>(null);
  const needle = useRef<SVGGElement>(null), description = useRef<SVGDescElement>(null);
  const score = useRef<HTMLSpanElement>(null), multiplier = useRef<HTMLSpanElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const boostNeedle = useRef<SVGGElement>(null);
  useEffect(() => {
    let describedAt = 0;
    const update = () => {
      const state = useGameStore.getState();
      const speedValue = Math.round(Math.max(0, state.speed));
      const gearValue = state.gear === -1 ? "R" : state.gear === 0 ? "N" : String(state.gear);
      const idling = state.rpm <= 1200 && state.throttle < 0.02;
      const boost = !idling && Number.isFinite(state.boost) ? Math.max(-1, Math.min(2, state.boost)) : 0;
      boostNeedle.current?.setAttribute("transform", `rotate(${boostAngle(boost)} 50 47)`);
      if (speed.current) speed.current.textContent = String(speedValue).padStart(3, "0");
      if (gear.current) gear.current.textContent = gearValue;
      needle.current?.setAttribute("transform", `rotate(${rpmAngle(state.rpm)} 110 110)`);
      map.current?.setAttribute("transform", `translate(100 100) scale(0.28 -0.28) translate(${-state.positionX} ${-state.positionZ})`);
      car.current?.setAttribute("transform", `rotate(${state.heading * 180 / Math.PI} 100 100)`);
      if (score.current) score.current.textContent = Math.floor(state.score).toLocaleString();
      if (multiplier.current) {
        multiplier.current.textContent = state.drifting ? `DRIFT x${state.multiplier.toFixed(1)}` : "DRIFT SCORE";
      }
      ring.current?.setAttribute("stroke-dasharray", `${Math.min(100, state.multiplier / 5 * 100)} 100`);
      if (description.current && performance.now() - describedAt > 1000) {
        description.current.textContent = `${speedValue} kilometres per hour, gear ${gearValue}, ${Math.round(state.rpm)} RPM, turbo boost ${boost.toFixed(2)} bar.`;
        describedAt = performance.now();
      }
    };
    update(); return useGameStore.subscribe(update);
  }, []);
  return <>
    <div className={styles.score} aria-label="Drift score">
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r="24" fill="none" stroke="white" strokeOpacity=".2" strokeWidth="5" />
        <circle ref={ring} cx="30" cy="30" r="24" fill="none" stroke="#ffae39" strokeWidth="5" pathLength="100" strokeDasharray="20 100" transform="rotate(-90 30 30)" />
        <circle cx="30" cy="30" r="16" fill="#1a363e" fillOpacity=".35" stroke="white" strokeWidth="1.5" />
        <path d="m30 18 3.3 8.2 8.7.7-6.7 5.7 2.1 8.5-7.4-4.6-7.4 4.6 2.1-8.5-6.7-5.7 8.7-.7Z" fill="white" transform="translate(5 5) scale(.83)" />
      </svg>
      <span ref={score} className={styles.scoreNumber}>0</span>
      <span ref={multiplier} className={styles.scoreLabel}>DRIFT SCORE</span>
    </div>
    <div className={styles.minimap}>
      <svg viewBox="0 0 200 200" role="img" aria-label="GPX route minimap, north up. Your car is the cyan arrow.">
        <defs><clipPath id={mapId}><circle cx="100" cy="100" r="89" /></clipPath></defs>
        <circle cx="100" cy="100" r="90" fill="#16272a" fillOpacity=".2" stroke="white" strokeOpacity=".3" />
        <g clipPath={`url(#${mapId})`}>
          <path d="M0 65H200M0 135H200M65 0V200M135 0V200" stroke="white" strokeOpacity=".08" />
          <g ref={map} transform="translate(100 100) scale(.28 -.28)">
            <path d={routePath} fill="none" stroke="#1c282a" strokeOpacity=".4" strokeWidth="8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            <path d={routePath} fill="none" stroke="white" strokeOpacity=".88" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </g>
        </g>
        <text x="100" y="25" textAnchor="middle" fill="white" fontSize="11">N</text>
        <circle cx="100" cy="100" r="12" fill="#11262c" fillOpacity=".45" />
        <g ref={car}><path d="m100 88 8 19-8-4-8 4Z" fill="#37e5e7" stroke="white" strokeWidth="2" /></g>
      </svg>
      <p>GENTING HIGHLANDS</p>
    </div>
    <div className={styles.gauge}>
      <svg viewBox="0 0 225 210" role="img" aria-label="Speedometer">
        <desc ref={description}>Speed in kilometres per hour, gear, engine RPM and turbo boost in bar.</desc>
        <g transform={boostTransform} aria-hidden="true">
        <path d={boostArc(-1, 2)} fill="none" stroke="white" strokeOpacity=".4" strokeWidth="2" />
        <path d={boostArc(1.5, 2)} fill="none" stroke="#ef3154" strokeWidth="3" />
        {boostTicks.map(t => <g key={t.value}>
          <line x1={t.inner[0]} y1={t.inner[1]} x2={t.outer[0]} y2={t.outer[1]} stroke={t.value >= 1.5 ? "#ff4164" : "white"} strokeWidth={Number.isInteger(t.value) ? 2 : 1} />
          {Number.isInteger(t.value) && <text x={t.label[0]} y={t.label[1] + 3} textAnchor="middle" fill="white" fontSize="8">{t.value}</text>}
        </g>)}
        <g ref={boostNeedle} transform={`rotate(${boostAngle(0)} 50 47)`}><path d="M46 45.8 83 47 46 48.2Z" fill="white" /></g>
        <circle cx="50" cy="47" r="3" fill="#3ce4e4" />
        </g>
        <path d={`${dialArc(91, dialStart, dialStart + dialSweep)} L110 110 Z`} fill="#15252c" fillOpacity=".08" />
        <path d={dialArc(96, dialStart, dialStart + dialSweep)} fill="none" stroke="white" strokeOpacity=".2" strokeWidth="5" />
        <path d={dialArc(96, rpmAngle(7000), rpmAngle(8000))} fill="none" stroke="#ef3154" strokeWidth="7" />
        {ticks.map(t => <g key={t.i}>
          <line x1={t.inner[0]} y1={t.inner[1]} x2={t.outer[0]} y2={t.outer[1]} stroke={t.i >= 35 ? "#ff4164" : "white"} strokeOpacity={t.i % 5 === 0 ? 1 : .65} strokeWidth={t.i % 5 === 0 ? 3 : 1.5} />
          {t.i % 5 === 0 && <text x={t.label[0]} y={t.label[1] + 4} textAnchor="middle" fill="white" fontSize="11">{t.i / 5}</text>}
        </g>)}
        <g ref={needle} transform={`rotate(${rpmAngle(950)} 110 110)`}><path d="M124 108 195 110 124 112Z" fill="white" /></g>
        <text x="110" y="87" textAnchor="middle" fill="white" opacity=".6" fontSize="8" letterSpacing="1">RPM x1000</text>
        <circle cx="110" cy="110" r="18" fill="#17363e" fillOpacity=".25" stroke="#3ce4e4" strokeWidth="2" />
        <text ref={gear} x="108" y="110" textAnchor="middle" dominantBaseline="central" fill="#3ce4e4" fontSize="25" fontStyle="italic">1</text>
        <text x="196" y="140" textAnchor="end" fill="white" fontSize="10" fontStyle="italic">KM/H</text>
        <text ref={speed} x="196" y="192" textAnchor="end" fill="white" fontSize="61" fontWeight="300" fontStyle="italic" letterSpacing="-3" textLength="106" lengthAdjust="spacingAndGlyphs">000</text>
      </svg>
    </div>
  </>;
}

function TouchControl({ action, children }: { action: DrivingAction; children: React.ReactNode }) {
  const release = () => { drivingInput[action] = false; };
  return <button className={styles.touchButton} aria-label={action} onPointerDown={event => {
    event.currentTarget.setPointerCapture(event.pointerId); drivingInput[action] = true;
  }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>{children}</button>;
}

export function SimpleGameHUD({ onGarage }: { onGarage: () => void }) {
  const paused = useGameStore(state => state.paused);
  const audioStatus = useAudioStore(state => state.status);
  useEffect(() => { initAssistFromStorage(); }, []);
  useEffect(() => {
    if (paused) clearDrivingInput();
  }, [paused]);
  return <div className={styles.hud}>
    {!paused && <>
      <div className={styles.routeMessage}><span><MapPin size={17} /></span><p>Genting Highlands<span>Mountain loop / free run</span></p></div>
      <RacingTelemetry />
      <button className={styles.pause} onClick={() => useGameStore.getState().setPaused(true)} aria-label="Pause and settings" title="Pause / Esc"><Pause size={20} /></button>
      {audioStatus === "locked" && <button className={styles.enableSound} onClick={() => { useAudioStore.setState({ muted: false }); window.dispatchEvent(new Event("genting-enable-audio")); }}><Volume2 size={14} /> Enable sound</button>}
      <div className={styles.touchControls}>
        <div><TouchControl action="left"><ArrowLeft size={20} /></TouchControl><TouchControl action="right"><ArrowRight size={20} /></TouchControl></div>
        <div><TouchControl action="brake">Brake</TouchControl><TouchControl action="handbrake">Drift</TouchControl><TouchControl action="throttle">Gas</TouchControl></div>
      </div>
    </>}
    {paused && <RacingPauseMenu onGarage={onGarage} />}
  </div>;
}
