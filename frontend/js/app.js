// ═══════════════════════════════════════════════════════════════
//  Veritas Village HOA — Three.js Interactive Dashboard
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONTRACT_ADDRESSES, ABIS, ALIASES } from './contracts.js';

// ═══════════════════════════════════════════════════════════════
//  WEB3 STATE
// ═══════════════════════════════════════════════════════════════

let provider;
let signer;
let userAddress = null;
const contracts = {};

// ═══════════════════════════════════════════════════════════════
//  APP STATE
// ═══════════════════════════════════════════════════════════════

const state = {
  lots: [
    { id: 1, owner: '0x1F24...dF51', delinquent: false, lastPaid: Date.now() / 1000, creditsSpent: 0, votedIdea: false },
    { id: 2, owner: '0x1F24...dF51', delinquent: true,  lastPaid: 0, creditsSpent: 0, votedIdea: false },
    { id: 3, owner: '0x1F24...dF51', delinquent: true,  lastPaid: 0, creditsSpent: 0, votedIdea: false },
  ],
  treasury: { balance: 0.0001, minDues: 0.0001 },
  ideas: [], // { id, title, description, proposer, qvVotes, votesAllocated: { lotIdx: votes } }
  proposal: null, // { id, title, description, votesFor, votesAgainst, votesAbstain, votesAllocated: { lotIdx: votes }, voteChoice: { lotIdx: choice } }
  malhaFinaComplete: false,
  selectedLotIndex: null,
};

const CREDITS_PER_YEAR = 100;

// ═══════════════════════════════════════════════════════════════
//  THREE.JS GLOBALS
// ═══════════════════════════════════════════════════════════════

let scene, camera, renderer, controls, composer;
const clock = new THREE.Clock();
const houses = [];      // { group, glowOrb, glowLight, walls }
let townHallGroup;
let fireflies;
const activeAnimations = [];
const labels = [];           // HTML elements
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredHouseIdx = null;

const HOUSE_CONFIGS = [
  { wallColor: 0xffcc80, roofColor: 0xbf360c, pos: new THREE.Vector3(-6, 0, 6) },
  { wallColor: 0x81d4fa, roofColor: 0x01579b, pos: new THREE.Vector3(0, 0, 8.5) },
  { wallColor: 0xc5e1a5, roofColor: 0x33691e, pos: new THREE.Vector3(6, 0, 6) },
];

const TREE_POSITIONS = [
  [-10, -4, 1.2], [-8, 10, 0.85], [10, -4, 1.1], [8.5, 10, 0.8],
  [-3, -7, 1.0], [3.5, -7, 1.3], [12, 2.5, 0.7], [-12, 2, 0.9],
  [-6, -2, 0.55], [7.5, -5, 1.0], [-9, 5, 0.75], [11, -1.5, 1.1],
];

const CHOICE_LABELS = { 1: 'A FAVOR ✅', 2: 'CONTRA ❌', 3: 'ABSTENÇÃO ⏸️' };

// ═══════════════════════════════════════════════════════════════
//  SCENE SETUP
// ═══════════════════════════════════════════════════════════════

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a2a1a);
  scene.fog = new THREE.FogExp2(0x0a2a1a, 0.012);

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(2, 14, 22);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2.15;
  controls.minDistance = 6;
  controls.maxDistance = 38;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;
  controls.target.set(0, 0, 3);
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  scene.add(new THREE.AmbientLight(0x5a5a90, 0.85));
  scene.add(new THREE.HemisphereLight(0x6699ff, 0x223322, 0.6));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(-15, 20, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -18;
  dirLight.shadow.camera.right = 18;
  dirLight.shadow.camera.top = 18;
  dirLight.shadow.camera.bottom = -18;
  scene.add(dirLight);

  const spot = new THREE.SpotLight(0xffffff, 0.9, 18, Math.PI / 5.5, 0.5, 1.8);
  spot.position.set(0, 9, 5);
  spot.target.position.set(0, 0, 0);
  scene.add(spot);
  scene.add(spot.target);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35, 0.5, 0.72
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  });
}

// ═══════════════════════════════════════════════════════════════
//  VILLAGE CONSTRUCTION
// ═══════════════════════════════════════════════════════════════

function createGround() {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(28, 64),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(5, 48),
    new THREE.MeshStandardMaterial({ color: 0x2d3a40, roughness: 0.85 })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.01;
  scene.add(plaza);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.8, 5.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.7 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);
}

