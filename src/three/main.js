// City of Small Chances — full-screen Three.js entry.
// Boots a WebGL renderer over the whole viewport, builds the Old Harbour, drops in
// a player you walk with WASD/arrows behind an orbiting third-person camera, and
// runs the frame loop. The simulation engine (src/core, src/data, src/systems) is
// retained for wiring real days/economy into the world in later iterations.

import * as THREE from "three";
import { buildWorld } from "./world.js";
import { createDayCycle } from "./daycycle.js";
import { createInteractions } from "./interactions.js";
import { createInteractionUI, createStatsHUD } from "./ui.js";
import { createPlayerState } from "./playerstate.js";
import { createFigure } from "./player.js";
import { Input } from "./input.js";
import { createAudio } from "./audio.js";

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

  // The player's pocket — money + energy — shown in the corner HUD.
  const pstate = createPlayerState();
  const hud = createStatsHUD();
  hud.set(pstate.money, pstate.energy);

  // The harbour's procedural soundscape (resumes on first gesture; see audio.js).
  const audio = createAudio();
  audio.setTimeOfDay(day.minutes);
  hud.setMuted(audio.isMuted());
  hud.onMuteToggle(() => hud.setMuted(audio.toggleMute()));
  window.addEventListener("keydown", (e) => {
    if ((e.key === "m" || e.key === "M") && !e.repeat) hud.setMuted(audio.toggleMute());
  });

  // In-world interaction: proximity points + a prompt/panel overlay.
  const interactions = createInteractions(player);
  const ui = createInteractionUI();
  let interacting = false;
  let activePoint = null;
  let renderActive = () => {};
  let lastBoardMin = -1; // in-game minute the live board last rendered at
  ui.onClose(() => { interacting = false; activePoint = null; audio.panelClose(); });

  // Open an interactable: render its panel (live, if it builds from world state)
  // and wire up acting on it. Re-renders in place after each action.
  function openInteractable(near) {
    activePoint = near;
    pstate.lastWork = null; // a fresh visit starts without a stale result banner
    renderActive = () => {
      const data = near.build ? near.build({ nowMin: day.minutes, pstate }) : near.panel;
      ui.openPanel(data, near.act ? performAct : null);
      lastBoardMin = Math.floor(day.minutes);
    };
    renderActive();
    interacting = true;
    ui.hidePrompt();
    audio.panelOpen();
  }

  // Perform action #i on the open interactable (a click or a number key), then
  // refresh the panel and the stats HUD so the result shows immediately.
  function performAct(i) {
    if (!activePoint || !activePoint.act) return;
    const res = activePoint.act(i, { nowMin: day.minutes, pstate, day });
    hud.set(pstate.money, pstate.energy);
    if (res && res.ok) audio.pay(); else audio.deny();
    renderActive();
  }

  // Reusable vectors (no per-frame allocation in the hot loop).
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const clock = new THREE.Clock();
  let markerPhase = 0;

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

    const drag = input.takeDrag(); // always consume so it never bursts on resume
    const act = input.takeAction();

    let speed = 0;
    if (interacting) {
      // Reading a panel: the world breathes on, but the player is still.
      if (act === "interact" || act === "cancel") ui.closePanel();
      else if (typeof act === "string" && act.startsWith("pick:")) performAct(Number(act.slice(5)) - 1);
    } else {
      // Drag orbits the camera around the player.
      CAM.yaw -= drag.yaw;
      CAM.pitch = Math.max(0.05, Math.min(1.15, CAM.pitch + drag.pitch));

      // Camera-relative movement on the ground plane.
      fwd.set(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw)).normalize();
      right.set(-fwd.z, 0, fwd.x);
      const a = input.axis();
      move.set(0, 0, 0).addScaledVector(fwd, a.z).addScaledVector(right, a.x);

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

      // Context prompt for the nearest point of interest; act to open it.
      const near = interactions.nearest();
      if (near) {
        ui.showPrompt(`[E] ${near.label}`);
        if (act === "interact") openInteractable(near);
      } else {
        ui.hidePrompt();
      }
    }

    player.update(dt, speed);
    audio.update(dt, speed);

    for (const c of world.citizens) c.update(dt);

    // Turn each painted citizen billboard to face the camera (cylindrical: only
    // around Y, so the figures stay upright as the camera orbits and pitches).
    for (const b of world.billboards) {
      b.rotation.y = Math.atan2(camera.position.x - b.position.x, camera.position.z - b.position.z);
    }

    // Drift the clouds slowly across the sky (wrapping in x) and turn each to face
    // the camera, so the painted cards always read front-on against the dome.
    for (const c of world.clouds) {
      let x = c.mesh.position.x + c.speed * dt;
      if (x > c.wrap) x -= c.wrap * 2;
      c.mesh.position.x = x;
      c.mesh.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - c.mesh.position.z);
    }

    // Bob the interaction markers so they catch the eye.
    markerPhase += dt * 2.2;
    for (let i = 0; i < world.markers.length; i++) {
      const m = world.markers[i];
      m.rotation.y += dt * 1.1;
      m.position.y = 2.4 + Math.sin(markerPhase + i) * 0.12;
    }

    // Advance the harbour clock and relight the world; refresh the HUD readout.
    day.update(dt);
    const label = day.label();
    if (label !== lastClock) {
      if (clockEl) clockEl.textContent = label;
      lastClock = label;
      audio.setTimeOfDay(day.minutes); // shift gulls/lamp-hum with the hour
    }

    // Keep a live panel (the notice board) honest with the moving clock: as the
    // minute ticks over, re-score the shifts so a window can open or close, a
    // requirement can lift, and the dimmed/open rows match reality while you read.
    if (interacting && activePoint && activePoint.build) {
      const m = Math.floor(day.minutes);
      if (m !== lastBoardMin) renderActive();
    }

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
  window.__game = { THREE, scene, camera, renderer, player, world, input, CAM, day, interactions, ui, pstate, hud, audio };

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
