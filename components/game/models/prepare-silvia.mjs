// Assemble the supplied exploded parts kit into a lightweight, reusable game asset.
// Usage: node components/game/models/prepare-silvia.mjs /path/to/source.glb
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Box3,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const input = process.argv[2];
if (!input)
  throw new Error("Provide the original nissan_silvia_200sx_s15.glb path.");
const bytes = await fs.readFile(input);
const original = JSON.parse(
  bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
);
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const materials = {
  paint: new MeshPhysicalMaterial({
    name: "Silvia pearl silver",
    color: "#bbc7ce",
    metalness: 0.68,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    side: DoubleSide,
  }),
  trim: new MeshStandardMaterial({
    name: "Graphite trim",
    color: "#151b20",
    roughness: 0.65,
    side: DoubleSide,
  }),
  glass: new MeshPhysicalMaterial({
    name: "Smoked glass",
    color: "#25414d",
    metalness: 0.35,
    roughness: 0.13,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    side: DoubleSide,
  }),
  chrome: new MeshStandardMaterial({
    name: "Brushed alloy",
    color: "#a2abb2",
    metalness: 0.85,
    roughness: 0.28,
    side: DoubleSide,
  }),
  tire: new MeshStandardMaterial({
    name: "Tire rubber",
    color: "#111316",
    roughness: 0.95,
    side: DoubleSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  }),
  headlight: new MeshStandardMaterial({
    name: "Headlights",
    color: "#d4e7ff",
    emissive: "#b7d7ff",
    emissiveIntensity: 1.7,
  }),
  headlightBig: new MeshStandardMaterial({
    name: "HeadlightsBig",
    color: "#ffffff",
    emissive: "#fff0db",
    emissiveIntensity: 3.5,
    roughness: 0.1,
  }),
  headlightSmall: new MeshStandardMaterial({
    name: "HeadlightsSmall",
    color: "#dff0ff",
    emissive: "#badeff",
    emissiveIntensity: 3.2,
    roughness: 0.1,
  }),
  signalLight: new MeshStandardMaterial({
    name: "SignalLights",
    color: "#ff9500",
    emissive: "#ff7b00",
    emissiveIntensity: 3.0,
    roughness: 0.15,
  }),
  taillight: new MeshStandardMaterial({
    name: "Taillights",
    color: "#951d20",
    emissive: "#f32822",
    emissiveIntensity: 0.8,
  }),
  reverse: new MeshStandardMaterial({
    name: "ReverseLights",
    color: "#d5e1e9",
    emissive: "#e6f2ff",
    emissiveIntensity: 0,
  }),
  lens: new MeshPhysicalMaterial({
    name: "Light covers",
    color: "#e8f4fc",
    roughness: 0.05,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: DoubleSide,
  }),
  headlightCover: new MeshPhysicalMaterial({
    name: "Headlight covers",
    color: "#e8f4fc",
    roughness: 0.05,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: DoubleSide,
  }),
  headlightInnerLens: new MeshPhysicalMaterial({
    name: "Headlight inner lenses",
    color: "#d8e8f5",
    roughness: 0.12,
    metalness: 0.05,
    clearcoat: 0.8,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: DoubleSide,
  }),
  taillightCover: new MeshPhysicalMaterial({
    name: "Taillight covers",
    color: "#c81e23",
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: DoubleSide,
  }),
  chassis: new MeshStandardMaterial({
    name: "Chassis steel",
    color: "#343a40",
    metalness: 0.65,
    roughness: 0.55,
    side: DoubleSide,
  }),
  engineBlock: new MeshStandardMaterial({
    name: "Engine block",
    color: "#555d65",
    metalness: 0.75,
    roughness: 0.35,
    side: DoubleSide,
  }),
  valveCover: new MeshStandardMaterial({
    name: "SR20 Red Cam Cover",
    color: "#b91c1c",
    metalness: 0.5,
    roughness: 0.3,
    side: DoubleSide,
  }),
  exhaustBronze: new MeshStandardMaterial({
    name: "Exhaust steel",
    color: "#78716c",
    metalness: 0.85,
    roughness: 0.3,
    side: DoubleSide,
  }),
  suspensionCoil: new MeshStandardMaterial({
    name: "Coilover teal",
    color: "#0d9488",
    metalness: 0.65,
    roughness: 0.3,
    side: DoubleSide,
  }),
  brakeCaliper: new MeshStandardMaterial({
    name: "Brake gold",
    color: "#ca8a04",
    metalness: 0.75,
    roughness: 0.25,
    side: DoubleSide,
  }),
};
// Full set of compatible body panels, glazing, lights, cabin, SR20DET engine, and suspension assemblies.
const selected = new Set([
  // Body panels, lights, glazing, interior:
  0, 2, 3, 4, 5, 6, 11, 17, 20, 21, 22, 26, 27, 47, 63, 69, 75, 77, 79, 80, 88,
  90, 97, 98, 103, 165, 169, 170, 171, 172, 173, 175, 176, 181, 184, 186, 188,
  189, 190, 192, 193, 198, 201, 203, 214, 219, 234, 235, 236, 238, 240, 241,
  250, 254, 256, 272, 275, 276, 283, 284,
  // SR20DET Engine:
  12, 100, 150, 155, 158, 206, 229, 230, 287,
  // Suspension, brakes, subframes, steering & exhaust:
  13, 14, 30, 31, 32, 33, 34, 35, 36, 37, 39, 124, 125, 160, 161, 162, 209, 224,
  226, 242, 251,
]);
const assembled = new Group();
assembled.name = "SilviaS15";
assembled.userData = {
  ...original.asset.extras,
  modifications:
    "Assembled Y-up parts with new materials; restored chassis, engine, suspension and complete light assemblies; preserved named editable parts and wheel prototype.",
};
const body = new Group();
body.name = "Body";
assembled.add(body);
const wheelRoot = new Group();
wheelRoot.name = "Wheel";
assembled.add(wheelRoot);
const categories = new Map();
let sourceTriangles = 0;
gltf.scene.traverse((mesh) => {
  if (!mesh.isMesh) return;
  sourceTriangles +=
    (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
  const id = Number(mesh.name.match(/^mesh(\d*)_/)?.[1] || 0);
  const wheel = id === 44 || id === 289;
  if (!selected.has(id) && !wheel) return;
  if (id === 284 && !mesh.name.includes("frame")) return;
  // The full-surface LED backing is an alternate shell, not a reverse emitter.
  if ([22, 27].includes(id) && !/zadhod_on|rearlights_led|pov_/.test(mesh.name))
    return;
  const chassis = [2, 3, 4, 5, 6, 284].includes(id);
  const engine = [12, 100, 150, 155, 158, 206, 229, 230, 287].includes(id);
  const suspension = [
    13, 14, 30, 31, 32, 33, 34, 35, 36, 37, 39, 124, 125, 160, 161, 162, 209,
    224, 226, 242, 251,
  ].includes(id);
  const rear = [17, 20, 21, 22, 26, 27, 254].includes(id);
  const signal = [176, 184, 193, 201].includes(id);
  const headSmall = [171, 175, 188, 192].includes(id);
  const headBig = [181, 198].includes(id);
  const head = [
    169, 170, 171, 172, 173, 175, 176, 181, 184, 186, 188, 189, 190, 192, 193,
    198, 201, 203, 275, 276,
  ].includes(id);
  const reverse = mesh.name.includes("zadhod_on");
  let material = materials.trim;
  if (/body|frame/.test(mesh.name)) material = materials.paint;
  if ([11, 240, 241].includes(id)) material = materials.paint;
  if (/glass/.test(mesh.name)) material = materials.glass;
  if (/chrome|mechanicals/.test(mesh.name)) material = materials.chrome;
  if (/Tire/.test(mesh.name)) material = materials.tire;
  if (chassis) material = materials.chassis;
  if (engine) {
    if (id === 287) material = materials.valveCover;
    else if ([150, 206].includes(id)) material = materials.chrome;
    else if (id === 155) material = materials.exhaustBronze;
    else material = materials.engineBlock;
  }
  if (suspension) {
    if ([35, 160].includes(id)) material = materials.suspensionCoil;
    else if ([37, 161].includes(id)) material = materials.brakeCaliper;
    else if ([224, 226].includes(id)) material = materials.exhaustBronze;
    else material = materials.chassis;
  }
  if (rear && /rearlights_led|chmsl/.test(mesh.name))
    material = materials.taillight;
  if (headBig) material = materials.headlightBig;
  if (headSmall) material = materials.headlightSmall;
  if (signal) material = materials.signalLight;
  if ([172, 189].includes(id)) material = materials.trim;
  if ([173, 190].includes(id)) material = materials.chrome;
  if ([169, 170].includes(id)) material = materials.headlightCover;
  if ([186, 203].includes(id)) material = materials.headlightInnerLens;
  if ([17, 20].includes(id)) material = materials.taillightCover;
  if (id === 275) material = materials.headlightSmall;
  if (reverse) material = materials.reverse;
  // Vertex data is already in assembled metres, Z-up. Parent matrices are display offsets.
  const geometry = mesh.geometry.clone().rotateX(-Math.PI / 2);
  // Correct inward triangle winding and inward normals on light covers and tires:
  if ([17, 20, 169, 170, 186, 203, 289].includes(id)) {
    const index = geometry.index;
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const second = index.getX(i + 1);
        index.setX(i + 1, index.getX(i + 2));
        index.setX(i + 2, second);
      }
    }
    const normal = geometry.attributes.normal;
    if (normal) {
      for (let i = 0; i < normal.count; i++) {
        normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
      }
    }
    geometry.computeVertexNormals();
  }
  for (const attribute of Object.keys(geometry.attributes))
    if (!["position", "normal"].includes(attribute))
      geometry.deleteAttribute(attribute);
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  if (!flat.attributes.normal) flat.computeVertexNormals();
  const category = reverse
    ? "ReverseLights"
    : chassis
      ? "Chassis"
      : engine
        ? "Engine"
        : suspension
          ? "Suspension"
          : rear
            ? "Taillights"
            : head
              ? "Headlights"
              : "Panels";
  let parent = wheelRoot;
  if (!wheel) {
    if (!categories.has(category)) {
      const group = new Group();
      group.name = category;
      body.add(group);
      categories.set(category, group);
    }
    parent = categories.get(category);
  }
  const part = new Mesh(mergeVertices(flat), material);
  flat.dispose();
  part.name = mesh.name;
  part.userData = {
    sourcePart: id,
    editable: true,
    role: reverse
      ? "reverse"
      : material === materials.taillight
        ? "tail"
        : [169, 170].includes(id)
          ? "head_cover"
          : [186, 203].includes(id)
            ? "head_inner_lens"
            : [17, 20].includes(id)
              ? "tail_cover"
              : headBig
                ? "head"
                : headSmall
                  ? "head_small"
                  : signal
                    ? "signal"
                    : category,
  };
  parent.add(part);
});

// GLTFExporter uses FileReader for binary buffers; Node supplies Blob but not FileReader.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};
const result = await new GLTFExporter().parseAsync(assembled, { binary: true });
const output = fileURLToPath(
  new URL("../../../public/models/silvia-s15.glb", import.meta.url),
);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, Buffer.from(result));
const bodyBounds = new Box3().setFromObject(assembled.getObjectByName("Body"));
console.log(
  JSON.stringify(
    {
      output,
      bytes: result.byteLength,
      originalBytes: bytes.byteLength,
      sourceTriangles,
      bodySize: bodyBounds.getSize(new Vector3()).toArray(),
      bodyBounds: [bodyBounds.min.toArray(), bodyBounds.max.toArray()],
    },
    null,
    2,
  ),
);