function createHouse(config, index) {
  const group = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: config.wallColor, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: config.roofColor, roughness: 0.7 });

  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), wallMat);
  walls.position.y = 0.8;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 1.3, 4), roofMat);
  roof.position.y = 2.0;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.85, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x4e342e })
  );
  door.position.set(0, 0.42, -1.13);
  group.add(door);

  const winMat = new THREE.MeshBasicMaterial({ color: 0xfff5cc });
  for (const x of [-0.55, 0.55]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), winMat);
    win.position.set(x, 1.05, -1.12);
    group.add(win);
  }

  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.65, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x6d4c41 })
  );
  chimney.position.set(0.55, 2.4, 0.35);
  group.add(chimney);

  const statusColor = state.lots[index].delinquent ? 0xff5252 : 0x00e676;
  const glowOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshBasicMaterial({ color: statusColor, transparent: true, opacity: 0.85 })
  );
  glowOrb.position.set(0, 2.9, 0);
  group.add(glowOrb);

  const glowLight = new THREE.PointLight(statusColor, 1.5, 6);
  glowLight.position.set(0, 1.2, -0.5);
  group.add(glowLight);

  const porchLight = new THREE.PointLight(0xfff5cc, 1.2, 4.5);
  porchLight.position.set(0, 1.2, -1.2);
  group.add(porchLight);

  group.position.copy(config.pos);
  group.rotation.y = Math.atan2(-config.pos.x, -config.pos.z);

  scene.add(group);
  return { group, glowOrb, glowLight, walls };
}

function createTownHall() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xbcc8d0, roughness: 0.55, metalness: 0.05 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a5d68, roughness: 0.65 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 4.2), mat);
  base.position.set(0, 0.15, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const main = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.6, 3.5), mat);
  main.position.set(0, 1.6, 0);
  main.castShadow = true;
  group.add(main);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.7, 1.4, 4), roofMat);
  roof.position.set(0, 3.6, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 8), mat);
  tower.position.set(0, 4.6, 0);
  group.add(tower);

  const capMat = new THREE.MeshStandardMaterial({ color: 0xffd740, metalness: 0.85, roughness: 0.15 });
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.65, 8), capMat);
  cap.position.set(0, 5.6, 0);
  group.add(cap);

  const tipOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd740 })
  );
  tipOrb.position.set(0, 5.98, 0);
  group.add(tipOrb);

  const colMat = new THREE.MeshStandardMaterial({ color: 0xdde3e8, roughness: 0.45 });
  for (let i = 0; i < 4; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.3, 8), colMat);
    col.position.set(-1.35 + i * 0.9, 1.45, 1.82);
    col.castShadow = true;
    group.add(col);
  }

  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(3.2 - i * 0.2, 0.14, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.8 })
    );
    step.position.set(0, 0.37 + i * 0.14, 2.2 + (2 - i) * 0.28);
    step.castShadow = true;
    group.add(step);
  }

  const winMat = new THREE.MeshBasicMaterial({ color: 0xfff5cc });
  for (const x of [-0.8, 0.8]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75), winMat);
    win.position.set(x, 1.8, 1.76);
    group.add(win);
  }

  const entrance = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 1.3),
    new THREE.MeshStandardMaterial({ color: 0x263238 })
  );
  entrance.position.set(0, 0.95, 1.76);
  group.add(entrance);

  scene.add(group);
  return group;
}

function createTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06 * scale, 0.1 * scale, 0.9 * scale, 5),
    new THREE.MeshStandardMaterial({ color: 0x5d4037 })
  );
  trunk.position.y = 0.45 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20 });
  const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.65 * scale, 1.3 * scale, 5), foliageMat);
  c1.position.y = 1.4 * scale;
  c1.castShadow = true;
  group.add(c1);

  const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.45 * scale, 1.0 * scale, 5), foliageMat);
  c2.position.y = 2.15 * scale;
  c2.castShadow = true;
  group.add(c2);

  group.position.set(x, 0, z);
  scene.add(group);
}

function createFireflies() {
  const count = 70;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 32;
    positions[i * 3 + 1] = Math.random() * 4 + 0.3;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 32;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  fireflies = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffd740,
    size: 0.09,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
  }));
  scene.add(fireflies);
}

function assembleVillage() {
  createGround();
  HOUSE_CONFIGS.forEach((cfg, i) => {
    houses.push(createHouse(cfg, i));
    createLabel(i);
  });
  townHallGroup = createTownHall();
  TREE_POSITIONS.forEach(([x, z, s]) => createTree(x, z, s));
  createFireflies();
}

