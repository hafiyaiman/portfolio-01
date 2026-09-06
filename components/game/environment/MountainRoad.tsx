"use client";
// Recreate GPU geometry after scene edits instead of retaining the old meshes.
// @refresh reset

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { Html } from "@react-three/drei";
import { DoubleSide, InstancedMesh, Object3D, SpotLight } from "three";
import { createBarrier, createRoadVerge, createRoadStrip, createTerrain, ROAD_LENGTH, ROAD_WIDTH, roadFrame, ROUTE_INFO, SPAWN_DISTANCE, terrainHeightAt } from "./track";
import { ROUTE_POINTS } from "./gentingRoute.mjs";
import { KilometrePosts } from "./KilometrePosts";

const lamps = Array.from({ length: Math.ceil(ROAD_LENGTH / 90) }, (_, i) => {
  const frame = roadFrame(i * 90 / ROAD_LENGTH);
  return { position: frame.point.clone().addScaledVector(frame.right, 6.5), target: frame.point };
});
const trees = Array.from({ length: Math.ceil(ROAD_LENGTH / 8) }, (_, i) => {
  const { point, right } = roadFrame(i * 8 / ROAD_LENGTH);
  point.addScaledVector(right, (i % 2 ? 1 : -1) * (18 + i * 13 % 48));
  point.y = terrainHeightAt(point.x, point.z);
  // Do not place trees onto nearby switchback segments.
  if (ROUTE_POINTS.some(p => Math.hypot(p[0] - point.x, p[2] - point.z) < 23)) return null;
  return { point, size: 8 + i * 7 % 11 };
}).filter(tree => tree !== null);
const rocks = Array.from({ length: Math.ceil(ROAD_LENGTH / 36) }, (_, i) => {
  const { point, right } = roadFrame((i * 36 + 18) / ROAD_LENGTH);
  const side = i % 2 ? 1 : -1;
  point.addScaledVector(right, side * (10 + (i * 17) % 34));
  point.y = terrainHeightAt(point.x, point.z);
  if (ROUTE_POINTS.some(p => Math.hypot(p[0] - point.x, p[2] - point.z) < 21)) return null;
  return { point, size: 2.5 + (i * 11) % 5, rotation: (i * 1.7) % Math.PI };
}).filter(rock => rock !== null);
const summit = roadFrame(0.88);

function SceneryInstances() {
  const foliage = useRef<InstancedMesh>(null);
  const canopy = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);
  const poles = useRef<InstancedMesh>(null);
  const rockMeshes = useRef<InstancedMesh>(null);
  useEffect(() => {
    const object = new Object3D();
    trees.forEach(({ point, size }, i) => {
      object.position.set(point.x, point.y + size * 0.65, point.z);
      object.scale.set(size * 0.38, size * 0.35, size * 0.42); object.updateMatrix();
      foliage.current?.setMatrixAt(i, object.matrix);
      object.position.y += size * 0.2;
      object.position.x += size * 0.15;
      object.scale.set(size * 0.35, size * 0.3, size * 0.36); object.updateMatrix();
      canopy.current?.setMatrixAt(i, object.matrix);
      object.position.set(point.x, point.y + size * 0.3, point.z);
      object.scale.set(size * 0.023, size * 0.65, size * 0.023); object.updateMatrix();
      trunks.current?.setMatrixAt(i, object.matrix);
    });
    lamps.forEach(({ position }, i) => {
      object.position.copy(position); object.position.y += 4.5;
      object.scale.set(0.12, 9, 0.12); object.updateMatrix();
      poles.current?.setMatrixAt(i, object.matrix);
    });
    rocks.forEach(({ point, size, rotation }, i) => {
      object.position.set(point.x, point.y + size * 0.3, point.z);
      object.rotation.set(0, rotation, 0.15);
      object.scale.set(size * 1.5, size * 0.8, size);
      object.updateMatrix();
      rockMeshes.current?.setMatrixAt(i, object.matrix);
    });
    for (const mesh of [foliage.current, canopy.current, trunks.current, poles.current, rockMeshes.current]) if (mesh) {
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    }
  }, []);
  return <>
    <instancedMesh ref={foliage} args={[undefined, undefined, trees.length]}><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color="#365d30" roughness={1} /></instancedMesh>
    <instancedMesh ref={canopy} args={[undefined, undefined, trees.length]}><icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color="#52733b" roughness={1} /></instancedMesh>
    <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]}><cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial color="#3a4032" /></instancedMesh>
    <instancedMesh ref={poles} args={[undefined, undefined, lamps.length]}><cylinderGeometry args={[1, 1, 1, 5]} /><meshStandardMaterial color="#586365" /></instancedMesh>
    <instancedMesh ref={rockMeshes} args={[undefined, undefined, rocks.length]}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#454b47" roughness={0.95} flatShading /></instancedMesh>
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

