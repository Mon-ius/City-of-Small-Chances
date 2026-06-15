// City of Small Chances — full-screen Three.js entry.
// Boots a WebGL renderer over the whole viewport, builds the Old Harbour, drops in
// a player you walk with WASD/arrows behind an orbiting third-person camera, and
// runs the frame loop. The simulation engine (src/core, src/data, src/systems) is
// retained for wiring real days/economy into the world in later iterations.

import * as THREE from "three";
import { buildWorld } from "./world.js";
import { createDayCycle } from "./daycycle.js";
import { createFigure } from "./player.js";
import { Input } from "./input.js";

const MOVE_SPEED = 4.2;            // metres / second
const CAM = { yaw: 0, pitch: 0.34, dist: 9, height: 1.4 };

function fail(msg) {
  const boot = document.getElementById("boot");
  if (boot) {
    boot.classList.remove("gone");
    boot.innerHTML = `<div class="boot__title">Can't open the harbour</div>
      <div class="boot__sub">${msg}</div>`;
  }
}

function start() {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    fail("This browser could not start WebGL.");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);

  const world = buildWorld(scene);
  const day = createDayCycle(world, scene, { startMin: 480 }); // open at 08:00

  const clockEl = document.getElementById("clock");
  let lastClock = "";

  const player = createFigure("player");
  player.root.position.set(-3, 0, 16);
  player.root.rotation.y = Math.PI; // face down the street, away from camera
  scene.add(player.root);

  const input = new Input(canvas);

  // Reusable vectors (no per-frame allocation in the hot loop).
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const clock = new THREE.Clock();

  function placeCamera() {
    const p = player.root.position;
    const cp = Math.cos(CAM.pitch);
    camera.position.set(
      p.x + Math.sin(CAM.yaw) * cp * CAM.dist,
      p.y + Math.sin(CAM.pitch) * CAM.dist + CAM.height,
      p.z + Math.cos(CAM.yaw) * cp * CAM.dist,
    );
    lookAt.set(p.x, p.y + 1.2, p.z);
    camera.lookAt(lookAt);
  }
  placeCamera();

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);

    // Drag orbits the camera around the player.
    const drag = input.takeDrag();
    CAM.yaw -= drag.yaw;
    CAM.pitch = Math.max(0.05, Math.min(1.15, CAM.pitch + drag.pitch));

    // Camera-relative movement on the ground plane.
    fwd.set(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw)).normalize();
    right.set(-fwd.z, 0, fwd.x);
    const a = input.axis();
    move.set(0, 0, 0).addScaledVector(fwd, a.z).addScaledVector(right, a.x);

    let speed = 0;
    if (move.lengthSq() > 0) {
      move.normalize();
      const p = player.root.position;
      p.x += move.x * MOVE_SPEED * dt;
      p.z += move.z * MOVE_SPEED * dt;
      const b = world.bounds;
      p.x = Math.max(b.minX, Math.min(b.maxX, p.x));
      p.z = Math.max(b.minZ, Math.min(b.maxZ, p.z));
      player.root.rotation.y = Math.atan2(move.x, move.z);
      speed = MOVE_SPEED;
    }
    player.update(dt, speed);

    for (const c of world.citizens) c.update(dt);

    // Advance the harbour clock and relight the world; refresh the HUD readout.
    day.update(dt);
    const label = day.label();
    if (clockEl && label !== lastClock) { clockEl.textContent = label; lastClock = label; }

    placeCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  window.addEventListener("resize", onResize);

  // Debug / test hook: lets the headless smoke read state and drive the world.
  window.__game = { THREE, scene, camera, renderer, player, world, input, CAM, day };

  requestAnimationFrame(tick);

  // Drop the boot splash once the first frame is up.
  const boot = document.getElementById("boot");
  if (boot) {
    requestAnimationFrame(() => {
      boot.classList.add("gone");
      setTimeout(() => boot.remove(), 650);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
