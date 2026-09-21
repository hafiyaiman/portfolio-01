"use client";
// @refresh reset

import { useState } from "react";
import { useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { FileLoader, Mesh } from "three";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { GENTING_ASSETS } from "./gentingAssets";
import { ImportedTrees } from "./ImportedMountain";
import { MountainRoad } from "./MountainRoad";

export function HybridMountain() {
  const { scene } = useGLTF(GENTING_ASSETS.hybridScenery);
  const trees = useLoader(FileLoader, GENTING_ASSETS.hybridTrees);
  const [assets] = useState(() => {
    const scenery = scene.clone(true);
    const colliders: { vertices: Float32Array; indices: Uint32Array }[] = [];
    scenery.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (
        object.name.startsWith("treeBaked_") ||
        object.name === "clippedBottom"
      ) {
        object.visible = false;
        return;
      }
      if (object.name !== "tinMesh" && !object.name.startsWith("building_"))
        return;
      const position = object.geometry.getAttribute("position"),
        index = object.geometry.index;
      colliders.push({
        vertices: position.array as Float32Array,
        indices: index
          ? new Uint32Array(index.array)
          : Uint32Array.from({ length: position.count }, (_, i) => i),
      });
    });
    return { scenery, colliders, trees: JSON.parse(trees as string) };
  });
  return (
    <>
      <MountainRoad scenery={false} />
      <primitive object={assets.scenery} dispose={null} />
      <ImportedTrees source={scene} scale={1} data={assets.trees} />
      <RigidBody type="fixed" colliders={false}>
        {assets.colliders.map((collider, i) => (
          <TrimeshCollider
            key={i}
            args={[collider.vertices, collider.indices]}
            friction={0.7}
          />
        ))}
      </RigidBody>
    </>
  );
}
