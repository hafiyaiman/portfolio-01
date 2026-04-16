"use client";

import { gsap } from "gsap";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, MeshBasicMaterial, Texture } from "three";
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  MathUtils,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
} from "three";

interface TechOrbitSceneProps {
  stageClassName?: string;
  glowClassName?: string;
  sceneClassName?: string;
  speedMultiplier?: number;
}

interface BentCardProps {
  angle: number;
  orbitRadius: number;
  cardWidth: number;
  cardHeight: number;
  curveRadius: number;
  geometry: PlaneGeometry;
  faceTexture: Texture | null;
  shimmerTexture: Texture | null;
  highlightPhase: number;
}

interface OrbitRingProps {
  speedMultiplier: number;
  cardWidth: number;
  cardHeight: number;
  orbitRadius: number;
  curveRadius: number;
  faceTextures: Texture[];
  shimmerTexture: Texture | null;
}

const ORBIT_IMAGE_URLS = [
  "https://unqsaqcwmkkjjysfwfmx.supabase.co/storage/v1/object/public/portfolio/d-park-village.jpg",
  "https://unqsaqcwmkkjjysfwfmx.supabase.co/storage/v1/object/public/portfolio/kad-undangan.png",
  "https://unqsaqcwmkkjjysfwfmx.supabase.co/storage/v1/object/public/portfolio/poster.png",
  "https://unqsaqcwmkkjjysfwfmx.supabase.co/storage/v1/object/public/portfolio/split-bills.png",
] as const;

const ORBIT_FALLBACK_IMAGE_URLS = [
  "/img/works/d-park-village.jpg",
  "/img/works/kad-undangan.png",
  "/img/works/split-bills.png",
] as const;

