"use client";
// @refresh reset

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { BlenderMountain } from "./environment/BlenderMountain";
import { nearestRoadFrame, SPAWN, SPAWN_YAW } from "./environment/track";
import { CarController } from "./physics/CarController";
import { PHYSICS_DT } from "./physics/driftMath";
import { useGameStore } from "./stores/useGameStore";
import { Html } from "@react-three/drei";

const route = { spawn: SPAWN, spawnYaw: SPAWN_YAW, nearestFrame: nearestRoadFrame };

function LoadingCar() {
  // LoadingManager can publish synchronously during useGLTF's render. Keep this
  // Suspense fallback independent of its progress store to avoid cross-render updates.
  return <Html center><div role="status" className="w-60 border-2 border-white/70 bg-zinc-900 p-5 text-center font-mono text-sm text-white">Loading mountain pass and Silvia S15...</div></Html>;
}

export default function GameCanvas() {
  const paused = useGameStore((state) => state.paused);
  const resetId = useGameStore((state) => state.resetId);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return <Canvas dpr={1} frameloop={hidden ? "never" : paused ? "demand" : "always"} camera={{ fov: 58, near: 0.1, far: 750 }} gl={{ antialias: false, powerPreference: "high-performance" }} fallback={<div className="p-12 text-white">WebGL is unavailable. Enable hardware acceleration and reload.</div>}>
    <Suspense fallback={<LoadingCar />}>
      {/* Physics/interpolation must finish before the follow camera (-2) and controls (-1). */}
      <Physics updatePriority={-3} timeStep={PHYSICS_DT} paused={paused || hidden} gravity={[0, -9.81, 0]}>
        <BlenderMountain />
        <CarController key={resetId} route={route} />
      </Physics>
    </Suspense>
  </Canvas>;
}
