"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { MountainRoad } from "./environment/MountainRoad";
import { CarController } from "./physics/CarController";
import { PHYSICS_DT } from "./physics/driftMath";
import { useGameStore } from "./stores/useGameStore";
import { Html } from "@react-three/drei";

function LoadingCar() {
  // LoadingManager can publish synchronously during useGLTF's render. Keep this
  // Suspense fallback independent of its progress store to avoid cross-render updates.
  return <Html center><div role="status" className="w-60 border-2 border-white/70 bg-zinc-900 p-5 text-center font-mono text-sm text-white">Loading Silvia S15...</div></Html>;
}

export default function GameCanvas() {
  const paused = useGameStore((state) => state.paused);
  const resetId = useGameStore((state) => state.resetId);
  return <Canvas dpr={[1, 1.5]} camera={{ fov: 58, near: 0.1, far: 700 }} gl={{ antialias: true, powerPreference: "high-performance" }} fallback={<div className="p-12 text-white">WebGL is unavailable. Enable hardware acceleration and reload.</div>}>
    <Suspense fallback={<LoadingCar />}>
      <Physics timeStep={PHYSICS_DT} paused={paused} gravity={[0, -9.81, 0]}>
        <MountainRoad />
        <CarController key={resetId} />
      </Physics>
    </Suspense>
  </Canvas>;
}