function SummitResort() {
  return <group position={[summit.point.x + 90, summit.point.y + 26, summit.point.z - 55]} rotation={[0, -0.25, 0]}>
    <mesh position={[0, 18, 0]}><boxGeometry args={[74, 36, 22]} /><meshStandardMaterial color="#d7d0bf" roughness={0.8} /></mesh>
    <mesh position={[0, 38, 0]}><boxGeometry args={[78, 5, 24]} /><meshStandardMaterial color="#8e3631" roughness={0.7} /></mesh>
    {[-30, -15, 0, 15, 30].map(x => <mesh key={x} position={[x, 20, -11.5]}><boxGeometry args={[7, 20, 0.2]} /><meshStandardMaterial color="#7c9ca0" metalness={0.25} roughness={0.35} /></mesh>)}
    <mesh position={[0, 57, 0]}><cylinderGeometry args={[7, 11, 27, 8]} /><meshStandardMaterial color="#8a302d" roughness={0.7} /></mesh>
    <mesh position={[0, 74, 0]}><coneGeometry args={[10, 12, 8]} /><meshStandardMaterial color="#2f5143" roughness={0.8} /></mesh>
  </group>;
}

function HighlandMist() {
  return <>
    {[-1, 0, 1].map(i => <mesh key={i} position={[summit.point.x + i * 150, summit.point.y + 55 + Math.abs(i) * 18, summit.point.z + 80]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[220, 46]} />
      <meshBasicMaterial color="#d8e5df" transparent opacity={0.1} depthWrite={false} />
    </mesh>)}
  </>;
}

export function MountainRoad() {
  const [geometry] = useState(() => ({ road: createRoadStrip(ROAD_WIDTH), shoulder: createRoadStrip(14, 0, -0.08),
    verge: createRoadVerge(),
    left: createRoadStrip(0.12, -4.6, 0.015), right: createRoadStrip(0.12, 4.6, 0.015), center: createRoadStrip(0.1, 0, 0.018),
    leftBarrier: createBarrier(-1), rightBarrier: createBarrier(1), terrain: createTerrain() }));
  useEffect(() => () => Object.values(geometry).forEach(item => item.dispose()), [geometry]);
  const finish = roadFrame(1);
  return <>
    <fogExp2 attach="fog" args={["#b6cbd1", 0.0015]} />
    <color attach="background" args={["#b6cbd1"]} />
    <hemisphereLight args={["#c3d5de", "#253c30", 1.7]} />
    <directionalLight position={[40, 90, -30]} intensity={2.3} color="#d6e5eb" />
    <RigidBody type="fixed" colliders="trimesh" friction={0.7}>
      <mesh geometry={geometry.road}><meshPhysicalMaterial color="#555b59" roughness={0.92} metalness={0} clearcoat={0} /></mesh>
      <mesh geometry={geometry.shoulder}><meshStandardMaterial color="#435044" roughness={0.95} /></mesh>
    </RigidBody>
    <mesh geometry={geometry.verge}><meshStandardMaterial color="#65704e" roughness={1} side={DoubleSide} /></mesh>
    <RigidBody type="fixed" colliders="trimesh" friction={0.25}>
      {[geometry.leftBarrier, geometry.rightBarrier].map((wall, i) => <mesh key={i} geometry={wall}><meshStandardMaterial color="#919a92" side={DoubleSide} metalness={0.4} roughness={0.5} /></mesh>)}
    </RigidBody>
    {[geometry.left, geometry.right, geometry.center].map((strip, i) => <mesh key={i} geometry={strip}><meshStandardMaterial color={i === 2 ? "#e0bb65" : "#d4d6cb"} /></mesh>)}
    <mesh geometry={geometry.terrain}><meshStandardMaterial vertexColors roughness={1} /></mesh>
    <SceneryInstances /><NearbyLights /><SummitResort /><HighlandMist /><KilometrePosts />
    <RouteSign t={(SPAWN_DISTANCE + 18) / ROAD_LENGTH} title="GENTING HIGHLANDS" subtitle={`${(ROUTE_INFO.lengthMeters / 1000).toFixed(1)} KM / ${ROUTE_INFO.closed ? 'LOOP CIRCUIT' : 'GPX UPHILL'}`} />
    {!ROUTE_INFO.closed && <RouteSign t={1 - 35 / ROAD_LENGTH} title="ROUTE COMPLETE" subtitle="END OF GPX / PRESS R TO RESTART" />}
    {!ROUTE_INFO.closed && <RigidBody type="fixed" colliders={false} position={[finish.point.x, finish.point.y + 0.6, finish.point.z]} rotation={[0, Math.atan2(finish.tangent.x, finish.tangent.z), 0]}>
      <CuboidCollider args={[7, 0.7, 0.25]} />
      <mesh><boxGeometry args={[14, 1.2, 0.4]} /><meshStandardMaterial color="#d0b652" /></mesh>
    </RigidBody>}
  </>;
}
