export type Point = { x: number; z: number };
export type Rect = Point & { w: number; d: number };
export const MAP = {
  bounds: 205,
  spawn: { x: -112, z: 96, yaw: Math.PI / 2 },
  roads: [
    { x: 0, z: 96, w: 276, d: 22 },
    { x: 0, z: -96, w: 276, d: 20 },
    { x: -128, z: 0, w: 20, d: 212 },
    { x: 128, z: 0, w: 20, d: 212 },
    { x: 0, z: 0, w: 260, d: 18 },
    { x: 48, z: -48, w: 16, d: 96 },
  ] satisfies Rect[],
  courtyard: { x: 86, z: -48, w: 64, d: 56 } satisfies Rect,
};
export type Building = Rect & { h: number; color: number; shop: number };
const colors = [0xc29479, 0xc8b89b, 0x9c674e, 0x819d95, 0xc5a477, 0xa89b91];
export function buildings(): Building[] {
  const result: Building[] = [];
  let n = 0;
  for (let z = -164; z <= 164; z += 30)
    for (let x = -174; x <= 174; x += 28) {
      const w = 17 + (n % 3) * 2,
        d = 19;
      const blocked = [...MAP.roads, MAP.courtyard].some(
        (r) =>
          Math.abs(x - r.x) < (w + r.w) / 2 + 5 &&
          Math.abs(z - r.z) < (d + r.d) / 2 + 5,
      );
      if (!blocked)
        result.push({
          x,
          z,
          w,
          d,
          h: 10 + (n % 5) * 4,
          color: colors[n % colors.length],
          shop: n % 8,
        });
      n++;
    }
  return result;
}
