// Shared driving geometry -> Blender. Run with node --experimental-strip-types.
import fs from 'node:fs/promises';
import { Vector3 } from 'three';
import { isRoadsidePosition, roadSurfaceHeightAt, ROUTE_INFO } from '../components/game/environment/track.ts';
import { ROAD_WIDTH, ROAD_LENGTH, SPAWN_DISTANCE, roadFrame, terrainHeightAt, createTerrain, createRoadStrip, createBarrier, createWBeamGuardrail, createRoadCurb, createShoulderLine, createCenterMarkings, createYellowRumbleStrips, createRoadVerge, guardRailPostPositions } from '../components/game/environment/track.ts';
const meshes = [];
function mesh(name, geometry, material) {
  meshes.push({name, material, positions: Array.from(geometry.attributes.position.array), indices: Array.from(geometry.index.array), colors: geometry.attributes.color ? Array.from(geometry.attributes.color.array) : undefined});
  geometry.dispose();
}
mesh('Terrain', createTerrain(), 'Forest floor');
mesh('Pavement', createRoadStrip(ROAD_WIDTH), 'Asphalt');
mesh('Shoulder', createRoadStrip(ROAD_WIDTH + 2, 0, -0.08), 'Concrete');
mesh('Verge', createRoadVerge(), 'Forest floor');
for (const s of [-1, 1]) {
  mesh(`Rail_${s}`, createWBeamGuardrail(s), 'Galvanized steel');
  mesh(`CollisionRail_${s}`, createBarrier(s), 'Galvanized steel');
  mesh(`Curb_${s}`, createRoadCurb(s), 'Concrete');
  mesh(`Edge_${s}`, createShoulderLine(s), 'White paint');
}
const center = createCenterMarkings();
mesh('Center_A', center.dashed, 'White paint');
mesh('Center_B', center.solid, 'White paint');
mesh('Rumble', createYellowRumbleStrips(), 'Hazard yellow');
// Explicit count keeps placement reproducible across Node versions.
const count = Math.ceil(ROAD_LENGTH / 5);
const samples = Array.from({length: count + 1}, (_, i) => roadFrame(i / count).point);
const bins = new Map();
for (const p of samples) { const k = `${Math.floor(p.x / 32)}:${Math.floor(p.z / 32)}`; if (!bins.has(k)) bins.set(k, []); bins.get(k).push(p); }
function distance(x, z) {
  let d = Infinity;
  for (let ix = -2; ix <= 2; ix++) for (let iz = -2; iz <= 2; iz++) for (const p of bins.get(`${Math.floor(x / 32) + ix}:${Math.floor(z / 32) + iz}`) ?? []) d = Math.min(d, Math.hypot(x - p.x, z - p.z));
  return d;
}
let seed = 9281;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const trees = [];
const minX = Math.min(...samples.map(p => p.x)) - 220, maxX = Math.max(...samples.map(p => p.x)) + 220;
const minZ = Math.min(...samples.map(p => p.z)) - 220, maxZ = Math.max(...samples.map(p => p.z)) + 220;
for (let x = minX; x < maxX; x += 18) for (let z = minZ; z < maxZ; z += 18) {
  const px = x + random() * 10, pz = z + random() * 10;
  if (distance(px, pz) < ROAD_WIDTH / 2 + 10) continue;
  trees.push([px, terrainHeightAt(px, pz), pz, 1.0 + random() * .8, random() * Math.PI * 2, Math.floor(random() * 4)]);
}
// Ferns and shrubs fill the verge and understory visible from the driver's seat.
for(let x=minX;x<maxX;x+=9) for(let z=minZ;z<maxZ;z+=9){
  const px=x+random()*7,pz=z+random()*7,d=distance(px,pz);
  if(d<ROAD_WIDTH/2+7 || d>90 || random()<.23)continue;
  trees.push([px,terrainHeightAt(px,pz),pz,.8+random()*.6,random()*Math.PI*2,4+Math.floor(random()*4)]);
}
function anchor(d, offset) {
  const {point, right, tangent} = roadFrame(Math.min(1, d / ROAD_LENGTH));
  point.addScaledVector(right, offset);
  point.y = terrainHeightAt(point.x, point.z);
  return {p: point.toArray(), yaw: Math.atan2(tangent.x, tangent.z)};
}
const signs = [
  {...anchor(SPAWN_DISTANCE + 35, -13), title: 'GENTING HIGHLANDS', subtitle: 'Selamat datang  /  Welcome'},
  {...anchor(SPAWN_DISTANCE + 150, -13), title: 'AWAS', subtitle: 'SELEKOH TAJAM'},
  ...Array.from({length: Math.floor(ROAD_LENGTH / 600)}, (_, i) => ({...anchor(650 + i * 600, -13), title: i % 2 ? 'GENTING HIGHLANDS' : 'KURANGKAN LAJU', subtitle: i % 2 ? 'Chin Swee  /  Gohtong Jaya' : 'Jalan berliku  /  Ikut kiri'})),
];
const lamps = Array.from({length: Math.floor(ROAD_LENGTH / 55)}, (_, i) => anchor(20 + i * 55, ROAD_WIDTH / 2 + 1.7));
const chevrons = [];
for (let d = 25; d < ROAD_LENGTH - 25; d += 22) {
  const a = roadFrame((d - 10) / ROAD_LENGTH).tangent, b = roadFrame((d + 10) / ROAD_LENGTH).tangent;
  if (a.dot(b) < 0.97) chevrons.push(anchor(d, a.x * b.z - a.z * b.x > 0 ? -11.3 : 11.3));
}
const forest = trees;
// Shared road field constrains the continuous Blender terrain under every lane.
const terrainStep = 6;
const terrainBounds = [Math.floor((minX-400)/terrainStep)*terrainStep, Math.floor((minZ-400)/terrainStep)*terrainStep, Math.ceil((maxX+400)/terrainStep)*terrainStep, Math.ceil((maxZ+400)/terrainStep)*terrainStep];
const terrainRoad = [];
for(let z=terrainBounds[1];z<=terrainBounds[3];z+=terrainStep) for(let x=terrainBounds[0];x<=terrainBounds[2];x+=terrainStep){
  const d=distance(x,z), h=d<65?roadSurfaceHeightAt(x,z):NaN;
  terrainRoad.push([Number.isFinite(d)?d:999,Number.isFinite(h)?h-1.8:null]);
}
const retaining = Array.from({length: 111}, (_,i) => anchor(100+i*4, 13));
// A placement on one route edge can be in another route's lane at overlaps.
for (const list of [signs, lamps, chevrons]) {
  for (let i=list.length-1;i>=0;i--) {
    if (!isRoadsidePosition(new Vector3(...list[i].p), ROAD_WIDTH / 2 + 0.6)) list.splice(i,1);
  }
}
await fs.writeFile('tmp/genting-blender/course.json', JSON.stringify({width: ROAD_WIDTH, length: ROAD_LENGTH, meshes, signs, lamps, chevrons, retaining, posts: guardRailPostPositions.map(({position}) => position.toArray()), spawn: anchor(SPAWN_DISTANCE, 0), trees: forest, roadSamples:samples.map(p=>p.toArray()), origin:ROUTE_INFO.origin, terrainGrid:{step:terrainStep,bounds:terrainBounds,road:terrainRoad}}));
console.log(`Exported ${meshes.length} meshes, ${trees.length} trees, ${signs.length} signs. Road width: ${ROAD_WIDTH}m`);
