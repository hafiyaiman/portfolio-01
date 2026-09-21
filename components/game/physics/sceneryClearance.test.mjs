import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, Mesh, Raycaster, Vector3, DoubleSide } from 'three';
import { loadGeometryGLB } from '../../../scripts/load-gltf-geometry.mjs';
import { roadFrame, ROAD_LENGTH, ROAD_WIDTH } from '../environment/track.ts';

const {scene}=await loadGeometryGLB(await fs.readFile('public/maps/genting/blender/course.glb'));
scene.updateMatrixWorld(true);
test('buildings leave the entire GPX driving corridor clear', async()=>{
  const buildings=[];
  scene.traverse(o=>{
    if(!(o instanceof Mesh)) return;
    let root=o;
    while(root && !root.name.startsWith('building_') && !root.name.startsWith('Landmark_')) root=root.parent;
    if(!root) return;
    o.material.side=DoubleSide;
    buildings.push({mesh:o,name:root.name,bounds:new Box3().setFromObject(o)});
  });
  const ray=new Raycaster(), violations=new Map();
  for(let d=0;d<ROAD_LENGTH;d+=3){
    const {point,right}=roadFrame(d/ROAD_LENGTH);
    for(const offset of [-ROAD_WIDTH/2,-6,-3,0,3,6,ROAD_WIDTH/2]){
      const p=point.clone().addScaledVector(right,offset);
      ray.set(new Vector3(p.x,5000,p.z),new Vector3(0,-1,0));
      for(const b of buildings){
        if(p.x<b.bounds.min.x||p.x>b.bounds.max.x||p.z<b.bounds.min.z||p.z>b.bounds.max.z||b.bounds.max.y<p.y+.3)continue;
        const hit=ray.intersectObject(b.mesh,false)[0];
        if(hit && hit.point.y>p.y+.3)violations.set(b.name,{name:b.name,d,offset,point:p.toArray(),roof:hit.point.y});
      }
    }
  }
  await fs.writeFile('tmp/genting-blender/blocked-buildings.json',JSON.stringify([...violations.values()],null,2));
  assert.equal(violations.size,0,`${violations.size} buildings cover the driving corridor; see blocked-buildings.json`);
});

test('mountain is a continuous closed mesh without cracks or missing faces',()=>{
  const terrain=scene.getObjectByName('Terrain'), geometry=terrain.geometry;
  const p=geometry.attributes.position, idx=geometry.index;
  const edges=new Map();
  const keys=Array.from({length:p.count},(_,i)=>new Vector3().fromBufferAttribute(p,i).applyMatrix4(terrain.matrixWorld).toArray().map(n=>n.toFixed(3)).join(','));
  for(let i=0;i<(idx?.count??p.count);i+=3){
    const triangle=[0,1,2].map(j=>keys[idx?idx.getX(i+j):i+j]);
    for(let j=0;j<3;j++){
      const edge=[triangle[j],triangle[(j+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);
    }
  }
  const open=[...edges.values()].filter(n=>n!==2).length;
  assert.equal(open,0,`${open} unmatched/non-manifold terrain edges`);
});