function TowerStructure() {
  const towerHeight = 6.4;
  const nodePositions = [-0.38, -0.22, -0.05, 0.12, 0.28, 0.42].map(
    (position) => position * towerHeight,
  );

  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.055, 0.055, towerHeight, 18]} />
        <meshBasicMaterial
          color="#d46a1f"
          transparent
          opacity={0.82}
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <cylinderGeometry args={[0.22, 0.22, towerHeight, 20]} />
        <meshBasicMaterial
          color="#d8b569"
          transparent
          opacity={0.1}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {nodePositions.map((y, index) => (
        <group key={y} position={[0, y, 0]}>
          <mesh>
            <boxGeometry args={[0.56, 0.025, 0.025]} />
            <meshBasicMaterial
              color="#f2e2cd"
              transparent
              opacity={0.55}
              toneMapped={false}
            />
          </mesh>

          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.16, index % 2 === 0 ? 0.18 : 0.14, 0.16]} />
            <meshBasicMaterial
              color="#6b2411"
              transparent
              opacity={0.46}
              toneMapped={false}
            />
          </mesh>

          <mesh>
            <sphereGeometry args={[index % 2 === 0 ? 0.05 : 0.036, 16, 16]} />
            <meshBasicMaterial
              color="#f8efe2"
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      <mesh position={[0, towerHeight / 2 + 0.28, 0]}>
        <cylinderGeometry args={[0.018, 0.024, 0.56, 12]} />
        <meshBasicMaterial
          color="#f0d0a3"
          transparent
          opacity={0.74}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, towerHeight / 2 + 0.6, 0]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial
          color="#fff4e8"
          transparent
          opacity={0.94}
          toneMapped={false}
        />
      </mesh>

      {[3.32, 3.62].map((radius, index) => (
        <mesh key={radius} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.012, 8, 96]} />
          <meshBasicMaterial
            color="#d46a1f"
            transparent
            opacity={index === 0 ? 0.14 : 0.05}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function createBentPlaneGeometry(
  width: number,
  height: number,
  curveRadius: number,
  widthSegments: number,
) {
  const geometry = new PlaneGeometry(width, height, widthSegments, 1);
  const position = geometry.attributes.position;

  for (let index = 0; index < position.count; index += 1) {
    const flatX = position.getX(index);
    const flatY = position.getY(index);
    const angle = flatX / curveRadius;
    const curvedX = Math.sin(angle) * curveRadius;
    const curvedZ = Math.cos(angle) * curveRadius - curveRadius;

    position.setXYZ(index, curvedX, flatY, curvedZ);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

function createShimmerTexture() {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0.32, "rgba(255,244,232,0)");
  gradient.addColorStop(0.48, "rgba(255,230,205,0.03)");
  gradient.addColorStop(0.5, "rgba(216,181,105,0.16)");
  gradient.addColorStop(0.52, "rgba(255,230,205,0.03)");
  gradient.addColorStop(0.68, "rgba(255,244,232,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1.6, 1);
  texture.offset.set(-1, 0);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

function prepareTexture(texture: Texture) {
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

function BentCard({
  angle,
  orbitRadius,
  cardWidth,
  cardHeight,
  curveRadius,
  geometry,
  faceTexture,
  shimmerTexture,
  highlightPhase,
}: BentCardProps) {
  const shimmerMaterialRef = useRef<MeshBasicMaterial | null>(null);

  const shimmerMap = useMemo(() => {
    if (!shimmerTexture) {
      return null;
    }

    const clone = shimmerTexture.clone();
    clone.wrapS = RepeatWrapping;
    clone.wrapT = RepeatWrapping;
    clone.repeat.copy(shimmerTexture.repeat);
    clone.offset.copy(shimmerTexture.offset);
    clone.needsUpdate = true;

    return clone;
  }, [shimmerTexture]);

  useEffect(() => {
    return () => {
      shimmerMap?.dispose();
    };
  }, [shimmerMap]);

  useFrame((state) => {
    const map = shimmerMaterialRef.current?.map;

    if (!map) {
      return;
    }

    map.offset.x =
      -1 + ((state.clock.elapsedTime * 0.22 + highlightPhase) % 1.8);
  });

  const radians = MathUtils.degToRad(angle);
  const x = Math.sin(radians) * orbitRadius;
  const z = Math.cos(radians) * orbitRadius;

  return (
    <group position={[x, 0, z]} rotation={[0, radians, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          map={faceTexture}
          side={DoubleSide}
          roughness={0.94}
          metalness={0.02}
        />
      </mesh>

      <mesh geometry={geometry} position={[0, 0, 0.01]}>
        <meshBasicMaterial
          ref={shimmerMaterialRef}
          map={shimmerMap}
          transparent
          opacity={0.72}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          curveRadius -
            Math.sqrt(curveRadius ** 2 - (cardWidth * 0.26) ** 2) +
            0.05,
        ]}
      >
        <planeGeometry args={[cardWidth * 0.78, cardHeight * 0.78]} />
        <meshBasicMaterial
          transparent
          opacity={0.06}
          color="#f2d7b4"
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function OrbitRing({
  speedMultiplier,
  cardWidth,
  cardHeight,
  orbitRadius,
  curveRadius,
  faceTextures,
  shimmerTexture,
}: OrbitRingProps) {
  const groupRef = useRef<Group | null>(null);
  const rotationSpeed = (Math.PI * 2) / 20;

  const geometry = useMemo(
    () => createBentPlaneGeometry(cardWidth, cardHeight, curveRadius, 28),
    [cardWidth, cardHeight, curveRadius],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame((_, delta) => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    group.rotation.y -= delta * rotationSpeed * speedMultiplier;
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 10 }, (_, index) => (
        <BentCard
          key={index}
          angle={(index / 10) * 360}
          orbitRadius={orbitRadius}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          curveRadius={curveRadius}
          geometry={geometry}
          faceTexture={faceTextures[index % faceTextures.length] ?? null}
          shimmerTexture={shimmerTexture}
          highlightPhase={index / 10}
        />
      ))}
    </group>
  );
}

function OrbitAssembly({
  speedMultiplier,
  faceTextures,
  shimmerTexture,
}: Pick<OrbitRingProps, "speedMultiplier" | "faceTextures" | "shimmerTexture">) {
  return (
    <group
      position={[0.45, -0.05, 0]}
      rotation={[0.16, 0.08, MathUtils.degToRad(-15)]}
      scale={1.2}
    >
      <TowerStructure />
      <OrbitRing
        speedMultiplier={speedMultiplier}
        cardWidth={1.7}
        cardHeight={0.95625}
        orbitRadius={3.15}
        curveRadius={4.8}
        faceTextures={faceTextures}
        shimmerTexture={shimmerTexture}
      />
    </group>
  );
}

function OrbitCardsScene({
  speedMultiplier,
}: Pick<TechOrbitSceneProps, "speedMultiplier">) {
  const [faceTextures, setFaceTextures] = useState<Texture[]>([]);
  const shimmerTexture = useMemo(() => createShimmerTexture(), []);

  useEffect(() => {
    let isDisposed = false;
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");

    const loadTexture = (url: string) =>
      new Promise<Texture | null>((resolve) => {
        loader.load(
          url,
          (loadedTexture) => {
            resolve(prepareTexture(loadedTexture));
          },
          undefined,
          (error) => {
            console.error("Failed to load orbit texture:", url, error);
            resolve(null);
          },
        );
      });

    const loadOrbitTextures = async () => {
      const primaryTextures = await Promise.all(
        ORBIT_IMAGE_URLS.map((url) => loadTexture(url)),
      );
      const resolvedPrimaryTextures = primaryTextures.filter(
        (texture): texture is Texture => texture !== null,
      );

      if (resolvedPrimaryTextures.length > 0) {
        if (isDisposed) {
          resolvedPrimaryTextures.forEach((texture) => texture.dispose());
          return;
        }

        setFaceTextures((currentTextures) => {
          currentTextures.forEach((texture) => texture.dispose());
          return resolvedPrimaryTextures;
        });
        return;
      }

      const fallbackTextures = await Promise.all(
        ORBIT_FALLBACK_IMAGE_URLS.map((url) => loadTexture(url)),
      );
      const resolvedFallbackTextures = fallbackTextures.filter(
        (texture): texture is Texture => texture !== null,
      );

      if (isDisposed) {
        resolvedFallbackTextures.forEach((texture) => texture.dispose());
        return;
      }

      setFaceTextures((currentTextures) => {
        currentTextures.forEach((texture) => texture.dispose());
        return resolvedFallbackTextures;
      });
    };

    void loadOrbitTextures();

    return () => {
      isDisposed = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      faceTextures.forEach((texture) => texture.dispose());
      shimmerTexture?.dispose();
    };
  }, [faceTextures, shimmerTexture]);

  return (
    <Canvas
      camera={{ position: [0, 0.28, 14.2], fov: 29 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.debug.checkShaderErrors = false;
        gl.setClearAlpha(0);
      }}
    >
      <ambientLight intensity={1.05} />
      <directionalLight position={[4, 4, 8]} intensity={2.9} color="#ffe6c9" />
      <directionalLight position={[-5, 1, 5]} intensity={1.5} color="#7a1600" />
      <pointLight
        position={[0, 0, 6]}
        intensity={10}
        distance={18}
        color="#f4a261"
      />

      <OrbitAssembly
        speedMultiplier={speedMultiplier ?? 1}
        faceTextures={faceTextures}
        shimmerTexture={shimmerTexture}
      />
    </Canvas>
  );
}

export function TechOrbitScene({
  stageClassName = "absolute bottom-0 right-0 h-[40rem] w-[54rem] max-w-[96vw] overflow-visible",
  glowClassName = "absolute inset-0 bg-[radial-gradient(circle_at_72%_72%,rgba(91,38,18,0.18),transparent_24%),radial-gradient(circle_at_78%_78%,rgba(9,11,19,0.1),transparent_44%)]",
  sceneClassName = "absolute bottom-[5.75rem] right-[9rem] h-0 w-0 scale-[0.7] will-change-transform xl:scale-[0.9]",
  speedMultiplier = 1,
}: TechOrbitSceneProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dustLayerRef = useRef<HTMLDivElement>(null);
  const [useStaticLayout, setUseStaticLayout] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce), (max-width: 1023px)",
    );

    const updatePreference = () => {
      setUseStaticLayout(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const dustLayer = dustLayerRef.current;

    if (useStaticLayout || !stage || !dustLayer) {
      return;
    }

    let isDisposed = false;
    let dustTimeline: gsap.core.Timeline | null = null;

    const ctx = gsap.context(() => {
      for (let index = 0; index < 10; index += 1) {
        const dust = document.createElement("div");
        dust.className = "tech-orbit-scene__dust";
        dustLayer.appendChild(dust);
      }

      const startDustLoop = () => {
        if (isDisposed) {
          return;
        }

        dustTimeline = gsap.timeline({ onComplete: startDustLoop });
        dustTimeline.set(
          dustLayer.children,
          {
            x: () => stage.offsetWidth * (Math.random() - 0.2),
            y: () => stage.offsetHeight * (Math.random() - 0.15),
            rotation: () => 360 * Math.random(),
            scale: () => 0.45 + Math.random() * 1.4,
            opacity: () => 0.08 + Math.random() * 0.24,
          },
          0.07,
        );
      };

      startDustLoop();
    }, stage);

    return () => {
      isDisposed = true;
      dustTimeline?.kill();
      dustLayer.replaceChildren();
      ctx.revert();
    };
  }, [useStaticLayout]);

  if (useStaticLayout) {
    return null;
  }

  return (
    <div
      ref={stageRef}
      className={`pointer-events-none ${stageClassName}`}
      aria-hidden="true"
    >
      <div className={glowClassName} />

      <div className={sceneClassName}>
        <div className="absolute left-1/2 top-1/2 h-[50rem] w-[54rem] overflow-visible -translate-x-1/2 -translate-y-1/2">
          <OrbitCardsScene speedMultiplier={speedMultiplier} />
        </div>
      </div>

      <div ref={dustLayerRef} className="absolute inset-0 z-10" />
      <div className="tech-orbit-scene__grain absolute inset-0 z-20 opacity-30" />

      <style jsx>{`
        .tech-orbit-scene__dust {
          position: absolute;
          width: 26px;
          height: 26px;
          border-radius: 9999px;
          background: radial-gradient(
            circle at 40% 40%,
            rgba(248, 239, 226, 0.32),
            rgba(248, 239, 226, 0.08) 28%,
            rgba(212, 106, 31, 0.08) 56%,
            transparent 72%
          );
          filter: blur(1px);
        }

        .tech-orbit-scene__grain {
          background-image:
            radial-gradient(rgba(255, 255, 255, 0.04) 0.7px, transparent 0.7px),
            radial-gradient(rgba(212, 106, 31, 0.03) 0.8px, transparent 0.8px);
          background-position:
            0 0,
            12px 12px;
          background-size: 24px 24px;
          mix-blend-mode: overlay;
        }
      `}</style>
    </div>
  );
}
