import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Mesh, Raycaster, Vector3, DoubleSide } from 'three';
import { loadGeometryGLB } from '../../../scripts/load-gltf-geometry.mjs';
import { ROAD_WIDTH, ROAD_LENGTH, roadFrame, roadSurfaceHeightAt, createRoadStrip } from '../environment/track.ts';

test('Blender pavement preserves the widened driving surface and clears terrain', async () => {
  const { scene } = await loadGeometryGLB(await fs.readFile('public/maps/genting/blender/course.glb'));
  scene.updateMatrixWorld(true);
  const road=scene.getObjectByName('Pavement'), terrain=scene.getObjectByName('Terrain');
  assert.ok(road instanceof Mesh); assert.ok(terrain instanceof Mesh);
  const source=createRoadStrip(ROAD_WIDTH);
  // Compare world-space exported vertices, allowing Blender/glTF to reorder them.
  const expected=new Set();
  const key=p=>p.toArray().map(n=>n.toFixed(2)).join(':');
  for(let i=0;i<source.attributes.position.count;i++) expected.add(key(new Vector3().fromBufferAttribute(source.attributes.position,i)));
  for(let i=0;i<road.geometry.attributes.position.count;i++) {
    const p=new Vector3().fromBufferAttribute(road.geometry.attributes.position,i).applyMatrix4(road.matrixWorld);
    assert.ok(expected.has(key(p)),`Export altered pavement at ${p.toArray()}`);
  }
  road.material.side=DoubleSide; terrain.material.side=DoubleSide;
  const ray=new Raycaster();
  let checks=0;
  for(let d=10;d<ROAD_LENGTH-10;d+=45) {
    const {point,right}=roadFrame(d/ROAD_LENGTH);
    for(const offset of [-8,-4,0,4,8]) {
      const p=point.clone().addScaledVector(right,offset); p.y=roadSurfaceHeightAt(p.x,p.z);
      ray.set(p.clone().add(new Vector3(0,3,0)),new Vector3(0,-1,0));
      const hit=ray.intersectObject(road)[0];
      assert.ok(hit,`Missing pavement at ${d}m / offset ${offset}`);
      assert.ok(Math.abs(hit.point.y-p.y)<0.22,`Pavement discontinuity at ${d}m`);
      const ground=ray.intersectObject(terrain)[0];
      assert.ok(!ground || ground.point.y<hit.point.y+0.03,`Terrain intrudes at ${d}m`);
      checks++;
    }
  }
  for(const side of [-1,1]) {
    const rail=scene.getObjectByName(`Rail_${side}`), wall=scene.getObjectByName(`CollisionRail_${side}`);
    assert.ok(rail instanceof Mesh); assert.ok(wall instanceof Mesh);
    assert.equal(rail.geometry.attributes.position.count>0,true);
  }
  source.dispose();
  console.log(`Verified ${checks} wide-course ground contacts against exported Blender meshes.`);
});
