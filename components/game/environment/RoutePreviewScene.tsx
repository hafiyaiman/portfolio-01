"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import type { Alignment } from "./RoutePreview";
import { GENTING_ASSETS } from "./gentingAssets";

function Loading() {
  const { progress } = useProgress();
  return <Html center><p role="status" className="w-64 bg-zinc-950/90 p-4 text-center text-white">Loading scenery {Math.round(progress)}%</p></Html>;
}

function Model({ scale }: { scale: number }) {
  const { scene } = useGLTF(GENTING_ASSETS.preview);
  return <primitive object={scene} scale={scale} dispose={null} />;
}

export default function RoutePreviewScene({ data, overlay }: { data: Alignment; overlay: boolean }) {
  const first = data.points[0];
  return <Canvas dpr={[1, 1.5]} camera={{ position: [1700, 1800, 1900], fov: 48, near: 0.5, far: 10000 }} fallback={<p className="p-8">WebGL is unavailable.</p>}>
    <color attach="background" args={["#b8c9ce"]} />
    <hemisphereLight args={["#fff8e4", "#667b62", 2]} />
    <directionalLight position={[800, 1800, 600]} intensity={2} />
    <Suspense fallback={<Loading />}>
      <Model scale={data.report.scale} />
      {overlay && <>
        <Line points={data.points.map(([x, y, z]) => [x, y + 1.5, z])} color="#ffee42" lineWidth={3} />
        {data.steepSegments.map(({ sampleIndex }) => <Line key={sampleIndex}
          points={[data.points[sampleIndex - 1], data.points[sampleIndex]].map(([x, y, z]) => [x, y + 2, z])}
          color="#ff7526" lineWidth={5} />)}
        <mesh position={[first[0], first[1] + 9, first[2]]}><sphereGeometry args={[8, 16, 12]} /><meshBasicMaterial color="#42ff8b" /></mesh>
        {data.missing.filter((_, i) => i % 4 === 0).map(index => {
          const p = data.points[index];
          return <mesh key={index} position={[p[0], p[1] + 4, p[2]]}><sphereGeometry args={[4, 8, 6]} /><meshBasicMaterial color="#ff493b" /></mesh>;
        })}
      </>}
    </Suspense>
    <OrbitControls makeDefault target={[0, 230, 0]} maxDistance={5000} minDistance={8} />
  </Canvas>;
}