function createLabel(index) {
  const div = document.createElement('div');
  div.className = 'house-label';
  div.textContent = `Lote #${index + 1}`;
  document.getElementById('ui-overlay').appendChild(div);
  labels[index] = div;
}

function updateLabels() {
  const widthHalf = window.innerWidth / 2;
  const heightHalf = window.innerHeight / 2;

  houses.forEach((h, i) => {
    const pos = h.group.position.clone().add(new THREE.Vector3(0, 3.2, 0));
    pos.project(camera);

    const x = (pos.x * widthHalf) + widthHalf;
    const y = -(pos.y * heightHalf) + heightHalf;

    const label = labels[i];
    if (label) {
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;

      if (pos.z > 1) {
        label.style.display = 'none';
      } else {
        label.style.display = 'block';
        label.classList.toggle('active', state.selectedLotIndex === i || hoveredHouseIdx === i);
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  EASING & ANIMATION HELPERS
// ═══════════════════════════════════════════════════════════════

function easeIO(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ═══════════════════════════════════════════════════════════════
//  ANIMATIONS
// ═══════════════════════════════════════════════════════════════

function animatePayment(lotIndex) {
  const house = houses[lotIndex];
  const start = house.group.position.clone().add(new THREE.Vector3(0, 2, 0));
  const end = new THREE.Vector3(0, 2.5, 0);
  const count = 8;

  for (let i = 0; i < count; i++) {
    const coin = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd740 })
    );
    coin.position.copy(start);
    scene.add(coin);

    activeAnimations.push({
      type: 'payment', mesh: coin,
      start: start.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.3, (Math.random() - 0.5) * 0.4)),
      end: end.clone(),
      t0: performance.now() + i * 130,
      dur: 1600,
      done: false,
      onComplete: i === count - 1 ? () => onPaymentComplete(lotIndex) : null,
    });
  }
}

function animateVote(lotIndex, choice, voteWeight) {
  const house = houses[lotIndex];
  const start = house.group.position.clone().add(new THREE.Vector3(0, 2.8, 0));
  const end = new THREE.Vector3(0, 4, 0);
  const color = choice === 1 ? 0x00e676 : choice === 2 ? 0xff5252 : 0x9e9e9e;
  
  // More votes = more particles
  const count = Math.min(30, 8 + voteWeight * 2);

  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 6, 6),
      new THREE.MeshBasicMaterial({ color })
    );
    p.position.copy(start);
    scene.add(p);

    activeAnimations.push({
      type: 'vote', mesh: p,
      start: start.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.2, (Math.random() - 0.5) * 0.3)),
      end: end.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.4, (Math.random() - 0.5) * 0.6)),
      t0: performance.now() + i * 40,
      dur: 1100,
      done: false,
    });
  }
}

function animateIdeaSubmit(lotIndex) {
  const house = houses[lotIndex];
  const start = house.group.position.clone().add(new THREE.Vector3(0, 2.8, 0));
  const end = new THREE.Vector3(0, 4.5, 0); // Townhall
  
  const p = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x64b5f6 }) // Light Blue
  );
  p.position.copy(start);
  scene.add(p);

  activeAnimations.push({
    type: 'vote', mesh: p,
    start: start,
    end: end,
    t0: performance.now(),
    dur: 1500,
    done: false,
    onComplete: () => flashTownHall()
  });
}

function animateIdeaVote(lotIndex, voteWeight) {
  const house = houses[lotIndex];
  const start = house.group.position.clone().add(new THREE.Vector3(0, 2.8, 0));
  const end = new THREE.Vector3(0, 4, 0); // Townhall area
  const count = Math.min(25, 5 + voteWeight * 2);

  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x64b5f6 }) // Blue
    );
    p.position.copy(start);
    scene.add(p);

    activeAnimations.push({
      type: 'vote', mesh: p,
      start: start.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.2, (Math.random() - 0.5) * 0.3)),
      end: end.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.4, (Math.random() - 0.5) * 0.6)),
      t0: performance.now() + i * 40,
      dur: 1100,
      done: false,
    });
  }
}


