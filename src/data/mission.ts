import type { Point } from "./map";
export const MISSION = {
  pickup: { x: -76, z: 96 } satisfies Point,
  dropoff: { x: 87, z: -42 } satisfies Point,
  radius: 7,
  stopSpeed: 1.2,
  dwell: 1.25,
};
export type MissionPhase = "pickup" | "delivery" | "complete";
export class DeliveryMission {
  phase: MissionPhase = "pickup";
  elapsed = 0;
  stopped = 0;
  completed = 0;
  get target() {
    return this.phase === "pickup" ? MISSION.pickup : MISSION.dropoff;
  }
  update(dt: number, position: Point, speed: number) {
    if (this.phase === "complete") return;
    this.elapsed += dt;
    const inside =
      Math.hypot(position.x - this.target.x, position.z - this.target.z) <=
      MISSION.radius;
    this.stopped =
      inside && Math.abs(speed) <= MISSION.stopSpeed ? this.stopped + dt : 0;
    if (this.stopped >= MISSION.dwell) {
      this.stopped = 0;
      if (this.phase === "pickup") this.phase = "delivery";
      else {
        this.phase = "complete";
        this.completed++;
      }
    }
  }
  restart() {
    this.phase = "pickup";
    this.elapsed = 0;
    this.stopped = 0;
  }
}
