"use client";

import { useMemo, useLayoutEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { FileLoader, Mesh, Object3D, InstancedMesh, BufferGeometry, Material, DoubleSide, Group } from "three";

const ROOT = "/maps/genting/blender/";
const REVISION = "?v=laptop-1";
type Tree = [number, number, number, number, number, number];
type Template = { geometry: BufferGeometry; material: Material | Material[]; variant: number };

function ForestCell({ trees, template, lowTemplate, center }: { trees: Tree[]; template: Template; lowTemplate: Template; center: [number, number, number] }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = new Object3D();
    trees.forEach(([x, y, z, scale, yaw], i) => {
      object.position.set(x - center[0], y - center[1], z - center[2]);
      object.rotation.set(0, yaw, 0);
      object.scale.setScalar(scale);
      object.updateMatrix();
      mesh.setMatrixAt(i, object.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    const bounds = mesh.boundingSphere!.clone();
    mesh.geometry = lowTemplate.geometry;
    mesh.computeBoundingSphere();
    mesh.boundingSphere!.union(bounds);
    mesh.geometry = template.geometry;
  }, [trees, center, template, lowTemplate]);
  return <instancedMesh ref={ref} args={[template.geometry, template.material, trees.length]}
    userData={{ near: template, far: lowTemplate }} />;
}

function TropicalForest() {
  const { scene } = useGLTF(`${ROOT}tropical-trees-laptop.glb${REVISION}`);
  const { scene: lowScene } = useGLTF(`${ROOT}tropical-trees-low.glb${REVISION}`);
  const json = useLoader(FileLoader, `${ROOT}forest.json${REVISION}`);
  const forest = useRef<Group>(null);
  const nextUpdate = useRef(0);
  const cells = useMemo(() => {
    const collectTemplates = (source: Group) => {
      const templates: Template[] = [];
      source.updateMatrixWorld(true);
      source.traverse(object => {
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
      return templates;
    };
    const templates = collectTemplates(scene), lowTemplates = collectTemplates(lowScene);
    const bins = new Map<string, Tree[]>();
    for (const tree of JSON.parse(json as string) as Tree[]) {
      const key = `${Math.floor(tree[0] / 192)}:${Math.floor(tree[2] / 192)}:${tree[5]}`;
      const list = bins.get(key) ?? [];
      list.push(tree); bins.set(key, list);
    }
    return { templates, lowTemplates, bins: Array.from(bins, ([key, trees]) => ({
      key, trees,
      center: trees.reduce((sum, t) => [sum[0] + t[0] / trees.length, sum[1] + t[1] / trees.length, sum[2] + t[2] / trees.length], [0, 0, 0]) as [number, number, number],
      templates: templates.filter(t => t.variant === trees[0][5]),
      lowTemplates: lowTemplates.filter(t => t.variant === trees[0][5]),
    })) };
  }, [scene, lowScene, json]);
  useLayoutEffect(() => () => {
    [...cells.templates, ...cells.lowTemplates].forEach(t => t.geometry.dispose());
  }, [cells]);
  useFrame(({ camera, clock }) => {
    if (!forest.current || clock.elapsedTime < nextUpdate.current) return;
    nextUpdate.current = clock.elapsedTime + 0.15;
    for (const cell of forest.current.children) {
      const distance = camera.position.distanceToSquared(cell.position);
      cell.visible = distance < 800 * 800;
      if (!cell.visible) continue;
      const detail = distance < 280 * 280 ? "near" : "far";
      if (cell.userData.detail === detail) continue;
      cell.userData.detail = detail;
      for (const child of cell.children) {
        const mesh = child as InstancedMesh;
        const template = mesh.userData[detail] as Template;
        mesh.geometry = template.geometry;
        mesh.material = template.material;
      }
    }
  });
  return <group ref={forest}>{cells.bins.map(cell => <group key={cell.key} position={cell.center}>
    {cell.templates.map((template, i) => <ForestCell key={i} trees={cell.trees} template={template} lowTemplate={cell.lowTemplates[i]} center={cell.center} />)}
  </group>)}</group>;
}

/** Blender exports both the visible course and its matching collision surfaces. */
export function BlenderMountain() {
  const { scene } = useGLTF(`${ROOT}course-laptop.glb${REVISION}`);
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
    <fogExp2 attach="fog" args={["#b6c6c6", 0.004]} />
    <hemisphereLight args={["#d4e1e2", "#314434", 1.7]} />
    <directionalLight position={[150, 350, -200]} color="#e4e9df" intensity={1.8} />
    <primitive object={assets.scenery} dispose={null} />
    <TropicalForest />
    <RigidBody type="fixed" colliders={false}>
      {assets.colliders.map(c => <TrimeshCollider key={c.name} args={[c.vertices, c.indices]} friction={c.friction} />)}
    </RigidBody>
  </>;
}