function animateMalhaFina() {
  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.8, 64),
    new THREE.MeshBasicMaterial({ color: 0x448aff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.set(0, 0.4, 0);
  scene.add(ringMesh);

  activeAnimations.push({
    type: 'scan', mesh: ringMesh,
    t0: performance.now(), dur: 3200, maxScale: 22,
    alertsTriggered: new Set(), done: false,
    onComplete: () => showMalhaFinaResults(),
  });
}

function triggerHouseAlert(idx) {
  activeAnimations.push({
    type: 'alert', houseIndex: idx,
    t0: performance.now(), dur: 2200, done: false,
  });
}

function flashTownHall() {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x448aff, transparent: true, opacity: 0.35 })
  );
  flash.position.set(0, 2.5, 0);
  scene.add(flash);

  activeAnimations.push({
    type: 'flash', mesh: flash,
    t0: performance.now(), dur: 1000, done: false,
  });
}

// ═══════════════════════════════════════════════════════════════
//  ANIMATION UPDATE
// ═══════════════════════════════════════════════════════════════

function updateAnimations() {
  const now = performance.now();

  for (let i = activeAnimations.length - 1; i >= 0; i--) {
    const a = activeAnimations[i];
    if (a.done) { activeAnimations.splice(i, 1); continue; }
    if (now < a.t0) continue;

    const t = Math.min((now - a.t0) / a.dur, 1);
    const e = easeIO(t);

    switch (a.type) {
      case 'payment':
      case 'vote': {
        a.mesh.position.lerpVectors(a.start, a.end, e);
        a.mesh.position.y += Math.sin(e * Math.PI) * (a.type === 'payment' ? 3.5 : 2.2);
        a.mesh.scale.setScalar(1 - t * 0.45);
        if (t >= 1) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); a.done = true; if (a.onComplete) a.onComplete(); }
        break;
      }
      case 'scan': {
        const sc = 1 + e * a.maxScale;
        a.mesh.scale.set(sc, sc, sc);
        a.mesh.material.opacity = 0.55 * (1 - e * 0.75);
        const radius = sc * 0.55;
        houses.forEach((h, j) => {
          if (a.alertsTriggered.has(j)) return;
          if (radius >= h.group.position.length() * 0.75) {
            // Check if house participated in governance while delinquent
            const participated = state.lots[j].creditsSpent > 0;
            if (participated && state.lots[j].delinquent) {
              a.alertsTriggered.add(j);
              triggerHouseAlert(j);
            }
          }
        });
        if (t >= 1) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); a.done = true; if (a.onComplete) a.onComplete(); }
        break;
      }
      case 'alert': {
        const flash = Math.sin((now - a.t0) * 0.012) > 0;
        const h = houses[a.houseIndex];
        h.glowOrb.material.color.set(flash ? 0xff0000 : 0xff5252);
        h.glowOrb.scale.setScalar(flash ? 1.6 : 1);
        h.glowLight.intensity = flash ? 3.5 : 1.2;
        if (t >= 1) { h.glowOrb.scale.setScalar(1); h.glowLight.intensity = 1.5; a.done = true; }
        break;
      }
      case 'flash': {
        a.mesh.material.opacity = 0.35 * (1 - t);
        a.mesh.scale.setScalar(1 + e * 2.5);
        if (t >= 1) { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); a.done = true; }
        break;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  PER-FRAME UPDATES
// ═══════════════════════════════════════════════════════════════

function updateFirefliesFrame(time) {
  if (!fireflies) return;
  const arr = fireflies.geometry.attributes.position.array;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i + 1] += Math.sin(time * 1.4 + i * 0.65) * 0.0022;
    arr[i]     += Math.cos(time * 0.7 + i * 0.5)  * 0.0008;
  }
  fireflies.geometry.attributes.position.needsUpdate = true;
  fireflies.material.opacity = 0.35 + 0.2 * Math.sin(time * 1.8);
}

