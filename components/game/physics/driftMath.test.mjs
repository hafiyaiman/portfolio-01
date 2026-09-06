import test from "node:test";
import assert from "node:assert/strict";
import { driftScore, slipAngle, tireForce } from "./driftMath.ts";

test("tire force opposes slip with symmetric response and finite standstill math", () => {
  assert.equal(slipAngle(0, 0), 0);
  assert.ok(Number.isFinite(slipAngle(2, 0)));
  const positive = tireForce(0.2, 2700, false, false);
  const negative = tireForce(-0.2, 2700, false, false);
  assert.ok(positive.lateral < 0);
  assert.equal(positive.lateral, -negative.lateral);
  assert.ok(Math.abs(positive.lateral) <= positive.limit);
  assert.equal(tireForce(0.5, 0, false, false).lateral, -0);
});

test("traction uses separate breakaway and recovery thresholds", () => {
  assert.equal(tireForce(0.1, 2700, false, false).sliding, true);
  assert.equal(tireForce(0.06, 2700, true, false).sliding, true);
  assert.equal(tireForce(0.06, 2700, false, false).sliding, false);
  assert.equal(tireForce(0.02, 2700, true, false).sliding, false);
  assert.ok(tireForce(0.2, 2700, false, true).limit < tireForce(0.2, 2700, true, false).limit);
});

test("scoring rejects airborne, reverse, low-speed, straight and spun-out cars", () => {
  for (const [angle, speed, grounded, forward] of [[0, 20, 4, 20], [0.5, 7, 4, 7], [0.5, 20, 2, 20], [0.5, 20, 4, -20], [1.5, 20, 4, 20]]) {
    assert.equal(driftScore(angle, speed, 2, 1 / 60, grounded, forward).points, 0);
  }
});

test("score scales with duration, speed and angle and stays timestep independent", () => {
  const score = (angle, speed, duration, dt) => driftScore(angle, speed, duration, dt, 4, speed);
  assert.ok(score(0.8, 20, 2, 1).points > score(0.3, 20, 2, 1).points);
  assert.equal(score(0.5, 40, 2, 1).points, score(0.5, 20, 2, 1).points * 2);
  assert.ok(score(0.5, 20, 5, 1).points > score(0.5, 20, 1, 1).points);
  assert.ok(Math.abs(score(0.5, 20, 2, 1 / 60).points * 60 - score(0.5, 20, 2, 1 / 120).points * 120) < 1e-8);
});
