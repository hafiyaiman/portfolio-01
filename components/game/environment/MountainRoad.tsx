"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Html } from "@react-three/drei";
import { DoubleSide, InstancedMesh, Object3D, SpotLight } from "three";
import { createBarrier, createRoadStrip, createTerrain, ROAD_LENGTH, ROAD_WIDTH, roadFrame, ROUTE_INFO } from "./track";
import { ROUTE_POINTS } from "./gentingRoute.mjs";

const lamps = Array.from({ length: Math.ceil(ROAD_LENGTH / 90) }, (_, i) => {
  const frame = roadFrame(i * 90 / ROAD_LENGTH);
  return { position: frame.point.clone().addScaledVector(frame.right, 6.5), target: frame.point };
});
const trees = Array.from({ length: Math.ceil(ROAD_LENGTH / 8) }, (_, i) => {
  const { point, right } = roadFrame(i * 8 / ROAD_LENGTH);
  point.addScaledVector(right, (i % 2 ? 1 : -1) * (18 + i * 13 % 48));
  // Do not place trees onto nearby switchback segments.
  if (ROUTE_POINTS.some(p => Math.hypot(p[0] - point.x, p[2] - point.z) < 10)) return null;
  return { point, size: 8 + i * 7 % 11 };
}).filter(tree => tree !== null);

function SceneryInstances() {
  const foliage = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);
  const poles = useRef<InstancedMesh>(null);
  useEffect(() => {
    const object = new Object3D();
    trees.forEach(({ point, size }, i) => {
      object.position.set(point.x, point.y + size * 0.25, point.z);
      object.scale.set(size * 0.4, size, size * 0.4); object.updateMatrix();
      foliage.current?.setMatrixAt(i, object.matrix);
      object.position.set(point.x, point.y - 20, point.z);
      object.scale.set(0.3, 48, 0.3); object.updateMatrix();
      trunks.current?.setMatrixAt(i, object.matrix);
    });
    lamps.forEach(({ position }, i) => {
      object.position.copy(position); object.position.y += 4.5;
      object.scale.set(0.12, 9, 0.12); object.updateMatrix();
      poles.current?.setMatrixAt(i, object.matrix);
    });
    for (const mesh of [foliage.current, trunks.current, poles.current]) if (mesh) {
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    }
  }, []);
  return <>
    <instancedMesh ref={foliage} args={[undefined, undefined, trees.length]}><coneGeometry args={[1, 1, 6]} /><meshStandardMaterial color="#29483a" flatShading /></instancedMesh>
    <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]}><cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial color="#3a4032" /></instancedMesh>
    <instancedMesh ref={poles} args={[undefined, undefined, lamps.length]}><cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial color="#586365" /></instancedMesh>
  </>;
}

function NearbyLights() {
  const refs = useRef<(SpotLight | null)[]>([]);
  const [targets] = useState(() => Array.from({ length: 3 }, () => new Object3D()));
  const elapsed = useRef(1);
  useFrame(({ camera }, dt) => {
    elapsed.current += dt;
    if (elapsed.current < 0.3) return;
    elapsed.current = 0;
    const nearest = lamps.map((lamp, index) => ({ index, distance: lamp.position.distanceToSquared(camera.position) }))
      .sort((a, b) => a.distance - b.distance).slice(0, 3);
    nearest.forEach(({ index }, i) => {
      const light = refs.current[i];
      if (!light) return;
      light.position.copy(lamps[index].position); light.position.y += 8.5;
      targets[i].position.copy(lamps[index].target); targets[i].updateMatrixWorld();
    });
  });
  return targets.map((target, i) => <group key={i}>
    <primitive object={target} />
    <spotLight ref={node => { refs.current[i] = node; }} target={target} color="#ffda91" intensity={90} distance={35} angle={0.7} penumbra={0.65} />
  </group>);
}

function RouteSign({ t, title, subtitle }: { t: number; title: string; subtitle: string }) {
  const { point, tangent, right } = roadFrame(t);
  const p = point.clone().addScaledVector(right, -7.2);
  return <group position={[p.x, p.y + 2.5, p.z]} rotation={[0, Math.atan2(tangent.x, tangent.z) + Math.PI, 0]}>
    <mesh><boxGeometry args={[5.2, 1.8, 0.15]} /><meshStandardMaterial color="#145645" /></mesh>
    <Html transform position={[0, 0, 0.09]} distanceFactor={4} zIndexRange={[0, 0]} style={{ pointerEvents: "none" }}>
      <div className="w-48 border-2 border-white bg-emerald-900 p-2 text-center font-mono text-white"><b className="text-sm">{title}</b><p className="mt-1 text-[9px]">{subtitle}</p></div>
    </Html>
  </group>;
}

export function MountainRoad() {
  const [geometry] = useState(() => ({ road: createRoadStrip(ROAD_WIDTH), shoulder: createRoadStrip(14, 0, -0.08),
    left: createRoadStrip(0.12, -4.6, 0.015), right: createRoadStrip(0.12, 4.6, 0.015), center: createRoadStrip(0.1, 0, 0.018),
    leftBarrier: createBarrier(-1), rightBarrier: createBarrier(1), terrain: createTerrain() }));
  useEffect(() => () => Object.values(geometry).forEach(item => item.dispose()), [geometry]);
  const finish = roadFrame(1);
  return <>
    <fogExp2 attach="fog" args={["#728684", 0.005]} />
    <color attach="background" args={["#728684"]} />
    <hemisphereLight args={["#c3d5de", "#253c30", 1.7]} />
    <directionalLight position={[40, 90, -30]} intensity={2.3} color="#d6e5eb" />
    <RigidBody type="fixed" colliders="trimesh" friction={0.7}>
      <mesh geometry={geometry.road}><meshPhysicalMaterial color="#303c40" roughness={0.28} metalness={0.2} clearcoat={1} /></mesh>
      <mesh geometry={geometry.shoulder}><meshStandardMaterial color="#435044" roughness={0.95} /></mesh>
    </RigidBody>
    <RigidBody type="fixed" colliders="trimesh" friction={0.25}>
      {[geometry.leftBarrier, geometry.rightBarrier].map((wall, i) => <mesh key={i} geometry={wall}><meshStandardMaterial color="#919a92" side={DoubleSide} metalness={0.4} roughness={0.5} /></mesh>)}
    </RigidBody>
    {[geometry.left, geometry.right, geometry.center].map((strip, i) => <mesh key={i} geometry={strip}><meshStandardMaterial color={i === 2 ? "#e0bb65" : "#d4d6cb"} /></mesh>)}
    <mesh geometry={geometry.terrain}><meshStandardMaterial color="#354d3e" flatShading /></mesh>
    <SceneryInstances /><NearbyLights />
    <RouteSign t={30 / ROAD_LENGTH} title="GENTING HIGHLANDS" subtitle={`${(ROUTE_INFO.lengthMeters / 1000).toFixed(1)} KM / GPX UPHILL`} />
    <RouteSign t={1 - 35 / ROAD_LENGTH} title="ROUTE COMPLETE" subtitle="END OF GPX / PRESS R TO RESTART" />
    <RigidBody type="fixed" colliders={false} position={[finish.point.x, finish.point.y + 0.6, finish.point.z]} rotation={[0, Math.atan2(finish.tangent.x, finish.tangent.z), 0]}>
      <CuboidCollider args={[7, 0.7, 0.25]} />
      <mesh><boxGeometry args={[14, 1.2, 0.4]} /><meshStandardMaterial color="#d0b652" /></mesh>
    </RigidBody>
  </>;
}
