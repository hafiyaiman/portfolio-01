"use client";
// @refresh reset

import { useEffect, useMemo, useRef, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  FileLoader,
  Mesh,
  MeshStandardMaterial,
  DoubleSide,
  Color,
  Object3D,
  InstancedMesh,
  SpotLight,
} from "three";
import { RigidBody, TrimeshCollider, CuboidCollider } from "@react-three/rapier";
import { Html } from "@react-three/drei";
import { GENTING_ASSETS } from "./gentingAssets";
import {
  DEFAULT_MOUNTAIN_THEME,
  type MountainTheme,
} from "./mountainTheme";
import {
  createBarrier,
  createWBeamGuardrail,
  createShoulderLine,
  createCenterMarkings,
  createYellowRumbleStrips,
  createRoadCurb,
  guardRailPostPositions,
  catEyePositions,
  ROAD_LENGTH,
  roadFrame,
  ROUTE_INFO,
  SPAWN_DISTANCE,
} from "./track";
import { KilometrePosts } from "./KilometrePosts";

const lamps = Array.from({ length: Math.ceil(ROAD_LENGTH / 90) }, (_, i) => {
  const frame = roadFrame((i * 90) / ROAD_LENGTH);
  return {
    position: frame.point.clone().addScaledVector(frame.right, 6.5),
    target: frame.point,
  };
});

