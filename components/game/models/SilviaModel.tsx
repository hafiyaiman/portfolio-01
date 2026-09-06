"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group, Mesh, MeshStandardMaterial } from "three";
import { useGameStore } from "../stores/useGameStore";
import { VehicleLights } from "./VehicleLights";
import { S15, S15_WHEELS, S15_STATIC_LENGTH } from "../physics/s15Physics";
import { CUSTOM_PARTS, selectedParts, type Build } from "../garage/catalog";
import { useGarageStore } from "../garage/useGarageStore";

// Three.js materials are mutable renderer resources, not React UI state.
function updateLampMaterials(
  lights: { material: MeshStandardMaterial; role: string }[],
  braking: boolean,
  gear: number,
) {
  for (const { material, role } of lights) {
    if (role === "head") material.emissiveIntensity = 4.8;
    else if (role === "head_small") material.emissiveIntensity = 4.2;
    else if (role === "signal") material.emissiveIntensity = 3.2;
    else if (role === "tail") material.emissiveIntensity = braking ? 4 : 0.9;
    else if (role === "reverse")
      material.emissiveIntensity = gear === -1 ? 3.5 : 0;
  }
}

export function SilviaModel({
  wheels,
  build: previewBuild,
}: {
  wheels: MutableRefObject<(Group | null)[]>;
  build?: Build;
}) {
  const { scene } = useGLTF("/models/silvia-s15.glb?v=headlights-cover-v3");
  const { scene: alternatives } = useGLTF("/models/silvia-customization.glb?v=3-fenders-widebody");
  const savedBuild = useGarageStore(state => state.build);
  const build = previewBuild ?? savedBuild;
  const lights = useRef<{ material: MeshStandardMaterial; role: string }[]>([]);
  // Clone transforms only: cached geometry/materials are shared safely across resets.
  const [parts] = useState(() => {
    const body = scene.getObjectByName("Body");
    const wheel = scene.getObjectByName("Wheel");
    if (!body || !wheel)
      throw new Error(
        "Silvia asset is missing the assembled body or wheel prototype.",
      );
    const clone = body.clone(true);
    clone.add(alternatives.clone(true));
    const lights: { material: MeshStandardMaterial; role: string }[] = [];
    const paints: MeshStandardMaterial[] = [];
    const initialSelection = selectedParts(build);
    clone.traverse((node) => {
      if (node instanceof Mesh && CUSTOM_PARTS.has(node.userData.sourcePart)) node.visible = initialSelection.has(node.userData.sourcePart);
      if (node instanceof Mesh && node.material instanceof MeshStandardMaterial && node.material.name === "Silvia pearl silver") {
        node.material = node.material.clone();
        paints.push(node.material);
      }
      if (
        !(node instanceof Mesh) ||
        !["head", "head_small", "signal", "tail", "reverse"].includes(
          node.userData.role,
        )
      )
        return;
      if (node.material instanceof MeshStandardMaterial) {
        node.material = node.material.clone();
        lights.push({ material: node.material, role: node.userData.role });
      }
    });
    return {
      body: clone,
      lights,
      paints,
      wheels: Array.from({ length: 4 }, () => wheel.clone(true)),
    };
  });
  useEffect(() => {
    lights.current = parts.lights;
    return () => {
      lights.current = [];
      parts.lights.forEach(({ material }) => material.dispose());
      parts.paints.forEach(material => material.dispose());
    };
  }, [parts]);
  useEffect(() => {
    const selected = selectedParts(build);
    parts.body.traverse(node => {
      if (node instanceof Mesh && CUSTOM_PARTS.has(node.userData.sourcePart)) node.visible = selected.has(node.userData.sourcePart);
    });
    parts.paints.forEach(material => material.color.set(build.paint));
  }, [build, parts]);
  useFrame(() => {
    const { braking, gear } = useGameStore.getState();
    updateLampMaterials(lights.current, braking, gear);
  });
  return (
    <group dispose={null}>
      <primitive
        object={parts.body}
        position={[0, -S15.cgHeight, 0]}
        scale={[1.695 / 1.8295, 1.285 / 1.3026, 4.445 / 4.425326]}
      />
      <group position={[0, 0.943 - S15.cgHeight, 0]}>
        <VehicleLights />
      </group>
      {parts.wheels.map((wheel, index) => (
        <group
          key={index}
          ref={(node) => {
            wheels.current[index] = node;
          }}
          position={[
            S15_WHEELS[index][0],
            S15.mountY - S15_STATIC_LENGTH,
            S15_WHEELS[index][2],
          ]}
        >
          <group>
            <primitive
              object={wheel}
              scale={[
                0.205 / 0.24615,
                S15.radius / 0.323445,
                S15.radius / 0.323445,
              ]}
              rotation={[0, index % 2 ? 0 : Math.PI, 0]}
            />
          </group>
        </group>
      ))}
    </group>
  );
}
