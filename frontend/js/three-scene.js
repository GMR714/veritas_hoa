import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let particlesMesh, globeMesh;
let webglAvailable = false;
const pointer = new THREE.Vector2();

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

export function initThreeJS() {
  const container = document.getElementById('three-canvas-container');
  if (!container) return;

  if (!isWebGLAvailable()) {
    console.warn('Three.js: WebGL not available, skipping 3D background.');
    return;
  }

  try {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 8);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x22C55E, 1.5);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x1B6B7D, 2);
    dirLight2.position.set(-5, -5, 2);
    scene.add(dirLight2);

    const geometry = new THREE.IcosahedronGeometry(2, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x1B6B7D,
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.8,
      thickness: 1.0,
      wireframe: true
    });
    globeMesh = new THREE.Mesh(geometry, material);
    scene.add(globeMesh);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 300;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
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

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('resize', onWindowResize);

    webglAvailable = true;
    animate();
  } catch (e) {
    console.warn('Three.js: Failed to initialize 3D background.', e);
    renderer = null;
    webglAvailable = false;
  }
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  if (!webglAvailable || !renderer) return;
  requestAnimationFrame(animate);
  try {
    controls.update();
    if (globeMesh) {
      globeMesh.rotation.x += 0.001;
      globeMesh.rotation.y += 0.002;
    }
    if (particlesMesh) {
      particlesMesh.rotation.y = -0.0005 * window.scrollY;
      if (pointer.x !== 0 || pointer.y !== 0) {
        particlesMesh.rotation.x += pointer.y * 0.001;
        particlesMesh.rotation.y += pointer.x * 0.001;
      }
    }
    renderer.render(scene, camera);
  } catch (e) {
    console.warn('Three.js: Render error, stopping animation.', e);
    webglAvailable = false;
  }
}

export function triggerActionEffect(type) {
  if (!globeMesh || !webglAvailable) return;

  const targetScale = type === 'vote' ? 1.2 : 1.4;
  const originalScale = 1.0;

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
