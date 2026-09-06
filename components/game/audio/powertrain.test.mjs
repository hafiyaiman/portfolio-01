import test from "node:test";
import assert from "node:assert/strict";
import { engineRpm, selectGear } from "./powertrain.ts";

test("gear hysteresis prevents repeated shifts around the same speed", () => {
  let gear = selectGear(12.1, 1);
  assert.equal(gear, 2);
  for (const speed of [11.9, 12.1, 11.5, 10, 9.1]) {
    gear = selectGear(speed, gear);
    assert.equal(gear, 2);
  }
  assert.equal(selectGear(8.9, gear), 1);
  assert.equal(selectGear(90, 5), 5);
  assert.equal(selectGear(0, 1), 1);
});

test("RPM rises with road speed, drops on upshift and has idle/redline limits", () => {
  assert.equal(engineRpm(0, 1, 0, 4), 950);
  assert.ok(engineRpm(10, 1, 1, 4) > engineRpm(5, 1, 1, 4));
  assert.ok(engineRpm(13, 2, 1, 4) < engineRpm(13, 1, 1, 4));
  assert.ok(engineRpm(0, 1, 1, 0) > engineRpm(0, 1, 0, 0));
  assert.equal(engineRpm(200, 5, 1, 4), 7600);
});
