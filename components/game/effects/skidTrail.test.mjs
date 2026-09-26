import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { SkidTrail } from './skidTrail.ts';

const contact = z => ({ point: new Vector3(0, 2, z), normal: new Vector3(0, 1, 0), right: new Vector3(1, 0, 0) });
test('a new skid segment uploads only its changed vertices, including ring wrap', () => {
  const trail = new SkidTrail(4);
  const position = trail.geometry.attributes.position;
  const color = trail.geometry.attributes.color;
  trail.sample(0, contact(0), 1);
  trail.sample(0, contact(0.2), 1);
  trail.commit();
  assert.deepEqual(position.updateRanges, [{ start: 0, count: 12 }]);
  assert.deepEqual(color.updateRanges, [{ start: 0, count: 16 }]);
  position.clearUpdateRanges(); color.clearUpdateRanges();
  for (const z of [0.4, 0.6]) trail.sample(0, contact(z), 1);
  trail.commit();
  position.clearUpdateRanges(); color.clearUpdateRanges();
  for (const z of [0.8, 1]) trail.sample(0, contact(z), 1);
  trail.commit();
  assert.deepEqual(position.updateRanges, [{ start: 36, count: 12 }, { start: 0, count: 12 }]);
  assert.deepEqual(color.updateRanges, [{ start: 48, count: 16 }, { start: 0, count: 16 }]);
  const version = position.version;
  trail.commit();
  assert.equal(position.version, version, 'Idle frames must not trigger another upload');
  trail.geometry.dispose();
});

test('multiple physics commits preserve pending uploads until the renderer consumes them', () => {
  const trail = new SkidTrail(4);
  trail.sample(0, contact(0), 1);
  trail.sample(0, contact(0.2), 1); trail.commit();
  trail.sample(0, contact(0.4), 1); trail.commit();
  assert.deepEqual(trail.geometry.attributes.position.updateRanges,
    [{ start: 0, count: 12 }, { start: 12, count: 12 }]);
  trail.geometry.dispose();
});
test('marks stay at deposited road positions and do not bridge separate skids', () => {
  const trail = new SkidTrail(8);
  trail.sample(0, contact(0), 1);
  trail.sample(0, contact(0.2), 1);
  trail.commit();
  const first = [...trail.positions.slice(0, 12)];
  assert.ok(Math.abs(first[1] - 2.008) < 0.0001);
  trail.sample(0, contact(1), 0);
  trail.sample(0, contact(20), 1);
  trail.commit();
  assert.equal(trail.geometry.drawRange.count, 6);
  trail.sample(0, contact(20.2), 1);
  trail.commit();
  assert.deepEqual([...trail.positions.slice(0, 12)], first);
  assert.equal(trail.geometry.drawRange.count, 12);
  assert.ok(trail.positions[14] >= 20);
  trail.geometry.dispose();
});

test('buffer wrap, teleport and stationary samples cannot produce long ribbons', () => {
  const trail = new SkidTrail(2);
  for (let i = 0; i < 20; i++) trail.sample(0, contact(i * 0.2), 1);
  trail.commit();
  assert.equal(trail.geometry.drawRange.count, 12);
  for (let i = 0; i < 2; i++) assert.ok(Math.abs(trail.positions[i * 12 + 8] - trail.positions[i * 12 + 2]) < 0.21);
  const saved = [...trail.positions];
  trail.sample(0, contact(100), 1);
  trail.sample(0, contact(100), 1);
  assert.deepEqual([...trail.positions], saved);
  trail.geometry.dispose();
});
