// Offline geometry QA when an interactive WebGL browser is unavailable.
// node --experimental-strip-types components/game/environment/preview-terrain.mjs
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Color, PerspectiveCamera, Vector3 } from 'three';
import { createTerrain, createRoadStrip, createRoadVerge, createBarrier, roadFrame } from './track.ts';
const sharp = createRequire(import.meta.resolve('next'))('sharp');

const terrain = createTerrain();
const surfaces = [
  { geometry: terrain, color: '#5c7442', vertexColors: true },
  { geometry: createRoadVerge(), color: '#65704e' },
  { geometry: createRoadStrip(14, 0, -0.08), color: '#64705b' },
  { geometry: createRoadStrip(10), color: '#555b59' },
  { geometry: createRoadStrip(0.12, -4.6, 0.025), color: '#e2e0cc' },
  { geometry: createRoadStrip(0.12, 4.6, 0.025), color: '#e2e0cc' },
  { geometry: createRoadStrip(0.1, 0, 0.028), color: '#d5bd69' },
  { geometry: createBarrier(-1), color: '#919a92' },
  { geometry: createBarrier(1), color: '#919a92' },
];
await fs.mkdir(new URL('../../../tmp/', import.meta.url), { recursive: true });
for (const [name, t] of [['lower', 0.04], ['switchback', 0.63]]) {
  const width = 1100, height = 700;
  const camera = new PerspectiveCamera(58, width / height, 0.1, 900);
  const frame = roadFrame(t);
  camera.position.copy(frame.point).addScaledVector(frame.right, -65).addScaledVector(frame.tangent, -65);
  camera.position.y += 48;
  camera.lookAt(frame.point.clone().addScaledVector(frame.tangent, 45));
  camera.updateMatrixWorld(true);
  const pixels = Buffer.alloc(width * height * 3);
  const depths = new Float32Array(width * height).fill(Infinity);
  for (let i = 0; i < pixels.length; i += 3) { pixels[i] = 182; pixels[i + 1] = 203; pixels[i + 2] = 209; }
  const light = new Vector3(0.4, 1, -0.3).normalize();
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), normal = new Vector3(), edge = new Vector3();
  const color = new Color();
  for (const surface of surfaces) {
    const { position, color: colors } = surface.geometry.attributes;
    const indices = surface.geometry.index;
    const base = new Color(surface.color);
    for (let i = 0; i < indices.count; i += 3) {
      const ia = indices.getX(i), ib = indices.getX(i + 1), ic = indices.getX(i + 2);
      a.fromBufferAttribute(position, ia); b.fromBufferAttribute(position, ib); c.fromBufferAttribute(position, ic);
      if (a.distanceToSquared(camera.position) > 900 ** 2) continue;
      normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
      if (surface.vertexColors) color.setRGB(colors.getX(ia), colors.getY(ia), colors.getZ(ia));
      else color.copy(base);
      color.multiplyScalar(0.6 + Math.max(0, normal.dot(light)) * 0.65);
      const hex = color.getHex();
      for (const v of [a, b, c]) v.project(camera);
      if ([a, b, c].some(v => v.z < -1 || v.z > 1)) continue;
      for (const v of [a, b, c]) { v.x = (v.x + 1) * width / 2; v.y = (1 - v.y) * height / 2; }
      const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
      if (Math.abs(denominator) < 1e-6) continue;
      const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))), maxX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
      const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))), maxY = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const u = ((b.y - c.y) * (x + 0.5 - c.x) + (c.x - b.x) * (y + 0.5 - c.y)) / denominator;
        const v = ((c.y - a.y) * (x + 0.5 - c.x) + (a.x - c.x) * (y + 0.5 - c.y)) / denominator;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const depth = u * a.z + v * b.z + (1 - u - v) * c.z;
        const pixel = y * width + x;
        if (depth >= depths[pixel]) continue;
        depths[pixel] = depth;
        pixels[pixel * 3] = (hex >> 16) & 255;
        pixels[pixel * 3 + 1] = (hex >> 8) & 255;
        pixels[pixel * 3 + 2] = hex & 255;
      }
    }
  }
  const output = new URL(`../../../tmp/terrain-${name}.png`, import.meta.url);
  await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toFile(output.pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  console.log(output.pathname);
}
surfaces.forEach(({ geometry }) => geometry.dispose());
