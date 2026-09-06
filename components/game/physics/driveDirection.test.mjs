import test from "node:test";
import assert from "node:assert/strict";
import { resolveDrive } from "./driveDirection.ts";

test("reverse input brakes at speed, then engages only after a short stop", () => {
  let state = { direction: 1, stoppedFor: 0 };
  let drive = resolveDrive(state, false, true, 20, 20, 1 / 60);
  assert.equal(drive.braking, true);
  assert.equal(drive.force, 0);
  for (let i = 0; i < 10; i++) { drive = resolveDrive(state, false, true, 0, 0, 1 / 60); state = drive; }
  assert.equal(drive.direction, 1);
  for (let i = 0; i < 10; i++) { drive = resolveDrive(state, false, true, 0, 0, 1 / 60); state = drive; }
  assert.equal(drive.direction, -1);
  assert.equal(drive.force, -1);
  assert.equal(drive.braking, false);
});

test("forward pedal brakes while reversing; simultaneous pedals never accelerate", () => {
  const reverse = { direction: -1, stoppedFor: 0 };
  assert.equal(resolveDrive(reverse, true, false, -5, 5, 1 / 60).braking, true);
  assert.equal(resolveDrive(reverse, true, true, 0, 0, 1).force, 0);
  assert.equal(resolveDrive(reverse, true, true, 0, 0, 1).direction, -1);
  assert.equal(resolveDrive(reverse, true, false, 0, 0, 0.31).direction, 1);
});

test("lateral drift cannot shift to reverse, and releasing pedals keeps selected gear", () => {
  assert.equal(resolveDrive({ direction: 1, stoppedFor: 0 }, false, true, 0, 12, 1).direction, 1);
  const coast = resolveDrive({ direction: -1, stoppedFor: 0 }, false, false, -3, 3, 1);
  assert.equal(coast.direction, -1);
  assert.equal(coast.force, 0);
});
