"use client";

import { useMemo, useLayoutEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { FileLoader, Mesh, Object3D, InstancedMesh, BufferGeometry, Material, DoubleSide } from "three";

const ROOT = "/maps/genting/blender/";
const REVISION = "?v=genting-reference-terrain-6";
type Tree = [number, number, number, number, number, number];
type Template = { geometry: BufferGeometry; material: Material | Material[]; variant: number };

function ForestCell({ trees, template }: { trees: Tree[]; template: Template }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new Object3D();
    trees.forEach(([x, y, z, scale, yaw], i) => {
      object.position.set(x, y, z);
      object.rotation.set(0, yaw, 0);
      object.scale.setScalar(scale);
      object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [trees]);
  return <instancedMesh ref={ref} args={[template.geometry, template.material, trees.length]} />;
}

function TropicalForest() {
  const { scene } = useGLTF(`${ROOT}tropical-trees.glb${REVISION}`);
  const json = useLoader(FileLoader, `${ROOT}forest.json${REVISION}`);
  const cells = useMemo(() => {
    const templates: Template[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      let parent: Object3D | null = object;
      while (parent && !parent.name.startsWith("TropicalTree_")) parent = parent.parent;
      if (!parent) return;
      const variant = Number(parent.name.split("_")[1]);
      // glTF material primitives can have parent transforms; bake them once per template.
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(m => { m.side = DoubleSide; });
      templates.push({ geometry, material: object.material, variant });
    });
    const bins = new Map<string, Tree[]>();
    for (const tree of JSON.parse(json as string) as Tree[]) {
      const key = `${Math.floor(tree[0] / 192)}:${Math.floor(tree[2] / 192)}:${tree[5]}`;
      const list = bins.get(key) ?? [];
      list.push(tree); bins.set(key, list);
    }
    return Array.from(bins, ([key, trees]) => ({ key, trees, templates: templates.filter(t => t.variant === trees[0][5]) }));
  }, [scene, json]);
  return <>{cells.flatMap(cell => cell.templates.map((template, i) => <ForestCell key={`${cell.key}:${i}`} trees={cell.trees} template={template} />))}</>;
}

/** Blender exports both the visible course and its matching collision surfaces. */
export function BlenderMountain() {
  const { scene } = useGLTF(`${ROOT}course.glb${REVISION}`);
  const assets = useMemo(() => {
    const scenery = scene.clone(true);
    scenery.updateMatrixWorld(true);
    const colliders: { name: string; vertices: Float32Array; indices: Uint32Array; friction: number }[] = [];
    scenery.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const collisionOnly = object.name.startsWith("CollisionRail");
      object.visible = !collisionOnly;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(m => { m.side = DoubleSide; });
      if (!["Pavement", "Shoulder", "Terrain"].includes(object.name) && !collisionOnly) return;
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      colliders.push({ name: object.name, vertices: new Float32Array(geometry.attributes.position.array), indices: geometry.index ? new Uint32Array(geometry.index.array) : Uint32Array.from({ length: geometry.attributes.position.count }, (_, i) => i), friction: collisionOnly ? 0.25 : 0.85 });
      geometry.dispose();
    });
    return { scenery, colliders };
  }, [scene]);
  return <>
    <color attach="background" args={["#b6c6c6"]} />
    <fogExp2 attach="fog" args={["#b6c6c6", 0.0024]} />
    <hemisphereLight args={["#d4e1e2", "#314434", 1.7]} />
    <directionalLight position={[150, 350, -200]} color="#e4e9df" intensity={1.8} />
    <primitive object={assets.scenery} dispose={null} />
    <TropicalForest />
    <RigidBody type="fixed" colliders={false}>
      {assets.colliders.map(c => <TrimeshCollider key={c.name} args={[c.vertices, c.indices]} friction={c.friction} />)}
    </RigidBody>
  </>;
}
