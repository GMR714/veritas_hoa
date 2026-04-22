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
    { id: 1, owner: '0x1F24...dF51', delinquent: false, lastPaid: Date.now() / 1000, voted: false, voteChoice: 0, delegatedTo: null, votedByDelegate: false, delegateVoteChoice: 0, wasOverridden: false },
    { id: 2, owner: '0x1F24...dF51', delinquent: true,  lastPaid: 0, voted: false, voteChoice: 0, delegatedTo: null, votedByDelegate: false, delegateVoteChoice: 0, wasOverridden: false },
    { id: 3, owner: '0x1F24...dF51', delinquent: true,  lastPaid: 0, voted: false, voteChoice: 0, delegatedTo: null, votedByDelegate: false, delegateVoteChoice: 0, wasOverridden: false },
  ],
  treasury: { balance: 0.0001, minDues: 0.0001 },
  proposal: null,
  malhaFinaComplete: false,
  inReviewPeriod: false,
  selectedLotIndex: null,
};

// ═══════════════════════════════════════════════════════════════
//  THREE.JS GLOBALS
// ═══════════════════════════════════════════════════════════════

let scene, camera, renderer, controls, composer;
const clock = new THREE.Clock();
const houses = [];      // { group, glowOrb, glowLight, walls }
let townHallGroup;
let fireflies;
const activeAnimations = [];
const delegationLines = [];  // 3D lines showing delegation links
const labels = [];           // HTML elements
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredHouseIdx = null;

const HOUSE_CONFIGS = [
  { wallColor: 0xffcc80, roofColor: 0xbf360c, pos: new THREE.Vector3(-6, 0, 6) },  // Vibrant Amber
  { wallColor: 0x81d4fa, roofColor: 0x01579b, pos: new THREE.Vector3(0, 0, 8.5) }, // Vibrant Blue
  { wallColor: 0xc5e1a5, roofColor: 0x33691e, pos: new THREE.Vector3(6, 0, 6) },  // Vibrant Green
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
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a2a1a); // Changed to deep green
  scene.fog = new THREE.FogExp2(0x0a2a1a, 0.012); // Reduced from 0.025 for clarity

  // Camera
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(2, 14, 22);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25; // Increased for better brightness
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('canvas-container').appendChild(renderer.domElement);
  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

  // Controls
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

  // ── Lighting ──
  scene.add(new THREE.AmbientLight(0x5a5a90, 0.85)); // Boosted further
  scene.add(new THREE.HemisphereLight(0x6699ff, 0x223322, 0.6));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(-15, 20, 20); // Moved to hit house fronts (more towards camera/left)
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

  // ── Post-processing ──
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35, 0.5, 0.72
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Resize
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
  // Main ground
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(28, 64),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.85 }) // Lighter, vibrant grass green
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Stone plaza
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(5, 48),
    new THREE.MeshStandardMaterial({ color: 0x2d3a40, roughness: 0.85 })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.01;
  scene.add(plaza);

  // Outer ring decoration
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

  // Walls
  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), wallMat);
  walls.position.y = 0.8;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 1.3, 4), roofMat);
  roof.position.y = 2.0;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Door
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.85, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x4e342e })
  );
  door.position.set(0, 0.42, -1.13);
  group.add(door);

  // Windows (emissive — will bloom)
  const winMat = new THREE.MeshBasicMaterial({ color: 0xfff5cc });
  for (const x of [-0.55, 0.55]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), winMat);
    win.position.set(x, 1.05, -1.12);
    group.add(win);
  }

  // Chimney
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.65, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x6d4c41 })
  );
  chimney.position.set(0.55, 2.4, 0.35);
  group.add(chimney);

  // Status glow orb (MeshBasicMaterial → triggers bloom)
  const statusColor = state.lots[index].delinquent ? 0xff5252 : 0x00e676;
  const glowOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshBasicMaterial({ color: statusColor, transparent: true, opacity: 0.85 })
  );
  glowOrb.position.set(0, 2.9, 0);
  group.add(glowOrb);

  // Status PointLight
  const glowLight = new THREE.PointLight(statusColor, 1.5, 6);
  glowLight.position.set(0, 1.2, -0.5);
  group.add(glowLight);

  // Local Porch/Structure Light (subtle warm light to highlight house body)
  const porchLight = new THREE.PointLight(0xfff5cc, 1.2, 4.5);
  porchLight.position.set(0, 1.2, -1.2);
  group.add(porchLight);

  // Position & rotate to face center
  group.position.copy(config.pos);
  group.rotation.y = Math.atan2(-config.pos.x, -config.pos.z);

  scene.add(group);
  return { group, glowOrb, glowLight, walls };
}

