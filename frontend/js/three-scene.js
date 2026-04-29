import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let particlesMesh, globeMesh;
const pointer = new THREE.Vector2();

export function initThreeJS() {
  const container = document.getElementById('three-canvas-container');
  if (!container) return;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 8);

  // Renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x22C55E, 1.5);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  const dirLight2 = new THREE.DirectionalLight(0x1B6B7D, 2);
  dirLight2.position.set(-5, -5, 2);
  scene.add(dirLight2);

  // Gamified Element: "Village Core" Crystal
  const geometry = new THREE.IcosahedronGeometry(2, 1);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x1B6B7D,
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.8, // glass-like
    thickness: 1.0,
    wireframe: true
  });
  globeMesh = new THREE.Mesh(geometry, material);
  scene.add(globeMesh);

  // Particles / "Ideas" floating around
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 300;
  const posArray = new Float32Array(particlesCount * 3);

  for(let i = 0; i < particlesCount * 3; i++) {
    // Spread particles spherically around the core
    posArray[i] = (Math.random() - 0.5) * 15;
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  
  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.05,
    color: 0x22C55E,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });

  particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particlesMesh);

  // Mouse Interaction
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('resize', onWindowResize);

  animate();
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  // Subtle interaction with mouse
  if (globeMesh) {
    globeMesh.rotation.x += 0.001;
    globeMesh.rotation.y += 0.002;
  }

  // Particles subtle movement
  if (particlesMesh) {
    particlesMesh.rotation.y = -0.0005 * window.scrollY; // tie to scroll
    if (pointer.x !== 0 || pointer.y !== 0) {
        particlesMesh.rotation.x += pointer.y * 0.001;
        particlesMesh.rotation.y += pointer.x * 0.001;
    }
  }

  renderer.render(scene, camera);
}

// Function to trigger an effect when an action is taken (e.g., voting, submitting idea)
export function triggerActionEffect(type) {
  if (!globeMesh) return;
  
  const targetScale = type === 'vote' ? 1.2 : 1.4;
  const originalScale = 1.0;
  
  // Quick scale pulse
  let s = originalScale;
  const pulse = setInterval(() => {
    s += 0.05;
    globeMesh.scale.set(s, s, s);
    if (s >= targetScale) {
      clearInterval(pulse);
      const shrink = setInterval(() => {
        s -= 0.02;
        globeMesh.scale.set(s, s, s);
        if (s <= originalScale) {
          globeMesh.scale.set(originalScale, originalScale, originalScale);
          clearInterval(shrink);
        }
      }, 16);
    }
  }, 16);
}