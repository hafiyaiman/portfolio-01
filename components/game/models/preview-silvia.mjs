// Offline geometry preview for assembly QA when a WebGL browser is unavailable.
import fs from "node:fs/promises";
import sharp from "sharp";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Vector3, PerspectiveCamera, Color } from "three";

const data = await fs.readFile(new URL("../../../public/models/silvia-s15.glb", import.meta.url));
const { scene } = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), "");
const prototype = scene.getObjectByName("Wheel");
scene.remove(prototype);
for (const x of [-0.82, 0.82]) for (const z of [-1.29, 1.25]) {
  const wheel = prototype.clone(true);
  wheel.position.set(x, 0.323, z);
  if (x < 0) wheel.rotation.y = Math.PI;
  scene.add(wheel);
}
scene.updateMatrixWorld(true);
const camera = new PerspectiveCamera(40, 1.5, 0.1, 50);
camera.position.set(5, 3.1, process.argv.includes("--front") ? 6 : -6);
camera.lookAt(0, 0.6, 0);
camera.updateMatrixWorld(true);
const light = new Vector3(1, 3, 2).normalize();
const width = 900, height = 600;
const pixels = Buffer.alloc(width * height * 3);
const depthBuffer = new Float32Array(width * height).fill(Infinity);
for (let i = 0; i < pixels.length; i += 3) { pixels[i] = 100; pixels[i + 1] = 118; pixels[i + 2] = 116; }
scene.traverse((mesh) => {
  if (!mesh.isMesh) return;
  const { position } = mesh.geometry.attributes;
  const index = mesh.geometry.index;
  const count = index?.count ?? position.count;
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), normal = new Vector3(), edge = new Vector3();
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2).applyMatrix4(mesh.matrixWorld);
    normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
    const brightness = 0.38 + Math.max(0, normal.dot(light)) * 0.62;
    const color = new Color().copy(mesh.material.color).multiplyScalar(brightness);
    for (const v of [a, b, c]) { v.project(camera); v.x = (v.x + 1) * width / 2; v.y = (1 - v.y) * height / 2; }
    const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(denominator) < 0.0001) continue;
    const hex = color.getHex();
    for (let y = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))); y <= Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y))); y++) {
      for (let x = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))); x <= Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x))); x++) {
        const wa = ((b.y - c.y) * (x + 0.5 - c.x) + (c.x - b.x) * (y + 0.5 - c.y)) / denominator;
        const wb = ((c.y - a.y) * (x + 0.5 - c.x) + (a.x - c.x) * (y + 0.5 - c.y)) / denominator;
        const wc = 1 - wa - wb;
        if (wa < 0 || wb < 0 || wc < 0) continue;
        const depth = wa * a.z + wb * b.z + wc * c.z;
        const pixel = y * width + x;
        if (depth >= depthBuffer[pixel]) continue;
        depthBuffer[pixel] = depth;
        pixels[pixel * 3] = (hex >> 16) & 255;
        pixels[pixel * 3 + 1] = (hex >> 8) & 255;
        pixels[pixel * 3 + 2] = hex & 255;
      }
    }
  }
});
await fs.mkdir(new URL("../../../tmp/", import.meta.url), { recursive: true });
const output = new URL(`../../../tmp/silvia-${process.argv.includes("--front") ? "front" : "rear"}.png`, import.meta.url);
await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toFile(output.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
console.log(output.pathname);
