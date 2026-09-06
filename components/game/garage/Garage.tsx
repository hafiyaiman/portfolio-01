"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, Html, OrbitControls } from "@react-three/drei";
import { Group } from "three";
import { SilviaModel } from "../models/SilviaModel";
import { S15 } from "../physics/s15Physics";
import { CATALOG, CATEGORIES, DEFAULT_BUILD, PAINTS, validateBuild, type Build, type Category } from "./catalog";
import { useGarageStore } from "./useGarageStore";

function Preview({ build }: { build: Build }) {
  const wheels = useRef<(Group | null)[]>([]);
  return <group position={[0, S15.cgHeight, 0]}><SilviaModel wheels={wheels} build={build} /></group>;
}
const button = "border border-white/25 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:border-lime-300 hover:text-lime-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300";

export default function Garage({ onClose }: { onClose: () => void }) {
  const [build, setBuild] = useState(() => validateBuild(useGarageStore.getState().build));
  const [category, setCategory] = useState<Category>("front");
  return <section aria-label="Silvia customization garage" className="absolute inset-0 z-40 flex flex-col overflow-auto bg-zinc-950 text-zinc-100"
    style={{ backgroundImage: "radial-gradient(ellipse at 50% 25%, #283132 0%, #09090b 70%)" }}>
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/15 px-5 py-4 md:px-10">
      <div><p className="font-mono text-[10px] uppercase tracking-[0.3em] text-lime-300">Genting / After hours</p>
        <h1 className="text-3xl font-black uppercase italic tracking-tight">The workshop<span className="ml-3 text-sm not-italic text-zinc-500">01</span></h1></div>
      <button className={button} onClick={onClose}>Cancel / back</button>
    </header>
    <div className="relative min-h-64 flex-1">
      <div className="pointer-events-none absolute left-5 top-4 z-10 md:left-10">
        <p className="text-xs tracking-[0.2em] text-zinc-400">NISSAN</p><h2 className="text-2xl font-black uppercase italic">Silvia S15</h2>
        <p className="mt-1 font-mono text-[10px] text-zinc-400">SR20DET / REAR-WHEEL DRIVE</p>
      </div>
      <Canvas dpr={[1, 1.5]} camera={{ position: [5, 2.6, 5], fov: 42 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 6, 4]} intensity={3} color="#e9faff" />
        <directionalLight position={[-4, 3, -3]} intensity={2} color="#c9d63a" />
        <pointLight position={[0, 4, 0]} intensity={35} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#151b1c" roughness={0.4} metalness={0.3} /></mesh>
        <Grid args={[16, 16]} cellSize={1} cellThickness={0.5} cellColor="#283333" sectionSize={4} sectionColor="#526047" fadeDistance={18} position={[0, -0.01, 0]} />
        <Suspense fallback={<Html center><p className="whitespace-nowrap bg-zinc-950 p-4 font-mono text-xs text-white">Loading body shop...</p></Html>}><Preview build={build} /></Suspense>
        <OrbitControls makeDefault target={[0, 0.65, 0]} minDistance={3.5} maxDistance={9} maxPolarAngle={Math.PI / 2 - 0.03} enablePan={false} />
      </Canvas>
      <p className="pointer-events-none absolute bottom-3 right-5 font-mono text-[10px] uppercase tracking-widest text-zinc-400">Drag to orbit / scroll to zoom</p>
    </div>
    <div className="shrink-0 border-t border-white/15 bg-zinc-950/95 px-5 py-4 md:px-10">
      <div className="flex items-center gap-2 overflow-x-auto pb-2" aria-label="Part categories">
        {CATEGORIES.map(key => <button key={key} aria-pressed={key === category} className={`${button} shrink-0 ${key === category ? "bg-lime-300 !text-black" : ""}`} onClick={() => setCategory(key)}>{CATALOG[key].label}</button>)}
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2" aria-label={CATALOG[category].label}>
        {CATALOG[category].options.map((option, index) => <button key={`${category}-${index}`} aria-pressed={build.parts[category] === index}
          onClick={() => setBuild(current => ({ ...current, parts: { ...current.parts, [category]: index } }))}
          className={`min-w-36 border p-3 text-left ${build.parts[category] === index ? "border-lime-300 bg-lime-300/10" : "border-white/20 hover:border-white/60"} focus-visible:outline-2 focus-visible:outline-lime-300`}>
          <span className="font-mono text-[10px] text-zinc-400">{String(index + 1).padStart(2, "0")} / BODY SHOP</span>
          <span className="mt-1 block text-sm font-bold uppercase">{option.name}</span>
          <span className="mt-1 block text-[10px] text-lime-300">{build.parts[category] === index ? "FITTED" : "PREVIEW PART"}</span>
        </button>)}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2" aria-label="Body paint"><span className="mr-2 text-xs uppercase tracking-widest text-zinc-400">Paint</span>
          {PAINTS.map(paint => <button key={paint.color} title={paint.name} aria-label={paint.name} aria-pressed={build.paint === paint.color}
            className={`h-9 w-9 border-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300 ${build.paint === paint.color ? "border-lime-300 ring-2 ring-lime-300/30" : "border-white/30"}`}
            style={{ backgroundColor: paint.color }} onClick={() => setBuild(current => ({ ...current, paint: paint.color }))} />)}
        </div>
        <div className="flex gap-2"><button className={button} onClick={() => setBuild(DEFAULT_BUILD)}>Original build</button>
          <button className={`${button} bg-lime-300 !text-black`} onClick={() => { useGarageStore.getState().save(build); onClose(); }}>Fit &amp; drive</button></div>
      </div>
      <p className="mt-3 text-[10px] text-zinc-500">Cosmetic parts only. Fit &amp; drive saves this build on this browser and respawns at the mountain start.</p>
    </div>
  </section>;
}
