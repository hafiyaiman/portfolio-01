// Offline source-part contact sheet for distinguishing wings from trunk panels.
import fs from 'node:fs';
import sharp from 'sharp';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Vector3, PerspectiveCamera } from 'three';
const bytes = fs.readFileSync(process.argv[2]);
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const ids = process.argv[3] ? process.argv[3].split(',').map(Number) : [11, 283, 47, 48, 51, 52, 53, 54];
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600"><rect width="1000" height="600" fill="#243036"/>';
const camera = new PerspectiveCamera(40, 1.66, 0.1, 20);
const front = process.argv.includes('--front');
camera.position.set(front ? -2.4 : 2.4, 2, front ? 4 : -4);
camera.lookAt(0, 0.85, front ? 1 : -1.7);
camera.updateMatrixWorld();
ids.forEach((id, tile) => {
  const triangles = [];
  scene.traverse(mesh => {
    if (!mesh.isMesh || Number(mesh.name.match(/^mesh(\d*)_/)?.[1] || 0) !== id) return;
    const geometry = mesh.geometry.clone().rotateX(-Math.PI / 2);
    const p = geometry.attributes.position, index = geometry.index;
    for (let i = 0; i < (index?.count ?? p.count); i += 3) {
      const vertices = [0, 1, 2].map(o => new Vector3().fromBufferAttribute(p, index ? index.getX(i + o) : i + o));
      const normal = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();
      const shade = Math.round(130 + 100 * Math.abs(normal.y));
      vertices.forEach(v => v.project(camera));
      triangles.push({ depth: vertices.reduce((sum, v) => sum + v.z, 0), points: vertices.map(v => [(v.x + 1) * 125 + tile % 4 * 250, (1 - v.y) * 125 + Math.floor(tile / 4) * 300]), shade });
    }
    geometry.dispose();
  });
  triangles.sort((a, b) => b.depth - a.depth);
  for (const t of triangles) svg += `<polygon points="${t.points.map(p => p.join(',')).join(' ')}" fill="rgb(${t.shade},${t.shade},${t.shade})"/>`;
  svg += `<text x="${tile % 4 * 250 + 15}" y="${Math.floor(tile / 4) * 300 + 280}" fill="white" font-size="20">Part ${id}</text>`;
});
await sharp(Buffer.from(svg + '</svg>')).png().toFile('tmp/spoiler-parts.png');
