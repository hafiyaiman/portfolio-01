"use client";
// @refresh reset

import { Suspense, useEffect, useState } from "react";
import { useTexture } from "@react-three/drei";
import { ExtrudeGeometry, Shape, SRGBColorSpace } from "three";
import { ROAD_LENGTH, SPAWN_DISTANCE, roadFrame, terrainHeightAt } from "./track";

export type KilometrePost = {
  km: number;
  major: boolean;
  position: [number, number, number];
  yaw: number;
  footingHeight: number;
  summitKm: number;
  startKm: number;
};

export function createKilometrePosts(): KilometrePost[] {
  const origin = SPAWN_DISTANCE + 45;
  let summitDistance = 0,
    summitHeight = -Infinity;
  for (let distance = 0; distance < ROAD_LENGTH; distance += 25) {
    const height = roadFrame(distance / ROAD_LENGTH).point.y;
    if (height > summitHeight) {
      summitHeight = height;
      summitDistance = distance;
    }
  }
  return Array.from({ length: Math.floor(ROAD_LENGTH / 1000) + 1 }, (_, km) => {
    const distance = (origin + km * 1000) % ROAD_LENGTH;
    const { point, right, tangent } = roadFrame(distance / ROAD_LENGTH);
    point.addScaledVector(right, -8.3);
    const facing = tangent.clone().negate().addScaledVector(right, 0.35);
    const yaw = Math.atan2(facing.x, facing.z);
    const ground: number[] = [];
    for (const x of [-0.48, 0.48]) {
      for (const z of [-0.34, 0.34]) {
        ground.push(
          terrainHeightAt(
            point.x + x * Math.cos(yaw) + z * Math.sin(yaw),
            point.z - x * Math.sin(yaw) + z * Math.cos(yaw),
          ),
        );
      }
    }
    const base = Math.min(...ground) - 0.08;
    return {
      km,
      major: km % 5 === 0,
      position: [point.x, base, point.z],
      yaw,
      footingHeight: Math.max(...ground) - base + 0.14,
      summitKm: Math.ceil(
        ((summitDistance - distance + ROAD_LENGTH) % ROAD_LENGTH) / 1000,
      ),
      startKm: km === 0 ? 0 : Math.ceil((ROAD_LENGTH - km * 1000) / 1000),
    };
  });
}

/** Painted layout based on the supplied Malaysian Type A / B reference. */
export function kilometrePostSvg(
  post: Pick<KilometrePost, "major" | "km" | "summitKm" | "startKm">,
) {
  const rows = post.major
    ? [
        ["PUNCAK", post.summitKm],
        ["MULA", post.startKm],
      ]
    : [["MULA", post.startKm]];
  const panels = rows
    .map(([name, distance], i) => {
      const y = 122 + i * 134;
      return `<rect x="17" y="${y}" width="222" height="55" fill="#07568b"/>
      <text x="128" y="${y + 37}" font-size="29" fill="white">${name}</text>
      <rect x="17" y="${y + 61}" width="222" height="61" fill="#07568b"/>
      <text x="128" y="${y + 107}" font-size="46" fill="white">${distance}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="512" viewBox="0 0 256 512">
    <rect width="256" height="512" fill="#edece4"/>
    <g font-family="Bahnschrift, sans-serif" font-weight="bold" text-anchor="middle">
      <path d="M128 20 L180 40 L180 83 L128 102 L76 83 L76 40 Z" fill="#ebbd39" stroke="#262923" stroke-width="4"/>
      <text x="128" y="74" font-size="31" fill="#181c1a">GH1</text>
      ${panels}
      <rect x="89" y="441" width="78" height="44" fill="#b2b3aa" stroke="#535851" stroke-width="2"/>
      <text x="128" y="473" font-size="29" fill="#222622">${post.km}</text>
      <text x="128" y="506" font-size="12" fill="#606559" letter-spacing="2">LITAR GENTING</text>
    </g>
  </svg>`;
}

function postGeometry(height: number, major: boolean) {
  const shape = new Shape();
  shape.moveTo(-0.34, 0);
  shape.lineTo(0.34, 0);
  shape.lineTo(0.34, height - (major ? 0.18 : 0));
  shape.lineTo(-0.34, height);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, steps: 1 });
  geometry.translate(0, 0, -0.12);
  return geometry;
}

function PaintedFace({ post }: { post: KilometrePost }) {
  const texture = useTexture(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(kilometrePostSvg(post))}`,
    (tex) => {
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
    },
  );
  const height = post.major ? 1.52 : 1.24;
  return <mesh position={[0, post.footingHeight + height / 2 + 0.06, 0.135]}>
    <planeGeometry args={[0.6, height]} />
    <meshStandardMaterial map={texture} roughness={0.95} />
  </mesh>;
}

export function KilometrePosts() {
  const [posts] = useState(createKilometrePosts);
  const [geometry] = useState(() => ({ major: postGeometry(1.86, true), minor: postGeometry(1.4, false) }));
  useEffect(() => () => Object.values(geometry).forEach(item => item.dispose()), [geometry]);
  return <group name="Malaysian kilometre posts">
    {posts.map(post => <group key={post.km} name={`KM ${post.km} / Type ${post.major ? "A" : "B"}`} position={post.position} rotation={[0, post.yaw, 0]}>
      <mesh position={[0, post.footingHeight / 2, 0]}>
        <boxGeometry args={[0.96, post.footingHeight, 0.68]} />
        <meshStandardMaterial color="#b7b8ac" roughness={1} />
      </mesh>
      <mesh geometry={post.major ? geometry.major : geometry.minor} position={[0, post.footingHeight, 0]}>
        <meshStandardMaterial color="#e3e1d5" roughness={1} />
      </mesh>
      <Suspense fallback={null}><PaintedFace post={post} /></Suspense>
    </group>)}
  </group>;
}