function MalaysianRoadInstances({ theme }: { theme: MountainTheme }) {
  const guardrailPosts = useRef<InstancedMesh>(null);
  const catEyes = useRef<InstancedMesh>(null);
  const poles = useRef<InstancedMesh>(null);

  useEffect(() => {
    const object = new Object3D();
    lamps.forEach(({ position }, i) => {
      object.position.copy(position);
      object.position.y += 4.5;
      object.scale.set(0.12, 9, 0.12);
      object.updateMatrix();
      poles.current?.setMatrixAt(i, object.matrix);
    });

    // Guardrail posts: galvanized steel sections
    guardRailPostPositions.forEach(({ position }, i) => {
      object.rotation.set(0, 0, 0);
      object.position.set(position.x, position.y + 0.325, position.z);
      object.scale.set(0.14, 0.65, 0.08);
      object.updateMatrix();
      guardrailPosts.current?.setMatrixAt(i, object.matrix);
    });

    // Cat-eye reflectors: roadside reflectors
    catEyePositions.forEach(({ position }, i) => {
      object.rotation.set(0, 0, 0);
      object.position.set(position.x, position.y, position.z);
      object.scale.set(0.07, 0.025, 0.05);
      object.updateMatrix();
      catEyes.current?.setMatrixAt(i, object.matrix);
    });

    for (const mesh of [guardrailPosts.current, catEyes.current, poles.current]) {
      if (mesh) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
  }, []);

  return (
    <>
      <instancedMesh
        ref={guardrailPosts}
        args={[undefined, undefined, guardRailPostPositions.length]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={theme.markings.guardrails.color}
          metalness={theme.markings.guardrails.metalness}
          roughness={theme.markings.guardrails.roughness}
        />
      </instancedMesh>
      <instancedMesh
        ref={catEyes}
        args={[undefined, undefined, catEyePositions.length]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={theme.markings.catEyes.color}
          emissive={theme.markings.catEyes.emissive}
          emissiveIntensity={theme.markings.catEyes.emissiveIntensity}
          roughness={0.2}
        />
      </instancedMesh>
      <instancedMesh ref={poles} args={[undefined, undefined, lamps.length]}>
        <cylinderGeometry args={[1, 1, 1, 5]} />
        <meshStandardMaterial color="#586365" roughness={0.7} />
      </instancedMesh>
    </>
  );
}

function RouteSign({
  t,
  title,
  subtitle,
}: {
  t: number;
  title: string;
  subtitle: string;
}) {
  const { point, tangent, right } = roadFrame(t);
  const p = point.clone().addScaledVector(right, -7.2);
  return (
    <group
      position={[p.x, p.y + 2.5, p.z]}
      rotation={[0, Math.atan2(tangent.x, tangent.z) + Math.PI, 0]}
    >
      <mesh>
        <boxGeometry args={[5.2, 1.8, 0.15]} />
        <meshStandardMaterial color="#145645" />
      </mesh>
      <Html
        transform
        position={[0, 0, 0.09]}
        distanceFactor={4}
        zIndexRange={[0, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="w-48 border-2 border-white bg-emerald-900 p-2 text-center font-mono text-white">
          <b className="text-sm">{title}</b>
          <p className="mt-1 text-[9px]">{subtitle}</p>
        </div>
      </Html>
    </group>
  );
}

function CustomForest({
  data,
  theme,
}: {
  data: { foliage: number[][]; trunk: number[][] };
  theme: MountainTheme;
}) {
  const foliageRef = useRef<InstancedMesh>(null);
  const trunkRef = useRef<InstancedMesh>(null);

  useEffect(() => {
    if (!foliageRef.current || !trunkRef.current || !data?.trunk) return;
    const obj = new Object3D();
    const count = data.trunk.length;

    for (let i = 0; i < count; i++) {
      const t = data.trunk[i];
      const f = data.foliage[i] ?? t;

      // Foliage cluster
      const treeScale = Math.max(2.4, Math.min(6.5, (t[3] + t[5]) * 2.2));
      obj.position.set(f[0], f[1] + 1.2, f[2]);
      obj.scale.set(treeScale, treeScale * 0.9, treeScale);
      obj.rotation.set((i * 0.3) % 0.2, (i * 1.7) % Math.PI, 0);
      obj.updateMatrix();
      foliageRef.current.setMatrixAt(i, obj.matrix);

      // Trunk
      obj.position.set(t[0], t[1], t[2]);
      obj.scale.set(treeScale * 0.14, treeScale * 0.65, treeScale * 0.14);
      obj.rotation.set(0, 0, 0);
      obj.updateMatrix();
      trunkRef.current.setMatrixAt(i, obj.matrix);
    }

    foliageRef.current.instanceMatrix.needsUpdate = true;
    trunkRef.current.instanceMatrix.needsUpdate = true;
    foliageRef.current.computeBoundingSphere();
    trunkRef.current.computeBoundingSphere();
  }, [data]);

  return (
    <>
      <instancedMesh
        ref={foliageRef}
        args={[undefined, undefined, data.trunk.length]}
      >
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={theme.trees.foliageColor}
          roughness={theme.trees.roughness}
          flatShading
        />
      </instancedMesh>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, data.trunk.length]}
      >
        <cylinderGeometry args={[0.5, 0.7, 2, 5]} />
        <meshStandardMaterial
          color={theme.trees.trunkColor}
          roughness={theme.trees.roughness}
        />
      </instancedMesh>
    </>
  );
}

export function CustomMountain({
  theme = DEFAULT_MOUNTAIN_THEME,
}: {
  theme?: MountainTheme;
}) {
  const { scene } = useGLTF(GENTING_ASSETS.customScenery);
  const treesData = useLoader(FileLoader, GENTING_ASSETS.customTrees);

  const [assets] = useState(() => {
    const scenery = scene.clone(true);
    const colliders: { vertices: Float32Array; indices: Uint32Array; friction: number }[] = [];

    // Custom materials from theme
    const materials = {
      tinMesh: new MeshStandardMaterial({
        vertexColors: true,
        roughness: theme.terrain.roughness,
        metalness: theme.terrain.metalness,
        wireframe: theme.terrain.wireframe,
        side: DoubleSide,
      }),
      road_collector: new MeshStandardMaterial({
        color: new Color(theme.roads.collector.color),
        roughness: theme.roads.collector.roughness,
        metalness: theme.roads.collector.metalness,
        side: DoubleSide,
      }),
      road_local: new MeshStandardMaterial({
        color: new Color(theme.roads.local.color),
        roughness: theme.roads.local.roughness,
        metalness: theme.roads.local.metalness,
        side: DoubleSide,
      }),
      road_service: new MeshStandardMaterial({
        color: new Color(theme.roads.service.color),
        roughness: theme.roads.service.roughness,
        metalness: theme.roads.service.metalness,
        side: DoubleSide,
      }),
      road_paths: new MeshStandardMaterial({
        color: new Color(theme.roads.paths.color),
        roughness: theme.roads.paths.roughness,
        metalness: theme.roads.paths.metalness,
        side: DoubleSide,
      }),
      road_bridge: new MeshStandardMaterial({
        color: new Color(theme.roads.bridge.color),
        roughness: theme.roads.bridge.roughness,
        metalness: theme.roads.bridge.metalness,
        side: DoubleSide,
      }),
      buildings: new MeshStandardMaterial({
        color: new Color(theme.buildings.facadeColor),
        roughness: theme.buildings.roughness,
        metalness: theme.buildings.metalness,
      }),
    };

    // Style tree templates for ImportedTrees
    const foliageTemplate = scenery.getObjectByName("treeBaked_foliage") as Mesh | undefined;
    if (foliageTemplate) {
      foliageTemplate.material = new MeshStandardMaterial({
        color: new Color(theme.trees.foliageColor),
        roughness: theme.trees.roughness,
        flatShading: true,
      });
    }
    const trunkTemplate = scenery.getObjectByName("treeBaked_trunk") as Mesh | undefined;
    if (trunkTemplate) {
      trunkTemplate.material = new MeshStandardMaterial({
        color: new Color(theme.trees.trunkColor),
        roughness: theme.trees.roughness,
      });
    }

    scenery.traverse((object) => {
      if (!(object instanceof Mesh)) return;

      // Hide tree template meshes in the main scenery (they are instanced via ImportedTrees)
      if (object.name.startsWith("treeBaked_")) {
        object.visible = false;
        return;
      }

      // Assign theme material
      const mat = materials[object.name as keyof typeof materials];
      if (mat) {
        object.material = mat;
      }

      // Generate Rapier colliders for roads, bridge, buildings, and terrain
      if (
        object.name.startsWith("road_") ||
        object.name === "tinMesh" ||
        object.name === "buildings"
      ) {
        const position = object.geometry.getAttribute("position");
        const index = object.geometry.index;
        const friction = object.name.startsWith("road_") ? 0.85 : 0.7;

        colliders.push({
          vertices: position.array as Float32Array,
          indices: index
            ? new Uint32Array(index.array)
            : Uint32Array.from({ length: position.count }, (_, i) => i),
          friction,
        });
      }
    });

    const parsedTrees = JSON.parse(treesData as string);
    return { scenery, colliders, trees: parsedTrees, materials };
  });

  // Malaysian Road Infrastructure Geometry (markings, guardrails, rumble strips)
  const [roadMarkings] = useState(() => {
    const centerMarkings = createCenterMarkings();
    return {
      // Visual W-beam guardrails
      leftGuardrail: createWBeamGuardrail(-1),
      rightGuardrail: createWBeamGuardrail(1),
      // Shoulder white edge lines
      leftShoulder: createShoulderLine(-1),
      rightShoulder: createShoulderLine(1),
      // Center line markings
      centerDashed: centerMarkings.dashed,
      centerSolid: centerMarkings.solid,
      // Yellow rumble strips at hairpins
      rumbleStrips: createYellowRumbleStrips(),
      // Concrete curbs
      leftCurb: createRoadCurb(-1),
      rightCurb: createRoadCurb(1),
      // Physics safety barrier walls (invisible)
      leftBarrier: createBarrier(-1),
      rightBarrier: createBarrier(1),
    };
  });

  useEffect(() => {
    return () => {
      Object.values(roadMarkings).forEach((geom) => geom.dispose());
      Object.values(assets.materials).forEach((mat) => mat.dispose());
    };
  }, [roadMarkings, assets]);

  const finish = roadFrame(1);

  return (
    <>
      {/* Atmosphere & Genting Mountain Mist */}
      <fogExp2
        attach="fog"
        args={[theme.atmosphere.fogColor, theme.atmosphere.fogDensity]}
      />
      <color attach="background" args={[theme.atmosphere.skyColor]} />
      <hemisphereLight
        args={[
          theme.atmosphere.hemisphereSky,
          theme.atmosphere.hemisphereGround,
          theme.atmosphere.hemisphereIntensity,
        ]}
      />
      <directionalLight
        position={theme.atmosphere.sunPosition}
        intensity={theme.atmosphere.sunIntensity}
        color={theme.atmosphere.sunColor}
        castShadow={false}
      />

      {/* 1:1 Custom Mountain, Roads, and Buildings */}
      <primitive object={assets.scenery} dispose={null} />

      {/* 34,140 Surveyed Trees (Instanced) */}
      <CustomForest data={assets.trees} theme={theme} />

      {/* Malaysian Road Infrastructure Along Drive Route */}
      <MalaysianRoadInstances theme={theme} />

      {/* Visual W-beam Guardrails */}
      {[roadMarkings.leftGuardrail, roadMarkings.rightGuardrail].map((rail, i) => (
        <mesh key={i} geometry={rail}>
          <meshStandardMaterial
            color={theme.markings.guardrails.color}
            metalness={theme.markings.guardrails.metalness}
            roughness={theme.markings.guardrails.roughness}
            side={DoubleSide}
          />
        </mesh>
      ))}

      {/* Concrete Curbs */}
      {[roadMarkings.leftCurb, roadMarkings.rightCurb].map((curb, i) => (
        <mesh key={i} geometry={curb}>
          <meshStandardMaterial
            color={theme.markings.curbs.color}
            roughness={theme.markings.curbs.roughness}
          />
        </mesh>
      ))}

      {/* White Shoulder Edge Markings */}
      {[roadMarkings.leftShoulder, roadMarkings.rightShoulder].map((strip, i) => (
        <mesh key={i} geometry={strip}>
          <meshStandardMaterial
            color={theme.markings.shoulderWhite}
            roughness={0.7}
          />
        </mesh>
      ))}

      {/* Center Line Double Yellow Markings (Malaysian JKR) */}
      <mesh geometry={roadMarkings.centerDashed}>
        <meshStandardMaterial
          color={theme.markings.centerDoubleYellow}
          roughness={0.65}
        />
      </mesh>
      <mesh geometry={roadMarkings.centerSolid}>
        <meshStandardMaterial
          color={theme.markings.centerDoubleYellow}
          roughness={0.65}
        />
      </mesh>

      {/* Yellow Rumble Strips at Hairpin Approaches */}
      <mesh geometry={roadMarkings.rumbleStrips}>
        <meshStandardMaterial
          color={theme.markings.rumbleStrips}
          roughness={0.7}
        />
      </mesh>

      {/* Road Markers and Navigation Signs */}
      <KilometrePosts />
      <RouteSign
        t={(SPAWN_DISTANCE + 18) / ROAD_LENGTH}
        title="GENTING HIGHLANDS"
        subtitle={`${(ROUTE_INFO.lengthMeters / 1000).toFixed(1)} KM / ${ROUTE_INFO.closed ? "LOOP CIRCUIT" : "GPX UPHILL"}`}
      />
      {!ROUTE_INFO.closed && (
        <RouteSign
          t={1 - 35 / ROAD_LENGTH}
          title="ROUTE COMPLETE"
          subtitle="END OF GPX / PRESS R TO RESTART"
        />
      )}

      {/* Finish Banner / Barrier */}
      {!ROUTE_INFO.closed && (
        <RigidBody
          type="fixed"
          colliders={false}
          position={[finish.point.x, finish.point.y + 0.6, finish.point.z]}
          rotation={[0, Math.atan2(finish.tangent.x, finish.tangent.z), 0]}
        >
          <CuboidCollider args={[7, 0.7, 0.25]} />
          <mesh>
            <boxGeometry args={[14, 1.2, 0.4]} />
            <meshStandardMaterial color="#d0b652" />
          </mesh>
        </RigidBody>
      )}

      {/* Safety Catch Barriers (invisible walls for high-speed drifts) */}
      <RigidBody type="fixed" colliders="trimesh" friction={0.25}>
        {[roadMarkings.leftBarrier, roadMarkings.rightBarrier].map((wall, i) => (
          <mesh key={i} geometry={wall} visible={false} />
        ))}
      </RigidBody>

      {/* 1:1 Complete Driving Physics: Roads, Bridges, Buildings & Mountain Colliders */}
      <RigidBody type="fixed" colliders={false}>
        {assets.colliders.map((collider, i) => (
          <TrimeshCollider
            key={i}
            args={[collider.vertices, collider.indices]}
            friction={collider.friction}
          />
        ))}
      </RigidBody>
    </>
  );
}
