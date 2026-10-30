import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { MAP, buildings } from "./data/map";
const cube = new THREE.BoxGeometry(1, 1, 1);
const materials = new Map<number, THREE.MeshStandardMaterial>();
function material(color: number) {
  if (!materials.has(color)) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.92 });
    if ([0x9c674e, 0x9a4f36].includes(color)) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#a5a199";
      context.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 16; row++) {
        for (let column = -1; column < 8; column++) {
          const shade = 200 + ((row * 17 + column * 7 + 256) % 42);
          context.fillStyle = `rgb(${shade},${shade},${shade})`;
          context.fillRect(column * 40 + (row % 2) * 20, row * 16, 38, 14);
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 3);
      mat.map = texture;
    }
    materials.set(color, mat);
  }
  return materials.get(color)!;
}
export function box(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
) {
  const m = new THREE.Mesh(cube, material(color));
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function solid(
  world: RAPIER.World,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) {
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
      .setTranslation(x, y, z)
      .setFriction(0.7),
  );
}
function sign(
  parent: THREE.Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  width: number,
  color = "#214a49",
) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#e9d8ad";
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = "#fff2cc";
  ctx.font = "bold 45px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64, 470);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width / 4),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide }),
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
  const back = mesh.clone();
  back.rotation.y = Math.PI;
  back.position.z -= 0.02;
  parent.add(back);
}
export function createWorld(scene: THREE.Scene, world: RAPIER.World) {
  box(scene, 0, -0.45, 0, 430, 0.8, 430, 0x9b9878);
  solid(world, 0, -1, 0, 440, 2, 440);
  const lanes: {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
  }[] = [];
  for (const road of MAP.roads) {
    box(scene, road.x, -0.02, road.z, road.w + 5, 0.16, road.d + 5, 0xbeb7a2);
    box(scene, road.x, 0.08, road.z, road.w, 0.08, road.d, 0x555c5b);
    const horizontal = road.w > road.d,
      length = horizontal ? road.w : road.d;
    for (let i = -length / 2 + 6; i < length / 2 - 4; i += 12) {
      const x = road.x + (horizontal ? i : 0),
        z = road.z + (horizontal ? 0 : i);
      const intersection = MAP.roads.some(
        (r) =>
          r !== road &&
          Math.abs(x - r.x) < r.w / 2 + 1 &&
          Math.abs(z - r.z) < r.d / 2 + 1,
      );
      if (!intersection)
        lanes.push({
          x,
          y: 0.135,
          z,
          w: horizontal ? 5 : 0.18,
          h: 0.015,
          d: horizontal ? 0.18 : 5,
        });
    }
  }
  const stripes = new THREE.InstancedMesh(
    cube,
    material(0xdfcf98),
    lanes.length,
  );
  const matrix = new THREE.Matrix4();
  lanes.forEach((p, i) => {
    matrix.compose(
      new THREE.Vector3(p.x, p.y, p.z),
      new THREE.Quaternion(),
      new THREE.Vector3(p.w, p.h, p.d),
    );
    stripes.setMatrixAt(i, matrix);
  });
  scene.add(stripes);
  box(scene, 86, 0.09, -48, 64, 0.12, 56, 0xb6a28a);
  // Clear opening connects the courtyard to the north–south side street.
  const windows: THREE.Matrix4[] = [];
  const tanks: THREE.Matrix4[] = [];
  const names = [
    "चिया पसल",
    "किराना पसल",
    "NEWARI KITCHEN",
    "काठमाडौँ",
    "MOMO HOUSE",
    "BALKUMARI STORES",
    "नमस्ते",
    "HIMALAYA AUTO",
  ];
  for (const b of buildings()) {
    box(scene, b.x, b.h / 2, b.z, b.w, b.h, b.d, b.color);
    solid(world, b.x, b.h / 2, b.z, b.w, b.h, b.d);
    box(scene, b.x, b.h + 0.3, b.z, b.w + 0.7, 0.65, b.d + 0.7, 0x797b73);
    box(scene, b.x, b.h + 0.95, b.z - b.d / 2, b.w, 1, 0.3, b.color);
    for (let floor = 5; floor < b.h - 1; floor += 4)
      for (let dx = -b.w / 2 + 3; dx < b.w / 2 - 1; dx += 4) {
        for (const side of [-1, 1])
          windows.push(
            new THREE.Matrix4().compose(
              new THREE.Vector3(
                b.x + dx,
                floor,
                b.z + side * (b.d / 2 + 0.025),
              ),
              new THREE.Quaternion(),
              new THREE.Vector3(1.9, 2.2, 0.12),
            ),
          );
      }
    for (let dx = -b.w / 2 + 3; dx < b.w / 2 - 1; dx += 5) {
      box(scene, b.x + dx, 1.7, b.z + b.d / 2 + 0.05, 3.8, 3.2, 0.16, 0x596e6c);
      for (let yy = 0.5; yy < 3; yy += 0.5)
        box(
          scene,
          b.x + dx,
          yy,
          b.z + b.d / 2 + 0.15,
          3.8,
          0.045,
          0.06,
          0x89948a,
        );
    }
    if (b.shop % 2 === 0) {
      box(scene, b.x, 5, b.z + b.d / 2 + 1, b.w + 0.4, 0.18, 2.3, 0x955b44);
      sign(scene, names[b.shop], b.x, 4.1, b.z + b.d / 2 + 0.2, b.w - 1);
    }
    if (b.shop % 3 === 0) {
      box(scene, b.x, 8.2, b.z - b.d / 2 - 0.6, b.w - 2, 0.3, 1.7, 0xc6bba4);
      box(scene, b.x, 8.8, b.z - b.d / 2 - 1.4, b.w - 2, 0.15, 0.12, 0x3c504c);
    }
    tanks.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(b.x + 3, b.h + 1.8, b.z - 2),
        new THREE.Quaternion(),
        new THREE.Vector3(1.5, 3, 1.5),
      ),
    );
  }
  const windowMesh = new THREE.InstancedMesh(
    cube,
    material(0x344c50),
    windows.length,
  );
  windows.forEach((m, i) => windowMesh.setMatrixAt(i, m));
  scene.add(windowMesh);
  const tankMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(1, 1, 1, 8),
    material(0x303b39),
    tanks.length,
  );
  tanks.forEach((m, i) => tankMesh.setMatrixAt(i, m));
  scene.add(tankMesh);
  // Original stylized pagoda landmark; replace with an inspected photo-derived GLB later.
  const temple = new THREE.Group();
  temple.position.set(100, 0, -60);
  scene.add(temple);
  box(temple, 0, 0.5, 0, 15, 1, 14, 0xa28c72);
  box(temple, 0, 1.25, 0, 12, 0.5, 11, 0xc6aa83);
  box(temple, 0, 4, 0, 7, 5.5, 7, 0x9a4f36);
  box(temple, 0, 3.5, 3.55, 2, 4, 0.15, 0x382e27);
  for (let tier = 0; tier < 3; tier++) {
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(9 - tier * 2.2, 3.5, 4),
      material(0x544238),
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 7 + tier * 3.2;
    roof.castShadow = true;
    temple.add(roof);
    if (tier < 2)
      box(temple, 0, 8 + tier * 3.2, 0, 4 - tier, 2.5, 4 - tier, 0xa96544);
  }
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 3, 8),
    material(0xd3ad59),
  );
  spire.position.y = 16;
  temple.add(spire);
  solid(world, 100, 5, -60, 15, 10, 14);
  sign(scene, "बालकुमारी  •  BALKUMARI", 88, 5, -75, 22);
  sign(scene, "कोटेश्वर  /  KOTESHWOR", -72, 6, 115, 23);
  // Street lamps, trees, wires and distant hills establish the skyline cheaply.
  for (let i = -108; i <= 108; i += 36)
    for (const z of [-110, 110]) {
      box(scene, i, 4, z, 0.22, 8, 0.22, 0x435452);
      box(scene, i + 1, 8, z, 2.3, 0.17, 0.2, 0x435452);
      box(scene, i + 2, 7.9, z, 0.9, 0.16, 0.65, 0xffdfa0);
    }
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI * 2) / 18,
      x = Math.cos(a) * 190,
      z = Math.sin(a) * 190;
    box(scene, x, 2, z, 0.8, 4, 0.8, 0x715c43);
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(4.5, 0),
      material(0x687c58),
    );
    crown.position.set(x, 6, z);
    scene.add(crown);
  }
  for (let i = 0; i < 14; i++) {
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(65 + (i % 3) * 20, 50 + (i % 4) * 15, 5),
      material(0x81918a),
    );
    hill.position.set(-420 + i * 65, 8, -310 - (i % 2) * 45);
    scene.add(hill);
  }
  for (const z of [-111, 111]) {
    const points = [];
    for (let x = -144; x <= 144; x += 3)
      points.push(
        new THREE.Vector3(
          x,
          9 - 0.8 * Math.sin((((x + 144) % 36) / 36) * Math.PI),
          z,
        ),
      );
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0x434942 }),
      ),
    );
  }
  for (const [x, z, w, d] of [
    [0, -205, 412, 2],
    [0, 205, 412, 2],
    [-205, 0, 2, 412],
    [205, 0, 2, 412],
  ]) {
    box(scene, x, 1.5, z, w, 3, d, 0x8c8068);
    solid(world, x, 1.5, z, w, 3, d);
  }
}
export function createCar() {
  const car = new THREE.Group();
  box(car, 0, 0.72, 0, 1.9, 0.7, 3.8, 0xead8a9);
  box(car, 0, 1.3, -0.15, 1.7, 0.7, 1.95, 0xead8a9);
  box(car, 0, 1.4, 0.86, 1.5, 0.48, 0.05, 0x365958);
  box(car, 0, 1.4, -1.16, 1.5, 0.45, 0.05, 0x365958);
  for (const x of [-0.86, 0.86])
    box(car, x, 1.4, -0.15, 0.03, 0.45, 1.7, 0x365958);
  box(car, 0, 0.65, 1.92, 1.8, 0.15, 0.1, 0x4a504b);
  box(car, 0, 0.65, -1.92, 1.8, 0.15, 0.1, 0x4a504b);
  for (const x of [-0.64, 0.64]) {
    box(car, x, 0.9, 1.91, 0.42, 0.23, 0.08, 0xffedbb);
    box(car, x, 0.9, -1.91, 0.42, 0.23, 0.08, 0xc24c3e);
  }
  const wheels: THREE.Mesh[] = [];
  for (const x of [-1, 1])
    for (const z of [-1.15, 1.2]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.25, 12),
        material(0x292f2e),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.42, z);
      car.add(wheel);
      wheels.push(wheel);
    }
  return { car, wheels };
}