function updateHouseGlowPulse(time) {
  houses.forEach((h, i) => {
    if (state.lots[i].delinquent) {
      const p = 0.5 + 0.5 * Math.sin(time * 3.2 + i * 1.7);
      h.glowLight.intensity = 1.0 + p * 0.8;
      h.glowOrb.material.opacity = 0.55 + 0.3 * p;
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  UI RENDERING
// ═══════════════════════════════════════════════════════════════

function renderLotCards() {
  const c = document.getElementById('lot-cards');
  c.innerHTML = state.lots.map((lot, i) => {
    const remaining = CREDITS_PER_YEAR - lot.creditsSpent;
    return `
    <div class="lot-card ${lot.delinquent ? 'delinquent' : 'current'}">
      <div class="lot-header">
        <span class="lot-id">#${lot.id}</span>
        <span class="lot-status ${lot.delinquent ? 'text-red' : 'text-green'}">
          ${lot.delinquent ? '❌ Inadimplente' : '✅ Em Dia'}
        </span>
      </div>
      <div class="lot-owner">${lot.owner}</div>
      <div style="font-size:0.85rem; margin-top:4px;">
        <strong>Créditos:</strong> <span class="${remaining > 0 ? 'text-blue' : 'text-red'}">${remaining}</span>
      </div>
      <button class="btn btn-small btn-gold" data-action="pay" data-index="${i}" ${!lot.delinquent ? 'disabled' : ''} style="margin-top:8px;">
        💰 Pagar Taxa
      </button>
    </div>
  `}).join('');
}

function renderComplianceBar() {
  const total = state.lots.length;
  const current = state.lots.filter(l => !l.delinquent).length;
  const pct = (current / total) * 100;
  const c = document.getElementById('compliance-bar');
  c.innerHTML = `
    <div class="compliance-stats">
      <span>${current}/${total} em dia</span>
      <span class="${pct >= 80 ? 'text-green' : pct >= 50 ? 'text-gold' : 'text-red'}">${pct.toFixed(0)}%</span>
    </div>
    <div class="compliance-track"><div class="compliance-fill" style="width:${pct}%"></div></div>
  `;
}

function updateTreasuryDisplay() {
  document.getElementById('treasury-balance').textContent = `${state.treasury.balance.toFixed(4)} RBTC`;
  document.getElementById('min-dues').textContent = `${state.treasury.minDues.toFixed(4)} RBTC`;
}

function calculateCost(currentVotes, additionalVotes) {
  const cCost = currentVotes * currentVotes;
  const nCost = (currentVotes + additionalVotes) * (currentVotes + additionalVotes);
  return nCost - cCost;
}

function renderIdeasList() {
  const c = document.getElementById('ideas-list');
  if (state.ideas.length === 0) { c.innerHTML = '<p class="muted">Nenhuma ideia submetida ainda.</p>'; return; }

  let html = '';
  state.ideas.forEach(idea => {
    html += `
      <div class="idea-card" style="background:#1e272e; padding:12px; border-radius:6px; margin-bottom:8px; border-left: 4px solid var(--blue);">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong style="font-size:1.1rem;">${idea.title}</strong>
          <span class="badge" style="background:#37474f; padding:2px 6px; border-radius:4px; font-size:0.8rem;">${idea.qvVotes} Votos</span>
        </div>
        <p style="font-size:0.85rem; margin:8px 0; color:#b0bec5;">${idea.description}</p>
        <div style="font-size:0.75rem; color:#78909c; margin-bottom:8px;">Proposto pelo Lote #${idea.proposerLotId}</div>
        
        <div style="background:#263238; padding:8px; border-radius:4px;">
          <div style="font-size:0.8rem; margin-bottom:4px;"><strong>Votar (Custo Quadrático):</strong></div>
    `;

    state.lots.forEach((lot, idx) => {
      const remaining = CREDITS_PER_YEAR - lot.creditsSpent;
      const allocated = idea.votesAllocated[idx] || 0;
      
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; border-bottom:1px solid #37474f; padding-bottom:4px;">
          <span style="font-size:0.8rem;">Lote #${lot.id} (Alocado: ${allocated})</span>
          <div style="display:flex; gap:4px; align-items:center;">
            <input type="number" id="idea-vote-amt-${idea.id}-${idx}" min="1" max="100" value="1" style="width:40px; padding:2px; background:#37474f; color:white; border:none; border-radius:2px; text-align:center;">
            <button class="btn btn-small btn-blue" data-action="vote-idea" data-idea="${idea.id}" data-lot="${idx}" style="padding:2px 6px;">Adicionar</button>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
  });

  c.innerHTML = html;
}

function renderVotingSection() {
  const c = document.getElementById('voting-section');
  if (!state.proposal) { c.innerHTML = '<p class="muted">Nenhuma proposta ativa.</p>'; return; }

  let html = `
    <div class="proposal-info" style="margin-bottom:16px;">
      <div class="proposal-title" style="font-size:1.2rem; font-weight:bold; color:var(--gold);">"${state.proposal.title}"</div>
      <div class="proposal-desc" style="font-size:0.9rem; margin-top:4px;">${state.proposal.description}</div>
    </div>
    <div class="result-bar" style="margin-bottom:16px;">
      <div class="result-item favor"><div class="count">${state.proposal.votesFor}</div><div class="label">A Favor</div></div>
      <div class="result-item contra"><div class="count">${state.proposal.votesAgainst}</div><div class="label">Contra</div></div>
      <div class="result-item abstain"><div class="count">${state.proposal.votesAbstain}</div><div class="label">Abstenção</div></div>
    </div>
  `;

  state.lots.forEach((lot, i) => {
    const badge = lot.delinquent ? 'red' : 'green';
    const allocated = state.proposal.votesAllocated[i] || 0;
    const existingChoice = state.proposal.voteChoice[i];

    html += `
      <div class="vote-row" style="flex-direction:column; align-items:stretch; padding:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div class="vote-lot">
            <span class="lot-badge ${badge}">#${lot.id}</span>
            <span style="font-size:0.75rem">${lot.owner}</span>
          </div>
          <span style="font-size:0.8rem; color:#b0bec5;">Créditos: ${CREDITS_PER_YEAR - lot.creditsSpent} | Votos: ${allocated}</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="number" id="prop-vote-amt-${i}" min="1" max="100" value="1" style="width:50px; padding:4px; background:#263238; color:white; border:1px solid #455a64; border-radius:4px; text-align:center;">
          <select id="prop-vote-choice-${i}" style="flex:1; padding:4px; background:#263238; color:white; border:1px solid #455a64; border-radius:4px;" ${existingChoice ? 'disabled' : ''}>
            <option value="1" ${existingChoice === 1 ? 'selected' : ''}>A Favor</option>
            <option value="2" ${existingChoice === 2 ? 'selected' : ''}>Contra</option>
            <option value="3" ${existingChoice === 3 ? 'selected' : ''}>Abster</option>
          </select>
          <button class="btn btn-small btn-gold" data-action="vote-proposal" data-lot="${i}">Votar</button>
        </div>
      </div>
    `;
  });

  c.innerHTML = html;
}

function showMalhaFinaResults() {
  const flaggedIdeas = [];
  const flaggedProposals = [];
  
  state.lots.forEach(lot => {
    if (lot.delinquent && lot.creditsSpent > 0) {
      flaggedIdeas.push(lot); // Simplified for demo
    }
  });

  const c = document.getElementById('audit-results');
  let html = '';

  if (flaggedIdeas.length > 0) {
    html += `<div class="audit-header alert">🚨 Abatimento de Inadimplentes!</div>`;
    flaggedIdeas.forEach(lot => {
      html += `
        <div class="alert-item">
          <strong>Lote #${lot.id}</strong> usou ${lot.creditsSpent} créditos, mas está <span class="text-red">INADIMPLENTE</span>.<br>
          <small>Estes votos não serão contabilizados na execução final.</small>
        </div>`;
    });
  } else {
    html += `<div class="audit-header success">✅ Todos os votos válidos</div>
             <div class="clean-item">Nenhum voto de inadimplente detectado na cesta de ideias ou propostas.</div>`;
  }

  c.innerHTML = html;
  state.malhaFinaComplete = true;
  switchTab('audit');
}

function notify(message, type = 'info') {
  const c = document.getElementById('notifications');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = message;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 320);
  }, 3800);
}

// ═══════════════════════════════════════════════════════════════
//  EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════

function updateHouseGlow(idx) {
  const lot = state.lots[idx];
  const h = houses[idx];
  const color = lot.delinquent ? 0xff5252 : 0x00e676;
  h.glowOrb.material.color.set(color);
  h.glowLight.color.set(color);
}

function onPaymentComplete(idx) {
  const lot = state.lots[idx];
  lot.delinquent = false;
  lot.lastPaid = Date.now() / 1000;
  state.treasury.balance += state.treasury.minDues;
  updateHouseGlow(idx);
  renderLotCards();
  renderComplianceBar();
  updateTreasuryDisplay();
  notify(`Lote #${lot.id} pagou a taxa! Agora está em dia. ✅`, 'success');
}

function handlePay(idx) {
  if (!state.lots[idx].delinquent) return;
  animatePayment(idx);
}

function handleSubmitIdea() {
  const title = document.getElementById('idea-title').value.trim();
  const desc  = document.getElementById('idea-desc').value.trim();
  const lotIdx = parseInt(document.getElementById('idea-proposer-lot').value);
  
  if (!title) { notify('Digite um título para a ideia!', 'warning'); return; }

  const newIdea = {
    id: state.ideas.length + 1,
    title,
    description: desc,
    proposerLotId: state.lots[lotIdx].id,
    qvVotes: 0,
    votesAllocated: {}
  };
  
  state.ideas.push(newIdea);
  animateIdeaSubmit(lotIdx);
  renderIdeasList();
  
  document.getElementById('idea-title').value = '';
  document.getElementById('idea-desc').value = '';
  notify(`Ideia "${title}" submetida com sucesso!`, 'success');
}

function handleVoteIdea(ideaId, lotIdx) {
  const idea = state.ideas.find(i => i.id === ideaId);
  const lot = state.lots[lotIdx];
  const input = document.getElementById(`idea-vote-amt-${ideaId}-${lotIdx}`);
  const additionalVotes = parseInt(input.value);

  if (isNaN(additionalVotes) || additionalVotes <= 0) return;

  const currentVotes = idea.votesAllocated[lotIdx] || 0;
  const cost = calculateCost(currentVotes, additionalVotes);
  
  if (lot.creditsSpent + cost > CREDITS_PER_YEAR) {
    notify(`Lote #${lot.id} não possui créditos suficientes (Precisa de ${cost}, tem ${CREDITS_PER_YEAR - lot.creditsSpent})!`, 'error');
    return;
  }

  lot.creditsSpent += cost;
  idea.votesAllocated[lotIdx] = currentVotes + additionalVotes;
  idea.qvVotes += additionalVotes;

  animateIdeaVote(lotIdx, additionalVotes);
  renderLotCards();
  renderIdeasList();
  notify(`Lote #${lot.id} adicionou ${additionalVotes} voto(s) à ideia "${idea.title}" (Custo: ${cost} créditos)`, 'info');
}

function handleCreateProposal() {
  const title = document.getElementById('proposal-title').value.trim();
  const desc  = document.getElementById('proposal-desc').value.trim();
  if (!title) { notify('Digite um título para a proposta!', 'warning'); return; }

  state.proposal = {
    id: 1,
    title, 
    description: desc || 'Sem descrição.',
    votesFor: 0, votesAgainst: 0, votesAbstain: 0,
    votesAllocated: {},
    voteChoice: {},
    createdAt: Date.now(),
  };

  state.malhaFinaComplete = false;
  document.getElementById('audit-results').innerHTML = '';
  document.getElementById('btn-malha-fina').disabled = false;

  flashTownHall();
  renderVotingSection();
  switchTab('proposals');
  notify(`Proposta Oficial "${title}" criada!`, 'success');
}

function handleVoteProposal(lotIdx) {
  const lot = state.lots[lotIdx];
  const inputAmt = document.getElementById(`prop-vote-amt-${lotIdx}`);
  const selectChoice = document.getElementById(`prop-vote-choice-${lotIdx}`);
  
  const additionalVotes = parseInt(inputAmt.value);
  const choice = parseInt(selectChoice.value);

  if (isNaN(additionalVotes) || additionalVotes <= 0) return;
  if (!state.proposal) return;

  const existingChoice = state.proposal.voteChoice[lotIdx];
  if (existingChoice && existingChoice !== choice) {
    notify('Você só pode adicionar peso à sua escolha inicial.', 'error');
    return;
  }

  const currentVotes = state.proposal.votesAllocated[lotIdx] || 0;
  const cost = calculateCost(currentVotes, additionalVotes);

  if (lot.creditsSpent + cost > CREDITS_PER_YEAR) {
    notify(`Lote #${lot.id} não possui créditos suficientes! (Custo: ${cost})`, 'error');
    return;
  }

  lot.creditsSpent += cost;
  state.proposal.votesAllocated[lotIdx] = currentVotes + additionalVotes;
  state.proposal.voteChoice[lotIdx] = choice;

  if (choice === 1) state.proposal.votesFor += additionalVotes;
  else if (choice === 2) state.proposal.votesAgainst += additionalVotes;
  else state.proposal.votesAbstain += additionalVotes;

  animateVote(lotIdx, choice, additionalVotes);
  renderLotCards();
  renderVotingSection();
  notify(`Lote #${lot.id} casted ${additionalVotes} voto(s) ${CHOICE_LABELS[choice]} (Custo: ${cost} créditos)`, choice === 1 ? 'success' : choice === 2 ? 'error' : 'info');
}

function handleMalhaFina() {
  document.getElementById('btn-malha-fina').disabled = true;
  notify('🔍 Iniciando varredura de integridade...', 'info');
  animateMalhaFina();
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${name}`));
}

function setupEventListeners() {
  document.getElementById('btn-connect-wallet').addEventListener('click', connectWallet);

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Ideas & Proposals
  document.getElementById('btn-submit-idea').addEventListener('click', handleSubmitIdea);
  document.getElementById('btn-create-proposal').addEventListener('click', handleCreateProposal);
  document.getElementById('btn-malha-fina').addEventListener('click', handleMalhaFina);

  // Event Delegation for generated lists
  document.getElementById('ideas-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="vote-idea"]');
    if (btn) handleVoteIdea(parseInt(btn.dataset.idea), parseInt(btn.dataset.lot));
  });
  
  document.getElementById('voting-section').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="vote-proposal"]');
    if (btn) handleVoteProposal(parseInt(btn.dataset.lot));
  });

  // Lot card actions
  document.getElementById('lot-cards').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="pay"]');
    if (btn) handlePay(parseInt(btn.dataset.index));
  });
}

// ═══════════════════════════════════════════════════════════════
//  RENDER LOOP
// ═══════════════════════════════════════════════════════════════

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  
  controls.update();
  updateFirefliesFrame(time);
  updateHouseGlowPulse(time);
  updateAnimations();
  updateLabels();
  composer.render();
}

// ═══════════════════════════════════════════════════════════════
//  WEB3 SETUP & SYNC
// ═══════════════════════════════════════════════════════════════

async function initWeb3() {
  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
    
    const accounts = await provider.send("eth_accounts", []);
    if (accounts.length > 0) {
      await connectWallet();
    }
    
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        userAddress = accounts[0];
        notify('Conta alterada no MetaMask: ' + userAddress.substring(0,6) + '...', 'info');
        syncWeb3State();
      } else {
        userAddress = null;
        document.getElementById('btn-connect-wallet').textContent = '🔌 Conectar MetaMask';
      }
    });
  } else {
    notify('MetaMask não detectado. Usando modo simulador.', 'warning');
  }
}

async function connectWallet() {
  if (!window.ethereum) return notify('MetaMask não encontrado!', 'error');
  try {
    const accounts = await provider.send("eth_requestAccounts", []);
    userAddress = accounts[0];
    signer = await provider.getSigner();
    
    contracts.nft = new ethers.Contract(CONTRACT_ADDRESSES.NFT, ABIS.NFT, signer);
    contracts.treasury = new ethers.Contract(CONTRACT_ADDRESSES.TREASURY, ABIS.TREASURY, signer);
    contracts.governance = new ethers.Contract(CONTRACT_ADDRESSES.GOVERNANCE, ABIS.GOVERNANCE, signer);

    document.getElementById('btn-connect-wallet').textContent = '🦊 Conectado: ' + userAddress.substring(0,6) + '...';
    notify('Conectado à RSK Testnet!', 'success');
    
    await syncWeb3State();
  } catch (err) {
    console.error(err);
    notify('Erro ao conectar carteira', 'error');
  }
}

async function syncWeb3State() {
  if (!userAddress || !contracts.treasury) return;
  
  try {
    const balance = await contracts.treasury.getBalance();
    const minDues = await contracts.treasury.minDuesAmount();
    state.treasury.balance = parseFloat(ethers.formatEther(balance));
    state.treasury.minDues = parseFloat(ethers.formatEther(minDues));
    updateTreasuryDisplay();
    
    for (let i = 0; i < state.lots.length; i++) {
        const tokenId = state.lots[i].id;
        try {
            const owner = await contracts.nft.ownerOf(tokenId);
            state.lots[i].owner = owner.substring(0, 6) + '...' + owner.substring(38);
            
            const isDelinquent = await contracts.treasury.isDelinquent(tokenId, 30);
            state.lots[i].delinquent = isDelinquent;
        } catch(e) {}
    }
    
    renderLotCards();
    renderComplianceBar();
  } catch (err) {}
}

// ═══════════════════════════════════════════════════════════════
//  BOOTSTRAP
// ═══════════════════════════════════════════════════════════════

async function init() {
  initScene();
  assembleVillage();
  setupEventListeners();
  renderLotCards();
  renderComplianceBar();
  updateTreasuryDisplay();
  renderIdeasList();
  renderVotingSection();
  await initWeb3();
  animate();
}

init();
