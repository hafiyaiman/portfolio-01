import test from 'node:test';
import assert from 'node:assert/strict';
import { tireMix } from './tireMix.ts';

const drift = { speed: 72, angle: 28, tireSlip: 0.7, grounded: 4, braking: false };

test('tire sound requires movement, contact and a slide or braking skid', () => {
  assert.ok(tireMix(drift, true).intensity > 0.5);
  for (const override of [{ speed: 9 }, { grounded: 0 }, { grounded: 1 }, { angle: 0 }, { tireSlip: 0.1 }]) {
    assert.equal(tireMix({ ...drift, ...override }, true).intensity, 0);
  }
  assert.equal(tireMix(drift, false).intensity, 0);
  assert.ok(tireMix({ ...drift, angle: 0, braking: true }, true).intensity > 0);
});

test('left and right drifts have equal volume and bounded playback', () => {
  assert.deepEqual(tireMix(drift, true), tireMix({ ...drift, angle: -28 }, true));
  for (const speed of [10, 36, 72, 180, 320]) {
    const mix = tireMix({ ...drift, speed, tireSlip: 2 }, true);
    assert.ok(mix.intensity >= 0 && mix.intensity <= 1);
    assert.ok(mix.playbackRate >= 0.94 && mix.playbackRate <= 1.15);
  }
});
