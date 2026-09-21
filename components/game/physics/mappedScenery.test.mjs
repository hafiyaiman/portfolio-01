import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Mesh, Raycaster, Vector3, DoubleSide } from 'three';
import { loadGeometryGLB } from '../../../scripts/load-gltf-geometry.mjs';

test('Blender rebuild retains every mapped building footprint', async () => {
  const source = (await loadGeometryGLB(await fs.readFile('public/maps/genting/hybrid-scenery.glb'))).scene;
  const target = (await loadGeometryGLB(await fs.readFile('public/maps/genting/blender/course.glb'))).scene;
  source.updateMatrixWorld(true); target.updateMatrixWorld(true);
  const manifest=JSON.parse(await fs.readFile('public/maps/genting/blender/asset-manifest.json'));
  const replaced=new Set([...(manifest.replaced??[]),...(manifest.excluded??[]).map(o=>o.name)]);
  let checked = 0;
  source.traverse(o => {
    if (!(o instanceof Mesh) || !o.name.startsWith('building_')) return;
    if(replaced.has(o.name))return;
    const rebuilt = target.getObjectByName(o.name);
    assert.ok(rebuilt, `Missing mapped building ${o.name}`);
    const a = new Box3().setFromObject(o), b = new Box3().setFromObject(rebuilt);
    const offset=manifest.setbacks?.[o.name];
    if(offset)a.translate(new Vector3(...offset));
    for (const edge of ['min', 'max']) for (const axis of ['x', 'z'])
      assert.ok(Math.abs(a[edge][axis] - b[edge][axis]) < .03, `Footprint moved: ${o.name} ${edge}.${axis}`);
    checked++;
  });
  assert.ok(checked > 100);
  console.log(`Verified ${checked} mapped building footprints.`);
});

test('forest uses eight exported variants and sits on mapped terrain', async () => {
  const forest = JSON.parse(await fs.readFile('public/maps/genting/blender/forest.json'));
  const kit = (await loadGeometryGLB(await fs.readFile('public/maps/genting/blender/tropical-trees.glb'))).scene;
  const course = (await loadGeometryGLB(await fs.readFile('public/maps/genting/blender/course.glb'))).scene;
  course.updateMatrixWorld(true);
  const terrain = course.getObjectByName('Terrain'); terrain.material.side = DoubleSide;
  assert.ok(forest.length > 1000);
  assert.equal(new Set(forest.map(t => t[5])).size, 8);
  for (let i = 0; i < 8; i++) assert.ok(kit.getObjectByName(`TropicalTree_${i}`));
  const ray = new Raycaster();
  for (let i = 0; i < forest.length; i += Math.ceil(forest.length / 50)) {
    const [x, y, z] = forest[i];
    ray.set(new Vector3(x, 5000, z), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(terrain)[0];
    assert.ok(hit && Math.abs(hit.point.y - y) < .03, `Tree ${i} floats or is buried`);
  }
});

test('recognisable landmark models are present at their mapped districts',async()=>{
  const {scene}=await loadGeometryGLB(await fs.readFile('public/maps/genting/blender/course.glb'));scene.updateMatrixWorld(true);
  for(const name of ['Landmark_FirstWorld_Tower_1','Landmark_FirstWorld_Tower_2','Landmark_ChinSwee_Pagoda','Landmark_GentingGrand_Crown'])assert.ok(scene.getObjectByName(name),name);
  for(const name of ['Landmark_FirstWorld_Tower_1','Landmark_FirstWorld_Tower_2']){
    const box=new Box3().setFromObject(scene.getObjectByName(name)),c=box.getCenter(new Vector3());
    assert.ok(c.x>950&&c.x<1400&&c.z>1550&&c.z<1900,`${name} misplaced`);
    assert.ok(box.max.y-box.min.y>=90 && box.max.y-box.min.y<=100);
  }
});

test('scanned foliage exports alpha-cutout textures rather than solid cards',async()=>{
  const bytes=await fs.readFile('public/maps/genting/blender/tropical-trees.glb');
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
  const leaves=gltf.materials.find(m=>m.name==='Scanned broadleaf cutouts');
  assert.ok(leaves?.pbrMetallicRoughness?.baseColorTexture);
  assert.equal(leaves.alphaMode,'MASK');
  assert.ok(gltf.images.length>=2);
});
