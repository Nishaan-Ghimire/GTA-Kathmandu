import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MAP } from "./data/map";
import { VEHICLE } from "./data/vehicle";
import { DeliveryMission, MISSION } from "./data/mission";
import { createWorld, createCar } from "./world";
import { landmarks, loadLandmark } from "./assets";
import "./style.css";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
<main id="game" aria-label="Kathmandu driving game"></main>
<header class="topbar"><a class="brand" href="./"><span class="brand-icon">क</span><span>KATHMANDU<small>AFTERGLOW</small></span></a><div class="district"><i></i> KOTESHWOR — BALKUMARI <span> / </span> FREE DRIVE</div><button id="pause" class="outline">Ⅱ <span>PAUSE</span></button></header>
<section class="mission panel"><div class="eyebrow"><span class="live-dot"></span> LOCAL DELIVERY <span id="step">01 / 02</span></div><h1 id="objective">A small delivery.<br>A city to discover.</h1><p id="instruction">Pick up a parcel at the Koteshwor tea shop.</p><div class="mission-footer"><span id="distance">36 <small>M AWAY</small></span><span id="timer">00:00</span></div><div class="progress"><div id="dwell"></div></div></section>
<div class="location"><span>नेपाल · NEPAL</span><h2 id="neighborhood">Koteshwor</h2><p>A different kind of rush hour.</p></div>
<aside class="map-panel panel"><div class="map-title">NEIGHBORHOOD <span>N ↑</span></div><canvas id="minimap" width="240" height="200" aria-label="Map showing your car and delivery destination"></canvas><div class="map-key"><span><b class="car-dot"></b> YOU</span><span><b class="target-dot"></b> DELIVERY</span><span>1 : 1800</span></div></aside>
<section class="dashboard"><div class="speed"><span id="speed">0</span><div>KM/H<small id="gear">N</small></div></div><div class="speed-track"><div id="speedbar"></div></div><span class="vehicle-label">CITY RUNNER <span> / </span> 01</span></section>
<footer class="controls"><span><kbd>W A S D</kbd> DRIVE</span><span><kbd>SPACE</kbd> HANDBRAKE</span><button id="reset"><kbd>R</kbd> RESET CAR</button><span><kbd>ESC</kbd> PAUSE</span><span class="build">PROTOTYPE 0.1 <i>●</i> <b id="fps">—</b> FPS</span></footer>
<div id="toast" role="status" aria-live="polite"></div>
<div id="overlay"><section class="welcome"><div class="eyebrow">AN ORIGINAL KATHMANDU DRIVING PROTOTYPE</div><span class="welcome-nepali">काठमाडौँ</span><h2 id="overlay-title">Take the<br><em>scenic route.</em></h2><p id="overlay-copy">A parcel in Koteshwor. A courtyard in Balkumari.<br>A little piece of Kathmandu, yours to explore.</p><button id="start" disabled>LOADING THE NEIGHBORHOOD…</button><div class="welcome-controls"><span>WASD / ARROWS · DRIVE</span><span>SPACE · HANDBRAKE</span></div><small id="load-status">Preparing the city and physics…</small></section><span class="edition">KATHMANDU AFTERGLOW<br>WEEKEND EDITION / 001</span></div>`;
const el = (id: string) => document.getElementById(id)!;
const keys = new Set<string>();
const mission = new DeliveryMission();
let started = false,
  paused = true,
  ready = false,
  toastTimer = 0;
let world: RAPIER.World, body: RAPIER.RigidBody;
let renderer: THREE.WebGLRenderer;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc9bca0);
scene.fog = new THREE.Fog(0xc9bca0, 95, 360);
const camera = new THREE.PerspectiveCamera(
  52,
  innerWidth / innerHeight,
  0.1,
  800,
);
const { car, wheels } = createCar();
scene.add(car);
const targetCamera = new THREE.Vector3(),
  lookAt = new THREE.Vector3();
const marker = new THREE.Group();
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(6, 0.16, 8, 48),
  new THREE.MeshBasicMaterial({ color: 0xeec577 }),
);
ring.rotation.x = -Math.PI / 2;
marker.add(ring);
const column = new THREE.Mesh(
  new THREE.CylinderGeometry(6, 6, 4, 32, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0xeec577,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
column.position.y = 2;
marker.add(column);
const diamond = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.9),
  new THREE.MeshStandardMaterial({
    color: 0xffd68a,
    emissive: 0xb88e40,
    emissiveIntensity: 0.3,
  }),
);
diamond.position.y = 5;
marker.add(diamond);
scene.add(marker);
function toast(message: string) {
  el("toast").textContent = message;
  el("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => el("toast").classList.remove("visible"),
    4000,
  );
}
function reset() {
  if (!body) return;
  body.setTranslation({ x: MAP.spawn.x, y: 0.1, z: MAP.spawn.z }, true);
  body.setRotation(
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      MAP.spawn.yaw,
    ),
    true,
  );
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  syncCar();
  updateCamera(1);
}
function syncCar() {
  const p = body.translation(),
    q = body.rotation();
  car.position.set(p.x, p.y, p.z);
  car.quaternion.set(q.x, q.y, q.z, q.w);
}
function updateCamera(dt: number) {
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion);
  targetCamera.copy(car.position).addScaledVector(forward, -13);
  targetCamera.y += 8;
  camera.position.lerp(targetCamera, 1 - Math.exp(-5 * dt));
  // Keep the chase camera in front of walls when reversing into tight spaces.
  const anchor = car.position.clone().add(new THREE.Vector3(0, 2, 0));
  const direction = camera.position.clone().sub(anchor);
  const distance = direction.length();
  direction.normalize();
  const obstruction = world.castRay(
    new RAPIER.Ray(anchor, direction),
    distance,
    true,
    RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
  );
  if (obstruction) {
    camera.position.copy(anchor).addScaledVector(direction, Math.max(0.5, obstruction.timeOfImpact - 0.4));
  }
  lookAt.copy(car.position).addScaledVector(forward, 6);
  lookAt.y += 1;
  camera.lookAt(lookAt);
}
function setPaused(value: boolean) {
  paused = value;
  keys.clear();
  (document.activeElement as HTMLElement)?.blur();
  el("overlay").classList.toggle("hidden", !value);
  el("pause").setAttribute("aria-label", value ? "Resume game" : "Pause game");
  if (started && value) {
    el("overlay-title").innerHTML = "The city<br><em>can wait.</em>";
    el("overlay-copy").innerHTML =
      "Your delivery is right where you left it.<br>Take a breath, then take the wheel.";
    el("start").textContent = "BACK TO THE STREETS →";
    el("load-status").textContent = "Paused · Your timer is stopped";
  }
}
function drive(dt: number) {
  const v = body.linvel(),
    q = body.rotation();
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
    new THREE.Quaternion(q.x, q.y, q.z, q.w),
  );
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  let longitudinal = v.x * forward.x + v.z * forward.z,
    lateral = v.x * side.x + v.z * side.z;
  const throttle =
    Number(keys.has("KeyW") || keys.has("ArrowUp")) -
    Number(keys.has("KeyS") || keys.has("ArrowDown"));
  const steer =
    Number(keys.has("KeyA") || keys.has("ArrowLeft")) -
    Number(keys.has("KeyD") || keys.has("ArrowRight"));
  const handbrake = keys.has("Space");
  const acceleration =
    throttle !== 0 &&
    Math.sign(throttle) !== Math.sign(longitudinal) &&
    Math.abs(longitudinal) > 0.2
      ? VEHICLE.braking
      : VEHICLE.acceleration;
  longitudinal += throttle * acceleration * dt;
  longitudinal *= Math.exp(-(throttle === 0 ? VEHICLE.drag : 0.13) * dt);
  if (handbrake) longitudinal *= Math.exp(-2.5 * dt);
  longitudinal = THREE.MathUtils.clamp(
    longitudinal,
    -VEHICLE.reverseSpeed,
    VEHICLE.maxSpeed,
  );
  lateral *= Math.exp(-(handbrake ? VEHICLE.handbrakeGrip : VEHICLE.grip) * dt);
  body.setLinvel(
    {
      x: forward.x * longitudinal + side.x * lateral,
      y: v.y,
      z: forward.z * longitudinal + side.z * lateral,
    },
    true,
  );
  const turn =
    steer *
    VEHICLE.steering *
    Math.min(Math.abs(longitudinal) / 6, 1) *
    Math.sign(longitudinal) *
    (handbrake ? 1.3 : 1);
  body.setAngvel({ x: 0, y: turn, z: 0 }, true);
  world.step();
  syncCar();
  const actual = body.linvel();
  const speed = Math.hypot(actual.x, actual.z);
  const old = mission.phase;
  mission.update(dt, car.position, speed);
  if (old !== mission.phase) {
    if (mission.phase === "delivery")
      toast("Parcel collected. Next stop: Balkumari courtyard.");
    else {
      toast("Delivered! Another small journey, complete.");
      el("instruction").innerHTML =
        'Ready for another run? <button id="again">START ANOTHER DELIVERY →</button>';
      el("again").addEventListener("click", () => {
        mission.restart();
        toast("New delivery ready at Koteshwor.");
      });
    }
  }
  wheels.forEach((w) => w.rotateY((longitudinal * dt) / 0.42));
  if (
    car.position.y < -5 ||
    Math.abs(car.position.x) > 215 ||
    Math.abs(car.position.z) > 215
  )
    reset();
}
const map = el("minimap") as HTMLCanvasElement,
  ctx = map.getContext("2d")!;
function drawMap() {
  ctx.fillStyle = "#1e3835";
  ctx.fillRect(0, 0, 240, 200);
  const scale = 0.49,
    ox = 120,
    oy = 100;
  ctx.fillStyle = "#53645b";
  for (const r of MAP.roads)
    ctx.fillRect(
      ox + (r.x - r.w / 2) * scale,
      oy + (r.z - r.d / 2) * scale,
      r.w * scale,
      r.d * scale,
    );
  ctx.fillStyle = "#6d7860";
  const c = MAP.courtyard;
  ctx.fillRect(
    ox + (c.x - c.w / 2) * scale,
    oy + (c.z - c.d / 2) * scale,
    c.w * scale,
    c.d * scale,
  );
  ctx.fillStyle = "#99a596";
  ctx.font = "9px sans-serif";
  ctx.fillText("BALKUMARI", 151, 46);
  ctx.fillText("KOTESHWOR", 45, 167);
  if (mission.phase !== "complete") {
    ctx.strokeStyle = "#eac077";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      ox + mission.target.x * scale,
      oy + mission.target.z * scale,
      6,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion);
  ctx.save();
  ctx.translate(ox + car.position.x * scale, oy + car.position.z * scale);
  ctx.rotate(-Math.atan2(forward.x, forward.z));
  ctx.fillStyle = "#f4efde";
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(-4, -4);
  ctx.lineTo(4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function updateHud() {
  const v = body.linvel(),
    speed = Math.hypot(v.x, v.z) * 3.6;
  el("speed").textContent = String(Math.round(speed));
  el("speedbar").style.width = `${(speed / (VEHICLE.maxSpeed * 3.6)) * 100}%`;
  el("gear").textContent =
    speed < 1
      ? "N"
      : new THREE.Vector3(v.x, 0, v.z).dot(
            new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion),
          ) < 0
        ? "R"
        : "D";
  const seconds = Math.floor(mission.elapsed);
  el("timer").textContent =
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  el("step").textContent =
    mission.phase === "pickup"
      ? "01 / 02"
      : mission.phase === "delivery"
        ? "02 / 02"
        : "COMPLETE";
  el("objective").textContent =
    mission.phase === "pickup"
      ? "First, a stop for tea."
      : mission.phase === "delivery"
        ? "Bound for Balkumari."
        : "Made someone’s day.";
  if (mission.phase !== "complete")
    el("instruction").textContent =
      mission.phase === "pickup"
        ? "Stop in the gold marker at the tea shop to collect the parcel."
        : "Take the side street into the courtyard. Stop in the gold marker.";
  el("distance").innerHTML =
    mission.phase === "complete"
      ? "✓ <small>PARCEL DELIVERED</small>"
      : `${Math.round(Math.hypot(car.position.x - mission.target.x, car.position.z - mission.target.z))} <small>M AWAY</small>`;
  el("dwell").style.width = `${(mission.stopped / MISSION.dwell) * 100}%`;
  el("neighborhood").textContent =
    car.position.z > 30
      ? "Koteshwor"
      : car.position.z < -15
        ? "Balkumari"
        : "Ring Road connection";
  marker.visible = mission.phase !== "complete";
  marker.position.set(mission.target.x, 0.3, mission.target.z);
  drawMap();
}
async function init() {
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el("game").appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xe5dcc6, 0x687568, 2.5));
    const sun = new THREE.DirectionalLight(0xffd8a5, 3.2);
    sun.position.set(-70, 110, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -110,
      right: 110,
      top: 110,
      bottom: -110,
      near: 1,
      far: 300,
    });
    sun.shadow.bias = -0.001;
    scene.add(sun);
    scene.add(sun.target);
    await RAPIER.init();
    world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.timestep = VEHICLE.fixedStep;
    createWorld(scene, world);
    // Batch static geometry by material, preserving instanced windows and tanks.
    scene.updateMatrixWorld(true);
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    scene.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        !(o instanceof THREE.InstancedMesh) &&
        o !== ring &&
        o !== column &&
        o !== diamond &&
        !car.getObjectById(o.id) &&
        o.material instanceof THREE.MeshStandardMaterial
      ) {
        const list = batches.get(o.material) || [];
        list.push(o);
        batches.set(o.material, list);
      }
    });
    for (const [mat, meshes] of batches) {
      const geometries = meshes.map((m) =>
        m.geometry.clone().applyMatrix4(m.matrixWorld),
      );
      const merged = mergeGeometries(geometries);
      if (merged) {
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes.forEach((m) => m.removeFromParent());
        scene.add(mesh);
      }
      geometries.forEach((g) => g.dispose());
    }
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(MAP.spawn.x, 0.1, MAP.spawn.z)
      .enabledRotations(false, true, false)
      .setCcdEnabled(true);
    body = world.createRigidBody(desc);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(VEHICLE.halfWidth, 0.65, VEHICLE.halfLength)
        .setTranslation(0, 0.55, 0)
        .setMass(1000)
        .setFriction(0)
        .setRestitution(0.05),
      body,
    );
    reset();
    for (const asset of landmarks) {
      try {
        await loadLandmark(asset, scene, world);
      } catch {
        toast("A landmark could not load. The neighborhood is still playable.");
      }
    }
    ready = true;
    (el("start") as HTMLButtonElement).disabled = false;
    el("start").textContent = "TAKE THE WHEEL →";
    el("load-status").textContent =
      "Desktop prototype · Headphones optional, curiosity essential";
    let last = performance.now(),
      accumulator = 0,
      frames = 0,
      fpsTime = last,
      hudTime = 0;
    function frame(now: number) {
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!paused) {
        accumulator += dt;
        while (accumulator >= VEHICLE.fixedStep) {
          drive(VEHICLE.fixedStep);
          accumulator -= VEHICLE.fixedStep;
        }
        updateCamera(dt);
      } else accumulator = 0;
      diamond.rotation.y += dt;
      diamond.position.y = 5 + Math.sin(now / 500) * 0.35;
      if (now - hudTime > 100) {
        updateHud();
        hudTime = now;
      }
      frames++;
      if (now - fpsTime > 1000) {
        el("fps").textContent = String(
          Math.round((frames * 1000) / (now - fpsTime)),
        );
        fpsTime = now;
        frames = 0;
      }
      sun.position.set(car.position.x - 70, 110, car.position.z + 60);
      sun.target.position.copy(car.position);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  } catch (error) {
    el("load-status").textContent =
      "Could not start the game. Try a browser with WebGL enabled, then reload.";
    el("start").textContent = "RELOAD";
    (el("start") as HTMLButtonElement).disabled = false;
    el("start").onclick = () => location.reload();
    console.error(error);
  }
}
el("start").addEventListener("click", () => {
  if (!ready) return;
  started = true;
  setPaused(false);
});
el("pause").addEventListener("click", () => {
  if (ready && started) setPaused(!paused);
});
el("reset").addEventListener("click", () => {
  if (ready) {
    reset();
    (document.activeElement as HTMLElement)?.blur();
    toast("Car returned to Koteshwor. Your delivery is preserved.");
  }
});
window.addEventListener("keydown", (event) => {
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
      event.code,
    ) &&
    !(event.target instanceof HTMLButtonElement)
  )
    event.preventDefault();
  if (event.repeat) return;
  if (event.code === "Escape" && started) setPaused(!paused);
  if (event.code === "KeyR" && !paused) {
    reset();
    toast("Back on the road.");
  }
  if (!paused) keys.add(event.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  if (started) setPaused(true);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && started) setPaused(true);
});
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer?.setSize(innerWidth, innerHeight);
});
// Opt-in deterministic acceptance hooks, unavailable in a normal game session.
if (new URLSearchParams(location.search).has("qa"))
  Object.assign(window, {
    gameQA: {
      state: () => ({
        ready,
        paused,
        phase: mission.phase,
        elapsed: mission.elapsed,
        position: body?.translation(),
        rotation: body?.rotation(),
        speed: body ? Math.hypot(body.linvel().x, body.linvel().z) : 0,
        drawCalls: renderer?.info.render.calls,
      }),
      teleport: (x: number, z: number, yaw = 0) => {
        body.setTranslation({ x, y: 0.1, z }, true);
        body.setRotation(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            yaw,
          ),
          true,
        );
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      },
      restart: () => mission.restart(),
    },
  });
void init();
