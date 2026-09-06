// Export only alternate panels; never overwrite the assembled driving asset.
import fs from 'node:fs/promises';
import { Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, DoubleSide } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { CUSTOM_PARTS } from '../garage/catalog.ts';
const bytes = await fs.readFile(process.argv[2]);
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
// Derive ownership from the base asset so new catalog entries cannot duplicate it.
const baseBytes = await fs.readFile(new URL('../../../public/models/silvia-s15.glb', import.meta.url));
const base = JSON.parse(baseBytes.toString('utf8', 20, 20 + baseBytes.readUInt32LE(12)));
const original = new Set(base.nodes.filter(node => node.mesh !== undefined).map(node => node.extras?.sourcePart));
const root = new Group();
root.name = 'Customization';
root.userData = { source: 'User-supplied Nissan Silvia S15 by ZapupaNekra', license: 'CC BY 4.0', modifications: 'Selected alternate panels, assembled coordinates, replacement materials' };
const paint = new MeshPhysicalMaterial({ name: 'Silvia pearl silver', color: '#bbc7ce', metalness: 0.68, roughness: 0.25, clearcoat: 1, side: DoubleSide });
const trim = new MeshStandardMaterial({ name: 'Graphite trim', color: '#151b20', roughness: 0.65, side: DoubleSide });
scene.traverse(mesh => {
  if (!mesh.isMesh) return;
  const partId = Number(mesh.name.match(/^mesh(\d*)_/)?.[1] || 0);
  if (!CUSTOM_PARTS.has(partId) || original.has(partId)) return;
  const geometry = mesh.geometry.clone().rotateX(-Math.PI / 2);
  for (const key of Object.keys(geometry.attributes)) if (!['position', 'normal'].includes(key)) geometry.deleteAttribute(key);
  const part = new Mesh(mergeVertices(geometry), /body/.test(mesh.name) || partId === 10 ? paint : trim);
  part.name = mesh.name;
  part.userData = { sourcePart: partId, editable: true };
  root.add(part);
});
globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); } };
const output = await new GLTFExporter().parseAsync(root, { binary: true });
await fs.writeFile(new URL('../../../public/models/silvia-customization.glb', import.meta.url), Buffer.from(output));
console.log(`Exported ${root.children.length} alternate meshes; ${output.byteLength} bytes`);