function createTownHall() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xbcc8d0, roughness: 0.55, metalness: 0.05 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a5d68, roughness: 0.65 });

  // Base platform
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 4.2), mat);
  base.position.set(0, 0.15, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Main building
  const main = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.6, 3.5), mat);
  main.position.set(0, 1.6, 0);
  main.castShadow = true;
  group.add(main);

  // Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.7, 1.4, 4), roofMat);
  roof.position.set(0, 3.6, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Tower
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 8), mat);
  tower.position.set(0, 4.6, 0);
  group.add(tower);

  // Golden cap
  const capMat = new THREE.MeshStandardMaterial({ color: 0xffd740, metalness: 0.85, roughness: 0.15 });
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.65, 8), capMat);
  cap.position.set(0, 5.6, 0);
  group.add(cap);

  // Golden tip orb (blooms!)
  const tipOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd740 })
  );
  tipOrb.position.set(0, 5.98, 0);
  group.add(tipOrb);

  // Front columns
  const colMat = new THREE.MeshStandardMaterial({ color: 0xdde3e8, roughness: 0.45 });
  for (let i = 0; i < 4; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.3, 8), colMat);
    col.position.set(-1.35 + i * 0.9, 1.45, 1.82);
    col.castShadow = true;
    group.add(col);
  }

  // Front steps
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(3.2 - i * 0.2, 0.14, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.8 })
    );
    step.position.set(0, 0.37 + i * 0.14, 2.2 + (2 - i) * 0.28);
    step.castShadow = true;
    group.add(step);
  }

  // Glowing windows
  const winMat = new THREE.MeshBasicMaterial({ color: 0xfff5cc });
  for (const x of [-0.8, 0.8]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75), winMat);
    win.position.set(x, 1.8, 1.76);
    group.add(win);
  }

  // Entrance
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

      // Fade out if outside frustum
      if (pos.z > 1) {
        label.style.display = 'none';
      } else {
        label.style.display = 'block';
        label.classList.toggle('active', state.selectedLotIndex === i || hoveredHouseIdx === i);
      }
    }
  });

  updateFloatingMenu();
}

function updateFloatingMenu() {
  const menu = document.getElementById('floating-vote-menu');
  if (!menu) return;

  const idx = state.selectedLotIndex;
  const h = houses[idx];
  const pos = h.group.position.clone().add(new THREE.Vector3(0, 3.5, 0));
  pos.project(camera);

  const x = (pos.x * (window.innerWidth / 2)) + (window.innerWidth / 2);
  const y = -(pos.y * (window.innerHeight / 2)) + (window.innerHeight / 2);

  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
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

function animateVote(lotIndex, choice) {
  const house = houses[lotIndex];
  const start = house.group.position.clone().add(new THREE.Vector3(0, 2.8, 0));
  const end = new THREE.Vector3(0, 4, 0);
  const color = choice === 1 ? 0x00e676 : choice === 2 ? 0xff5252 : 0x9e9e9e;
  const count = 14;

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
      t0: performance.now() + i * 55,
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

function animateDelegation(fromIdx, toIdx) {
  // Purple particles fly from delegator house to delegate house
  const fromPos = houses[fromIdx].group.position.clone().add(new THREE.Vector3(0, 2.5, 0));
  const toPos = houses[toIdx].group.position.clone().add(new THREE.Vector3(0, 2.5, 0));
  const count = 12;

  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xb388ff })
    );
    p.position.copy(fromPos);
    scene.add(p);

    activeAnimations.push({
      type: 'vote', mesh: p,
      start: fromPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.2, (Math.random() - 0.5) * 0.3)),
      end: toPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.2, (Math.random() - 0.5) * 0.3)),
      t0: performance.now() + i * 70,
      dur: 1200,
      done: false,
    });
  }
}

function animateDelegatedVote(delegateIdx, choice) {
  // Vote particles from delegate house to town hall — lighter color
  const start = houses[delegateIdx].group.position.clone().add(new THREE.Vector3(0, 2.8, 0));
  const end = new THREE.Vector3(0, 4, 0);
  const baseColor = choice === 1 ? 0x69f0ae : choice === 2 ? 0xff8a80 : 0xbdbdbd; // lighter tones
  const count = 10;

  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: baseColor })
    );
    p.position.copy(start);
    scene.add(p);

    activeAnimations.push({
      type: 'vote', mesh: p,
      start: start.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.2, (Math.random() - 0.5) * 0.3)),
      end: end.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.4, (Math.random() - 0.5) * 0.6)),
      t0: performance.now() + i * 60,
      dur: 1100,
      done: false,
    });
  }
}

