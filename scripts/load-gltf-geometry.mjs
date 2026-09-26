import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Load geometry offline without browser image APIs; retain textures in source GLB.
export async function loadGeometryGLB(bytes) {
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
  gltf.materials = gltf.materials.map(() => ({})); gltf.images = []; gltf.textures = [];
  const json = Buffer.from(JSON.stringify(gltf));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const header = Buffer.from(bytes.subarray(0, 20)), tail = bytes.subarray(20 + jsonLength);
  header.writeUInt32LE(20 + padded.length + tail.length, 8); header.writeUInt32LE(padded.length, 12);
  const model = Buffer.concat([header, padded, tail]);
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(model.buffer.slice(model.byteOffset, model.byteOffset + model.byteLength), '');
}
