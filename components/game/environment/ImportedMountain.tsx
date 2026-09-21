"use client";
// @refresh reset

import { useEffect, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { BufferGeometry, Float32BufferAttribute, FileLoader, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Vector3, Quaternion, DoubleSide } from "three";
import { prepareImportedWorld } from "./importedWorld";
import { CarController } from "../physics/CarController";
import { useGameStore } from "../stores/useGameStore";
import { GENTING_ASSETS } from "./gentingAssets";

export function ImportedTrees({ source, scale, data }: { source: Group; scale: number; data: Record<string, number[][]> }) {
  const [batches] = useState(() => {
    const result: InstancedMesh[] = [];
    const matrix = new Matrix4(), rotation = new Quaternion();
    for (const kind of ["foliage", "trunk"]) {
      const template = source.getObjectByName(`treeBaked_${kind}`) as Mesh;
      const cells = new Map<string, number[][]>();
      for (const tree of data[kind]) {
        const key = `${Math.floor(tree[0] * scale / 128)}:${Math.floor(tree[2] * scale / 128)}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key)!.push(tree);
      }
      for (const trees of cells.values()) {
        const mesh = new InstancedMesh(template.geometry, template.material, trees.length);
        trees.forEach((t, i) => {
          matrix.compose(new Vector3(t[0] * scale, t[1] * scale, t[2] * scale), rotation, new Vector3(t[3] * scale, t[4] * scale, t[5] * scale));
          mesh.setMatrixAt(i, matrix);
        });
        mesh.computeBoundingSphere(); result.push(mesh);
      }
    }
    return result;
  });
  useEffect(() => () => batches.forEach(mesh => mesh.dispose()), [batches]);
  return batches.map((mesh, i) => <primitive key={i} object={mesh} dispose={null} />);
}

function RouteDirections({ points }: { points: number[][] }) {
  const [arrows] = useState(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute([-0.65, 0, -0.5, 0, 0, 1, 0.65, 0, -0.5, 0, 0, -0.15], 3));
    geometry.setIndex([0, 1, 3, 1, 2, 3]);
    const material = new MeshBasicMaterial({ color: "#f4d97b", side: DoubleSide, transparent: true, opacity: 0.7, depthWrite: false });
    let distance = 0;
    const matrices: Matrix4[] = [];
    for (let i = 1; i < points.length - 1; i++) {
      const position = new Vector3(...points[i]);
      distance += position.distanceTo(new Vector3(...points[i - 1]));
      if (distance < 45) continue;
      distance = 0;
      const forward = new Vector3(...points[i + 1]).sub(new Vector3(...points[i - 1])).normalize();
      const right = new Vector3(forward.z, 0, -forward.x).normalize();
      const up = new Vector3().crossVectors(forward, right).normalize();
      matrices.push(new Matrix4().makeBasis(right, up, forward).setPosition(position.add(new Vector3(0, 0.18, 0))));
    }
    const mesh = new InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.computeBoundingSphere();
    return mesh;
  });
  useEffect(() => () => { arrows.geometry.dispose(); (arrows.material as MeshBasicMaterial).dispose(); arrows.dispose(); }, [arrows]);
  return <primitive object={arrows} dispose={null} />;
}

export function ImportedMountain() {
  const { scene } = useGLTF(GENTING_ASSETS.scenery);
  const [alignmentText, treesText] = useLoader(FileLoader, [GENTING_ASSETS.alignment, GENTING_ASSETS.trees]);
  const [assets] = useState(() => {
    const alignment = JSON.parse(alignmentText as string);
    return { world: prepareImportedWorld(scene, alignment.report.scale, alignment.points), points: alignment.points as number[][], scale: alignment.report.scale as number, trees: JSON.parse(treesText as string) };
  });
  const resetId = useGameStore(state => state.resetId);
  useEffect(() => () => assets.world.dispose(), [assets]);
  return <>
    <color attach="background" args={["#b6cbd1"]} />
    <fogExp2 attach="fog" args={["#b6cbd1", 0.0012]} />
    <hemisphereLight args={["#e1edf2", "#526046", 1.8]} />
    <directionalLight position={[800, 1400, 300]} intensity={2} />
    <primitive object={assets.world.scene} dispose={null} />
    <ImportedTrees source={scene} scale={assets.scale} data={assets.trees} />
    <RouteDirections points={assets.points} />
    <RigidBody type="fixed" colliders={false}>
      <TrimeshCollider args={[assets.world.collider.vertices, assets.world.collider.indices]} friction={0.7} />
    </RigidBody>
    <CarController key={resetId} route={assets.world.route} />
  </>;
}
