import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Vector3 } from 'three';
import { loadGeometryGLB } from '../../../scripts/load-gltf-geometry.mjs';
import { ROAD_WIDTH, ROAD_SEGMENTS, roadFrame, createBarrier, createWBeamGuardrail, createShoulderLine, guardRailPostPositions } from '../environment/track.ts';

// Independent geometric check: a roadside object must not lie inside any
// traversable strip, including a different GPX traversal of the same junction.
const centers=Array.from({length:ROAD_SEGMENTS+1},(_,i)=>roadFrame(i/ROAD_SEGMENTS).point);
const bins=new Map();
for(let i=0;i<centers.length-1;i++) {
  const a=centers[i],b=centers[i+1];
  for(let x=Math.floor(Math.min(a.x,b.x)/24);x<=Math.floor(Math.max(a.x,b.x)/24);x++)
    for(let z=Math.floor(Math.min(a.z,b.z)/24);z<=Math.floor(Math.max(a.z,b.z)/24);z++) {
      const key=`${x}:${z}`; if(!bins.has(key))bins.set(key,[]); bins.get(key).push(i);
    }
}
function clearance(p) {
  let distance=Infinity;
  for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)
    for(const i of bins.get(`${Math.floor(p.x/24)+x}:${Math.floor(p.z/24)+z}`)??[]) {
      const a=centers[i],b=centers[i+1],dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
      distance=Math.min(distance,Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz));
    }
  return distance;
}
for(const [name,build] of [['collision wall',createBarrier],['visible rail',createWBeamGuardrail]]) {
  test(`${name} never crosses the pavement at overlapping routes or folded hairpins`,()=>{
    const bad=[]; let checked=0;
    for(const side of [-1,1]) {
      const g=build(side),p=g.attributes.position,index=g.index;
      for(let i=0;i<index.count;i+=3) {
        const points=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,index.getX(i+j)));
        points.push(points[0].clone().add(points[1]).add(points[2]).divideScalar(3));
        for(const point of points)if(clearance(point)<ROAD_WIDTH/2-0.05) {bad.push(point.toArray());break;}
        checked++;
      }
      g.dispose();
    }
    assert.ok(checked>1000,'Must preserve ordinary roadside barriers');
    assert.equal(bad.length,0,`${bad.length} triangles obstruct pavement; first ${JSON.stringify(bad[0])}`);
  });
}
test('guardrail support posts stay outside pavement',()=>{
  const bad=guardRailPostPositions.filter(({position})=>clearance(position)<ROAD_WIDTH/2-0.05);
  assert.equal(bad.length,0,`${bad.length} posts obstruct pavement`);
});

test('shoulder paint does not fold into the driving lane',()=>{
  for(const side of [-1,1]) {
    const g=createShoulderLine(side),p=g.attributes.position;
    for(const i of g.index.array) {
      const point=new Vector3().fromBufferAttribute(p,i);
      assert.ok(clearance(point)>ROAD_WIDTH/2-0.4,`Folded shoulder paint at ${point.toArray()}`);
    }
    g.dispose();
  }
});

test('exported roadside sign and lamp placements avoid overlapping pavement',async()=>{
  const data=JSON.parse(await fs.readFile('tmp/genting-blender/course.json','utf8'));
  for(const item of [...data.signs,...data.lamps,...data.chevrons])
    assert.ok(clearance(new Vector3(...item.p))>ROAD_WIDTH/2+0.4,`Roadside decoration obstructs pavement at ${item.p}`);
});

test('shipped Blender rails, collision walls and shoulder paint leave lanes clear',async()=>{
  const {scene}=await loadGeometryGLB(await fs.readFile('public/maps/genting/blender/course.glb'));
  scene.updateMatrixWorld(true);
  for(const name of ['Rail_-1','Rail_1','CollisionRail_-1','CollisionRail_1','Edge_-1','Edge_1']) {
    const mesh=scene.getObjectByName(name);
    assert.ok(mesh,`Missing ${name}`);
    const g=mesh.geometry,p=g.attributes.position,index=g.index;
    for(let i=0;i<(index?.count??p.count);i+=3) {
      const points=[0,1,2].map(j=>new Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
      points.push(points[0].clone().add(points[1]).add(points[2]).divideScalar(3));
      const minimum=ROAD_WIDTH/2-(name.startsWith('Edge_')?0.4:0.05);
      for(const point of points)assert.ok(clearance(point)>=minimum,`${name} blocks pavement at ${point.toArray()}`);
    }
  }
});
