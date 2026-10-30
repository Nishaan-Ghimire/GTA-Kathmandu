import test from "node:test";
import assert from "node:assert/strict";
import { DeliveryMission, MISSION } from "../src/data/mission";
import { MAP, buildings } from "../src/data/map";
test("delivery requires a sustained stop, then supports completion and replay", () => {
  const m = new DeliveryMission();
  m.update(2, MISSION.pickup, 10);
  assert.equal(m.phase, "pickup");
  m.update(0.8, MISSION.pickup, 0);
  m.update(0.1, { x: 0, z: 0 }, 0);
  assert.equal(m.stopped, 0);
  m.update(1.3, MISSION.pickup, 0);
  assert.equal(m.phase, "delivery");
  m.update(1.3, MISSION.pickup, 0);
  assert.equal(m.phase, "delivery");
  m.update(1.3, MISSION.dropoff, 0);
  assert.equal(m.phase, "complete");
  assert.equal(m.completed, 1);
  const time = m.elapsed;
  m.update(10, MISSION.dropoff, 0);
  assert.equal(m.elapsed, time);
  m.restart();
  assert.equal(m.phase, "pickup");
  assert.equal(m.elapsed, 0);
  assert.equal(m.stopped, 0);
  m.update(1.3, MISSION.pickup, 0);
  m.update(1.3, MISSION.dropoff, 0);
  assert.equal(m.completed, 2);
});
test("generated buildings never obstruct roads or the courtyard", () => {
  for (const b of buildings())
    for (const r of [...MAP.roads, MAP.courtyard])
      assert.ok(
        Math.abs(b.x - r.x) >= (b.w + r.w) / 2 + 5 ||
          Math.abs(b.z - r.z) >= (b.d + r.d) / 2 + 5,
      );
});