function animateOverride(lotIdx, newChoice) {
  const house = houses[lotIdx];
  const pos = house.group.position.clone().add(new THREE.Vector3(0, 2.5, 0));

  // Red flash burst
  const burst = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff5252, transparent: true, opacity: 0.45 })
  );
  burst.position.copy(pos);
  scene.add(burst);
  activeAnimations.push({ type: 'flash', mesh: burst, t0: performance.now(), dur: 600, done: false });

  // Gold particles rising (new vote)
  setTimeout(() => {
    const color = newChoice === 1 ? 0x00e676 : newChoice === 2 ? 0xff5252 : 0x9e9e9e;
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color })
      );
      p.position.copy(pos);
      scene.add(p);
      activeAnimations.push({
        type: 'vote', mesh: p,
        start: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4)),
        end: new THREE.Vector3(0, 4.5, 0),
        t0: performance.now() + i * 50,
        dur: 1000,
        done: false,
      });
    }
  }, 400);
}

function updateDelegationLines() {
  // Remove old lines
  delegationLines.forEach(l => { scene.remove(l); l.geometry.dispose(); l.material.dispose(); });
  delegationLines.length = 0;

  // Draw new lines for active delegations
  state.lots.forEach((lot, i) => {
    if (lot.delegatedTo === null) return;
    const targetIdx = state.lots.findIndex(l => l.id === lot.delegatedTo);
    if (targetIdx === -1) return;

    const from = houses[i].group.position.clone().add(new THREE.Vector3(0, 2.2, 0));
    const to = houses[targetIdx].group.position.clone().add(new THREE.Vector3(0, 2.2, 0));

    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineDashedMaterial({ color: 0xb388ff, dashSize: 0.3, gapSize: 0.15, transparent: true, opacity: 0.55 });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    scene.add(line);
    delegationLines.push(line);
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
            if (state.lots[j].voted && state.lots[j].delinquent) {
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
  c.innerHTML = state.lots.map((lot, i) => `
    <div class="lot-card ${lot.delinquent ? 'delinquent' : 'current'}">
      <div class="lot-header">
        <span class="lot-id">#${lot.id}</span>
        <span class="lot-status ${lot.delinquent ? 'text-red' : 'text-green'}">
          ${lot.delinquent ? '❌ Inadimplente' : '✅ Em Dia'}
        </span>
      </div>
      <div class="lot-owner">${lot.owner}</div>
      <div class="lot-date">${lot.lastPaid > 0 ? new Date(lot.lastPaid * 1000).toLocaleDateString('pt-BR') : 'Nunca pagou'}</div>
      <button class="btn btn-small btn-gold" data-action="pay" data-index="${i}" ${!lot.delinquent ? 'disabled' : ''}>
        💰 Pagar Taxa
      </button>
    </div>
  `).join('');
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

function renderVotingSection() {
  const c = document.getElementById('voting-section');
  if (!state.proposal) { c.innerHTML = '<p class="muted">Crie uma proposta primeiro.</p>'; return; }

  let html = `
    <div class="proposal-info">
      <div class="proposal-title">"${state.proposal.title}"</div>
      <div class="proposal-desc">${state.proposal.description}</div>
    </div>
    <div class="result-bar">
      <div class="result-item favor"><div class="count">${state.proposal.votesFor}</div><div class="label">A Favor</div></div>
      <div class="result-item contra"><div class="count">${state.proposal.votesAgainst}</div><div class="label">Contra</div></div>
      <div class="result-item abstain"><div class="count">${state.proposal.votesAbstain}</div><div class="label">Abstenção</div></div>
    </div>
  `;

  state.lots.forEach((lot, i) => {
    const badge = lot.delinquent ? 'red' : 'green';
    html += `
      <div class="vote-row">
        <div class="vote-lot">
          <span class="lot-badge ${badge}">#${lot.id}</span>
          <span style="font-size:0.75rem">${lot.owner}</span>
        </div>
        ${lot.voted
          ? `<span class="vote-choice">${CHOICE_LABELS[lot.voteChoice]}</span>`
          : `<div class="vote-buttons">
               <button class="btn btn-small btn-green" data-action="vote" data-index="${i}" data-choice="1">A Favor</button>
               <button class="btn btn-small btn-red"   data-action="vote" data-index="${i}" data-choice="2">Contra</button>
             </div>`
        }
      </div>
    `;
  });

  c.innerHTML = html;
}

function showMalhaFinaResults() {
  const flagged = state.lots.filter(l => l.voted && l.delinquent);
  const clean   = state.lots.filter(l => l.voted && !l.delinquent);
  const c = document.getElementById('audit-results');
  let html = '';

  if (flagged.length > 0) {
    html += `<div class="audit-header alert">🚨 ${flagged.length} voto(s) de inadimplentes!</div>`;
    flagged.forEach(lot => {
      html += `
        <div class="alert-item">
          <strong>Lote #${lot.id}</strong> (${lot.owner})<br>
          Votou "${CHOICE_LABELS[lot.voteChoice]}" mas está <span class="text-red">INADIMPLENTE</span>!<br>
          <small>Este voto pode ser invalidado pelo regulamento.</small>
        </div>`;
    });
  }

  if (clean.length > 0) {
    html += `<div class="audit-header success">✅ ${clean.length} voto(s) válidos</div>`;
    clean.forEach(lot => {
      html += `<div class="clean-item"><strong>Lote #${lot.id}</strong> — ${CHOICE_LABELS[lot.voteChoice]} ✅</div>`;
    });
  }

  if (state.proposal && flagged.length > 0) {
    const adjFor = state.proposal.votesFor - flagged.filter(l => l.voteChoice === 1).length;
    const adjAg  = state.proposal.votesAgainst - flagged.filter(l => l.voteChoice === 2).length;
    const verdict = adjFor > adjAg ? '📢 APROVADA ✅' : adjAg > adjFor ? '📢 REJEITADA ❌' : '📢 EMPATE ⚖️ — Conselho decide';
    html += `
      <div class="result-section">
        <div class="audit-header">📊 Resultado Ajustado</div>
        <div class="result-bar">
          <div class="result-item favor"><div class="count">${adjFor}</div><div class="label">A Favor</div></div>
          <div class="result-item contra"><div class="count">${adjAg}</div><div class="label">Contra</div></div>
        </div>
        <div class="final-verdict">${verdict}</div>
      </div>`;
  } else if (state.proposal && flagged.length === 0) {
    const verdict = state.proposal.votesFor > state.proposal.votesAgainst ? '📢 APROVADA ✅' : state.proposal.votesAgainst > state.proposal.votesFor ? '📢 REJEITADA ❌' : '📢 EMPATE ⚖️';
    html += `<div class="final-verdict">${verdict}</div>`;
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

function handleCreateProposal() {
  const title = document.getElementById('proposal-title').value.trim();
  const desc  = document.getElementById('proposal-desc').value.trim();
  if (!title) { notify('Digite um título para a proposta!', 'warning'); return; }

  state.proposal = {
    title, description: desc || 'Sem descrição.',
    votesFor: 0, votesAgainst: 0, votesAbstain: 0,
    createdAt: Date.now(),
  };

  // Reset votes & audit
  state.lots.forEach(l => { l.voted = false; l.voteChoice = 0; l.votedByDelegate = false; l.delegateVoteChoice = 0; l.wasOverridden = false; });
  state.malhaFinaComplete = false;
  state.inReviewPeriod = false;
  document.getElementById('audit-results').innerHTML = '';
  document.getElementById('btn-malha-fina').disabled = false;

  flashTownHall();
  renderVotingSectionPatched();
  renderDelegationSection();
  switchTab('voting');
  notify(`Proposta "${title}" criada com sucesso!`, 'success');
}

function handleVote(idx, choice) {
  const lot = state.lots[idx];
  if (lot.voted) { notify(`Lote #${lot.id} já votou!`, 'warning'); return; }
  if (!state.proposal) { notify('Crie uma proposta primeiro!', 'warning'); return; }

  lot.voted = true;
  lot.voteChoice = choice;
  if (choice === 1) state.proposal.votesFor++;
  else if (choice === 2) state.proposal.votesAgainst++;
  else state.proposal.votesAbstain++;

  animateVote(idx, choice);

  // Cascade vote to all delegators
  let delegatedCount = 0;
  state.lots.forEach((delegateLot, i) => {
    if (delegateLot.delegatedTo === lot.id && !delegateLot.voted) {
      delegateLot.voted = true;
      delegateLot.voteChoice = choice;
      delegateLot.votedByDelegate = true;
      delegateLot.delegateVoteChoice = choice;
      
      if (choice === 1) state.proposal.votesFor++;
      else if (choice === 2) state.proposal.votesAgainst++;
      else state.proposal.votesAbstain++;

      animateDelegatedVote(idx, choice);
      delegatedCount++;
    }
  });

  setTimeout(() => {
    renderVotingSectionPatched();
    renderDelegationSection();
    if (delegatedCount > 0) {
      notify(`Lote #${lot.id} votou ${CHOICE_LABELS[choice]} (e +${delegatedCount} voto(s) delegado(s)!)`, choice === 1 ? 'success' : choice === 2 ? 'error' : 'info');
    } else {
      notify(`Lote #${lot.id} votou ${CHOICE_LABELS[choice]}`, choice === 1 ? 'success' : choice === 2 ? 'error' : 'info');
    }
  }, 1200);
}

function handleMalhaFina() {
  if (!state.proposal) { notify('Crie uma proposta primeiro!', 'warning'); return; }
  const votedCount = state.lots.filter(l => l.voted).length;
  if (votedCount === 0) { notify('Nenhum voto registrado!', 'warning'); return; }

  document.getElementById('btn-malha-fina').disabled = true;
  notify('🔍 Iniciando varredura de integridade...', 'info');
  animateMalhaFina();

  setTimeout(() => {
    const flagged = state.lots.filter(l => l.voted && l.delinquent).length;
    if (flagged > 0) notify(`🚨 ${flagged} voto(s) de inadimplentes detectados!`, 'error');
    else notify('✅ Todos os votos são de moradores adimplentes!', 'success');
  }, 3500);
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${name}`));
}

// ═══════════════════════════════════════════════════════════════
//  DELEGATION UI & HANDLERS
// ═══════════════════════════════════════════════════════════════

function renderDelegationSection() {
  const c = document.getElementById('delegation-section');
  let html = '';

  // Delegation controls for each lot
  state.lots.forEach((lot, i) => {
    const hasDelegation = lot.delegatedTo !== null;
    const targetLot = hasDelegation ? state.lots.find(l => l.id === lot.delegatedTo) : null;

    html += `<div class="delegation-card">`;
    html += `<div class="delegation-header">
      <span class="lot-id">#${lot.id}</span>
      ${hasDelegation
        ? `<span class="delegation-badge active">🤝 DELEGADO</span>`
        : `<span class="delegation-badge" style="opacity:0.4">SEM DELEGAÇÃO</span>`
      }
    </div>`;

    if (hasDelegation && targetLot) {
      html += `<div class="delegation-arrow">
        <span>Lote #${lot.id}</span>
        <span class="arrow">→</span>
        <span>Lote #${targetLot.id} (${targetLot.owner})</span>
      </div>`;

      // Show delegated vote if in review period
      if (state.inReviewPeriod && lot.votedByDelegate && !lot.wasOverridden) {
        html += `<div class="delegated-vote-reveal">
          👀 O delegado votou: <strong>${CHOICE_LABELS[lot.delegateVoteChoice]}</strong>
          <div class="override-section">
            <button class="btn btn-small btn-green" data-action="override" data-index="${i}" data-choice="1">⚡ Mudar p/ A Favor</button>
            <button class="btn btn-small btn-red" data-action="override" data-index="${i}" data-choice="2" style="margin-left:4px">⚡ Mudar p/ Contra</button>
          </div>
        </div>`;
      } else if (lot.wasOverridden) {
        html += `<div class="delegation-info text-green">✅ Voto foi corrigido para: ${CHOICE_LABELS[lot.voteChoice]}</div>`;
      } else if (lot.votedByDelegate) {
        html += `<div class="delegation-info">🗳️ Delegado já votou nesta proposta</div>`;
      }

      html += `<div style="display:flex;gap:4px;margin-top:6px">
        <button class="btn btn-small btn-outline" data-action="revoke-delegation" data-index="${i}">🚫 Revogar Permanente</button>
      </div>`;
    } else {
      // Show delegation setup — pick a target lot
      const otherLots = state.lots.filter(l => l.id !== lot.id);
      html += `<div style="display:flex;gap:4px;margin-top:4px">`;
      otherLots.forEach(target => {
        html += `<button class="btn btn-small btn-purple" data-action="delegate" data-index="${i}" data-target="${target.id}">→ Lote #${target.id}</button>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  // Review period toggle (for demo)
  if (state.proposal && state.lots.some(l => l.votedByDelegate && !l.wasOverridden)) {
    html += `<div style="margin-top:12px">`;
    if (!state.inReviewPeriod) {
      html += `<button id="btn-start-review" class="btn btn-gold full-width">⏰ Simular Período de Revisão</button>`;
    } else {
      html += `<div class="review-timer">⏰ Período de revisão ativo — 24h para revisar votos delegados</div>`;
    }
    html += `</div>`;
  }

  c.innerHTML = html;
}

function handleDelegate(fromIdx, targetLotId) {
  const lot = state.lots[fromIdx];
  lot.delegatedTo = targetLotId;

  const targetIdx = state.lots.findIndex(l => l.id === targetLotId);
  animateDelegation(fromIdx, targetIdx);
  updateDelegationLines();
  renderDelegationSection();
  renderLotCards();
  notify(`Lote #${lot.id} delegou voto para Lote #${targetLotId} 🤝`, 'info');
}

function handleRevokeDelegation(idx) {
  const lot = state.lots[idx];
  lot.delegatedTo = null;
  updateDelegationLines();
  renderDelegationSection();
  renderLotCards();
  notify(`Delegação do Lote #${lot.id} revogada permanentemente! 🚫`, 'warning');
}

function handleCastDelegatedVote(delegateIdx, ownerIdx, choice) {
  const ownerLot = state.lots[ownerIdx];
  if (ownerLot.voted) { notify(`Lote #${ownerLot.id} já votou!`, 'warning'); return; }
  if (!state.proposal) { notify('Crie uma proposta primeiro!', 'warning'); return; }

  ownerLot.voted = true;
  ownerLot.voteChoice = choice;
  ownerLot.votedByDelegate = true;
  ownerLot.delegateVoteChoice = choice;
  if (choice === 1) state.proposal.votesFor++;
  else if (choice === 2) state.proposal.votesAgainst++;
  else state.proposal.votesAbstain++;

  animateDelegatedVote(delegateIdx, choice);
  setTimeout(() => {
    renderVotingSectionPatched();
    renderDelegationSection();
    notify(`Delegado votou ${CHOICE_LABELS[choice]} pelo Lote #${ownerLot.id} 🤝`, choice === 1 ? 'success' : choice === 2 ? 'error' : 'info');
  }, 1200);
}

function handleOverride(idx, newChoice) {
  const lot = state.lots[idx];
  if (!lot.votedByDelegate || lot.wasOverridden) return;

  const oldChoice = lot.voteChoice;

  // Subtract old tally
  if (oldChoice === 1) state.proposal.votesFor--;
  else if (oldChoice === 2) state.proposal.votesAgainst--;
  else state.proposal.votesAbstain--;

  // Add new tally
  if (newChoice === 1) state.proposal.votesFor++;
  else if (newChoice === 2) state.proposal.votesAgainst++;
  else state.proposal.votesAbstain++;

  lot.voteChoice = newChoice;
  lot.votedByDelegate = false;
  lot.wasOverridden = true;

  animateOverride(idx, newChoice);
  setTimeout(() => {
    renderVotingSectionPatched();
    renderDelegationSection();
    notify(`Lote #${lot.id} revogou voto do delegado! Novo voto: ${CHOICE_LABELS[newChoice]} ⚡`, 'warning');
  }, 1000);
}

function handleStartReview() {
  state.inReviewPeriod = true;
  renderDelegationSection();
  notify('⏰ Período de revisão iniciado! Você pode revisar votos delegados.', 'info');
}

// ═══════════════════════════════════════════════════════════════
//  UPDATED VOTING SECTION (shows delegation info)
// ═══════════════════════════════════════════════════════════════

function renderVotingSectionWithDelegation() {
  const c = document.getElementById('voting-section');
  if (!state.proposal) { c.innerHTML = '<p class="muted">Crie uma proposta primeiro.</p>'; return; }

  let html = `
    <div class="proposal-info">
      <div class="proposal-title">"${state.proposal.title}"</div>
      <div class="proposal-desc">${state.proposal.description}</div>
    </div>
    <div class="result-bar">
      <div class="result-item favor"><div class="count">${state.proposal.votesFor}</div><div class="label">A Favor</div></div>
      <div class="result-item contra"><div class="count">${state.proposal.votesAgainst}</div><div class="label">Contra</div></div>
      <div class="result-item abstain"><div class="count">${state.proposal.votesAbstain}</div><div class="label">Abstenção</div></div>
    </div>
  `;

  state.lots.forEach((lot, i) => {
    const badge = lot.delinquent ? 'red' : 'green';
    const delegatedLabel = lot.votedByDelegate && !lot.wasOverridden ? '<span class="delegated-label">🤝 delegado</span>' : '';
    const overriddenLabel = lot.wasOverridden ? '<span class="delegated-label" style="color:var(--gold)">⚡ corrigido</span>' : '';

    html += `
      <div class="vote-row">
        <div class="vote-lot">
          <span class="lot-badge ${badge}">#${lot.id}</span>
          <span style="font-size:0.75rem">${lot.owner}</span>
        </div>
        ${lot.voted
          ? `<span class="vote-choice">${CHOICE_LABELS[lot.voteChoice]}${delegatedLabel}${overriddenLabel}</span>`
          : lot.delegatedTo !== null
            ? `<div class="vote-buttons">
                 <button class="btn btn-small btn-purple" data-action="delegated-vote" data-owner="${i}" data-choice="1">🤝 A Favor</button>
                 <button class="btn btn-small btn-purple" data-action="delegated-vote" data-owner="${i}" data-choice="2" style="background:#ce93d8">🤝 Contra</button>
               </div>`
            : `<div class="vote-buttons">
                 <button class="btn btn-small btn-green" data-action="vote" data-index="${i}" data-choice="1">A Favor</button>
                 <button class="btn btn-small btn-red"   data-action="vote" data-index="${i}" data-choice="2">Contra</button>
               </div>`
        }
      </div>
    `;
  });

  c.innerHTML = html;
}

function setupEventListeners() {
  document.getElementById('btn-connect-wallet').addEventListener('click', connectWallet);

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
      if (tab.dataset.tab !== 'voting') deselectHouse();
    });
  });

  // Create proposal
  document.getElementById('btn-create-proposal').addEventListener('click', handleCreateProposal);

  // Malha Fina
  document.getElementById('btn-malha-fina').addEventListener('click', handleMalhaFina);

  // Mouse Movement & Interaction
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('click', onPointerClick);

  // Lot card actions (event delegation)
  document.getElementById('lot-cards').addEventListener('click', e => {
    const btn = e.target.closest('[data-action="pay"]');
    if (btn) handlePay(parseInt(btn.dataset.index));
    
    // Auto-select house when clicking card
    const card = e.target.closest('.lot-card');
    if (card) {
      const idx = Array.from(card.parentNode.children).indexOf(card);
      selectHouse(idx);
    }
  });

  // Sidebar Voting actions
  document.getElementById('voting-section').addEventListener('click', e => {
    const voteBtn = e.target.closest('[data-action="vote"]');
    if (voteBtn) handleVote(parseInt(voteBtn.dataset.index), parseInt(voteBtn.dataset.choice));

    const delegatedVoteBtn = e.target.closest('[data-action="delegated-vote"]');
    if (delegatedVoteBtn) {
      const ownerIdx = parseInt(delegatedVoteBtn.dataset.owner);
      const choice = parseInt(delegatedVoteBtn.dataset.choice);
      const ownerLot = state.lots[ownerIdx];
      const delegateIdx = state.lots.findIndex(l => l.id === ownerLot.delegatedTo);
      handleCastDelegatedVote(delegateIdx >= 0 ? delegateIdx : 0, ownerIdx, choice);
    }
  });

  // Delegate actions
  document.getElementById('delegation-section').addEventListener('click', e => {
    const delegateBtn = e.target.closest('[data-action="delegate"]');
    if (delegateBtn) handleDelegate(parseInt(delegateBtn.dataset.index), parseInt(delegateBtn.dataset.target));
    const revokeBtn = e.target.closest('[data-action="revoke-delegation"]');
    if (revokeBtn) handleRevokeDelegation(parseInt(revokeBtn.dataset.index));
    const overrideBtn = e.target.closest('[data-action="override"]');
    if (overrideBtn) handleOverride(parseInt(overrideBtn.dataset.index), parseInt(overrideBtn.dataset.choice));
    if (e.target.id === 'btn-start-review') handleStartReview();
  });
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(houses.map(h => h.walls));

  if (intersects.length > 0) {
    const idx = houses.findIndex(h => h.walls === intersects[0].object);
    if (hoveredHouseIdx !== idx) {
      hoveredHouseIdx = idx;
      document.body.style.cursor = 'pointer';
    }
  } else {
    if (hoveredHouseIdx !== null) {
      hoveredHouseIdx = null;
      document.body.style.cursor = 'default';
    }
  }
}

function onPointerClick(event) {
  // Don't deselect if clicking on UI
  if (event.target.closest('.panel') || event.target.closest('.floating-vote-menu')) return;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(houses.map(h => h.walls));

  if (intersects.length > 0) {
    const idx = houses.findIndex(h => h.walls === intersects[0].object);
    selectHouse(idx);
  } else {
    deselectHouse();
  }
}

function selectHouse(idx) {
  state.selectedLotIndex = idx;
  switchTab('voting');
  renderFloatingMenu(idx);
  
  // Highlight selection in sidebar (lot cards)
  document.querySelectorAll('.lot-card').forEach((c, i) => {
    c.style.borderColor = (i === idx) ? 'var(--blue)' : '';
    if (i === idx) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function deselectHouse() {
  state.selectedLotIndex = null;
  const menu = document.getElementById('floating-vote-menu');
  if (menu) menu.remove();
  
  document.querySelectorAll('.lot-card').forEach(c => c.style.borderColor = '');
  controls.autoRotate = true;
}

function renderFloatingMenu(idx) {
  const lot = state.lots[idx];
  const oldMenu = document.getElementById('floating-vote-menu');
  if (oldMenu) oldMenu.remove();

  if (lot.voted || !state.proposal) return;

  const menu = document.createElement('div');
  menu.id = 'floating-vote-menu';
  menu.className = 'floating-vote-menu';
  
  const isDelegated = lot.delegatedTo !== null;

  menu.innerHTML = `
    <button class="close-btn">&times;</button>
    <h4>Lote #${lot.id} — Votar</h4>
    ${isDelegated 
      ? `
        <button class="btn btn-purple full-width" data-choice="1">🤝 A Favor</button>
        <button class="btn btn-purple full-width" data-choice="2" style="background:#ce93d8">🤝 Contra</button>
      `
      : `
        <button class="btn btn-green full-width" data-choice="1">Votar A Favor</button>
        <button class="btn btn-red full-width" data-choice="2">Votar Contra</button>
      `
    }
  `;

  document.getElementById('ui-overlay').appendChild(menu);

  // Menu events
  menu.querySelector('.close-btn').onclick = deselectHouse;
  menu.querySelectorAll('.btn').forEach(btn => {
    btn.onclick = () => {
      const choice = parseInt(btn.dataset.choice);
      if (isDelegated) {
        const delegateIdx = state.lots.findIndex(l => l.id === lot.delegatedTo);
        handleCastDelegatedVote(delegateIdx, idx, choice);
      } else {
        handleVote(idx, choice);
      }
      deselectHouse();
    };
  });
}

// Override renderVotingSection to use the delegation-aware version
const _originalRenderVotingSection = renderVotingSection;
function renderVotingSectionPatched() {
  // Use delegation-aware version if any lot has a delegation
  if (state.lots.some(l => l.delegatedTo !== null)) {
    renderVotingSectionWithDelegation();
  } else {
    _originalRenderVotingSection();
  }
}

// ═══════════════════════════════════════════════════════════════
//  RENDER LOOP
// ═══════════════════════════════════════════════════════════════

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  
  // Smooth camera interpolation
  if (state.selectedLotIndex !== null) {
    const targetHouse = houses[state.selectedLotIndex].group.position;
    const targetCamPoint = targetHouse.clone().add(new THREE.Vector3(4, 8, 12));
    camera.position.lerp(targetCamPoint, 0.05);
    controls.target.lerp(targetHouse, 0.05);
  }

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
    
    // Automatically connect if already authorized
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
    // Basic sync from Contracts to UI State
    const balance = await contracts.treasury.getBalance();
    const minDues = await contracts.treasury.minDuesAmount();
    state.treasury.balance = parseFloat(ethers.formatEther(balance));
    state.treasury.minDues = parseFloat(ethers.formatEther(minDues));
    updateTreasuryDisplay();
    
    // Attempt to identify which lot the user owns
    // Since we only have 3 lots in our visual demo, we'll brute-force check ownership of tokens 1, 2, 3
    let ownedLotIdx = null;
    for (let i = 0; i < state.lots.length; i++) {
        const tokenId = state.lots[i].id;
        try {
            const owner = await contracts.nft.ownerOf(tokenId);
            state.lots[i].owner = owner.substring(0, 6) + '...' + owner.substring(38);
            
            // Check delinquency
            const isDelinquent = await contracts.treasury.isDelinquent(tokenId, 30);
            state.lots[i].delinquent = isDelinquent;
            
            // Note: to keep demo functional and not rewrite everything just for testnet sync we just merge what is available
            
            if (owner.toLowerCase() === userAddress.toLowerCase()) {
                ownedLotIdx = i;
            }
        } catch(e) { /* might not be minted yet */ }
    }
    
    renderLotCards();
    renderComplianceBar();
    
    if (ownedLotIdx !== null && state.selectedLotIndex !== ownedLotIdx) {
      // Auto-focus camera on user's house!
      selectHouse(ownedLotIdx);
    }
  } catch (err) {
    console.error("Sync error:", err);
  }
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
  renderVotingSectionPatched();
  renderDelegationSection();
  await initWeb3();
  animate();
}

init();
