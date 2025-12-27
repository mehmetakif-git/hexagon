import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger);

// Force scroll to top on page load/refresh
window.history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// --- Configuration ---
const COLORS = {
  primary: 0xff4400,
  background: 0x050505,
  accent: 0xff7700,
  grid: 0x331100,
  bgGlow: 0xff4400
};

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.background);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 8;
camera.position.x = 0; // Ensure camera is centered

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('app').appendChild(renderer.domElement);

// --- Post Processing (Reduced Glow) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.3,  // strength - further reduced
  0.1,  // radius
  0.6   // threshold
);
// Balanced glow
bloomPass.threshold = 0.4;
bloomPass.strength = 0.6;
bloomPass.radius = 0.4;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- Lighting ---
// Background glow - central but subtle
const bgGlowPoint = new THREE.PointLight(COLORS.bgGlow, 20, 20); // Reduced intensity
bgGlowPoint.position.set(0, 0, -2);
scene.add(bgGlowPoint);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Front light for 3D text
const frontLight = new THREE.DirectionalLight(0xffffff, 1);
frontLight.position.set(0, 0, 10);
scene.add(frontLight);

// Orange accent light
const accentLight = new THREE.PointLight(0xFF8106, 2, 15);
accentLight.position.set(2, 2, 5);
scene.add(accentLight);

// --- Background Hexagon Grid (Static & Full Screen) ---
const bgGroup = new THREE.Group();
const gridHexGeo = new THREE.CircleGeometry(0.5, 6);
const gridHexMat = new THREE.MeshBasicMaterial({
  color: COLORS.grid,
  wireframe: true,
  transparent: true,
  opacity: 0.15
});

// Expanded grid range to cover full screen
for (let i = -25; i < 25; i++) {
  for (let j = -15; j < 15; j++) {
    const hex = new THREE.Mesh(gridHexGeo, gridHexMat);
    const xOffset = j % 2 === 0 ? 0 : 0.45;
    hex.position.set(i * 0.9 + xOffset, j * 0.75, -5);
    // Removed idle animation from individual hexes for stillness
    bgGroup.add(hex);
  }
}
scene.add(bgGroup);

// --- Main Logo (SVG Based) ---
const loader = new SVGLoader();
let hexagonGroup;
let hexagonTextMesh = null;

// Service text labels for each section
const serviceTexts = ['HEXAGON', 'ABOUT', 'EVENT', 'MEDIA', 'DIGITAL', 'CONSULT', 'CONTACT'];
let currentTextIndex = 0;

// Text material (glowing orange)
const textMaterial = new THREE.MeshStandardMaterial({
  color: 0xFF8106,
  emissive: 0xFF8106,
  emissiveIntensity: 0.5,
  metalness: 0.8,
  roughness: 0.2
});

// Array to hold all 6 edge text planes
let hexagonTextMeshes = [];

// Create bump map texture from text (canvas-based)
function createBumpMap(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Black background (low)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 512, 128);

  // White text (high/embossed) - larger font
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create alpha map for transparency (only text visible)
function createAlphaMap(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Black background (transparent)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 512, 128);

  // White text (opaque)
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create normal map for bevel effect
function createNormalMap(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Neutral normal (flat surface) - RGB(128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 512, 128);

  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Left edge - left-facing normal
  ctx.fillStyle = 'rgb(60, 128, 255)';
  ctx.fillText(text, 252, 64);

  // Right edge - right-facing normal
  ctx.fillStyle = 'rgb(196, 128, 255)';
  ctx.fillText(text, 260, 64);

  // Top edge
  ctx.fillStyle = 'rgb(128, 60, 255)';
  ctx.fillText(text, 256, 60);

  // Bottom edge
  ctx.fillStyle = 'rgb(128, 196, 255)';
  ctx.fillText(text, 256, 68);

  // Center surface
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create diffuse (color) map with transparent background
function createDiffuseMap(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, 512, 128);

  // Text with emboss gradient - larger font
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textGrad = ctx.createLinearGradient(0, 20, 0, 108);
  textGrad.addColorStop(0, '#FFDD99');
  textGrad.addColorStop(0.3, '#FFAA44');
  textGrad.addColorStop(0.7, '#DD6600');
  textGrad.addColorStop(1, '#AA4400');
  ctx.fillStyle = textGrad;
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create embossed text on hexagon edges using texture maps
function createHexagonText(text) {
  if (!hexagonGroup) {
    console.log('Cannot create text - hexagon not ready');
    return;
  }

  const meshGroup = hexagonGroup.userData.meshGroup;
  if (!meshGroup) {
    console.log('meshGroup not found');
    return;
  }

  console.log('Creating embossed text on 6 edges:', text);

  // Remove existing text planes
  hexagonTextMeshes.forEach(mesh => {
    if (mesh && mesh.parent) {
      mesh.parent.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material.map) mesh.material.map.dispose();
      if (mesh.material.bumpMap) mesh.material.bumpMap.dispose();
      if (mesh.material.normalMap) mesh.material.normalMap.dispose();
      if (mesh.material.alphaMap) mesh.material.alphaMap.dispose();
      mesh.material.dispose();
    }
  });
  hexagonTextMeshes = [];

  // Create texture maps
  const diffuseMap = createDiffuseMap(text);
  const bumpMap = createBumpMap(text);
  const normalMap = createNormalMap(text);
  const alphaMap = createAlphaMap(text);

  // Hexagon edge dimensions - positioned on the ring
  // Hexagon outer ~3.9, inner ~2.5, ring center ~3.2
  const edgeWidth = 1.8;   // Width of text plane (along edge)
  const edgeHeight = 0.35; // Height of text plane (thinner)
  const edgeRadius = 3.2;  // Distance from center to edge middle (on the ring)

  // Create geometry for text planes
  const planeGeo = new THREE.PlaneGeometry(edgeWidth, edgeHeight, 32, 8);

  // Create 6 text planes, one for each edge
  for (let i = 0; i < 6; i++) {
    // Angle for hexagon edge centers (30°, 90°, 150°, 210°, 270°, 330°)
    const angle = (Math.PI / 6) + (i * Math.PI / 3);

    // Create material with emboss textures and alpha for transparency
    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap.clone(),
      bumpMap: bumpMap.clone(),
      bumpScale: 0.05,
      normalMap: normalMap.clone(),
      normalScale: new THREE.Vector2(1.2, 1.2),
      alphaMap: alphaMap.clone(),
      transparent: true,
      alphaTest: 0.1,
      metalness: 0.6,
      roughness: 0.4,
      side: THREE.DoubleSide
    });

    const textPlane = new THREE.Mesh(planeGeo, material);

    // Position on the edge - on top of the hexagon ring
    const x = Math.cos(angle) * edgeRadius;
    const y = Math.sin(angle) * edgeRadius;
    textPlane.position.set(x, y, 0.12); // On top of hexagon surface

    // Rotate to face outward and align with edge
    textPlane.rotation.z = angle - Math.PI / 2;

    meshGroup.add(textPlane);
    hexagonTextMeshes.push(textPlane);
  }

  hexagonTextMesh = hexagonTextMeshes[0];
  console.log('Created 6 embossed text planes');
}

// Function to animate text change (all 6 edges at once)
function changeHexagonText(newIndex) {
  if (newIndex === currentTextIndex) return;
  if (!hexagonGroup) return;

  const newText = serviceTexts[newIndex];
  currentTextIndex = newIndex;

  // If no text exists yet, create it directly
  if (hexagonTextMeshes.length === 0) {
    createHexagonText(newText);
    // Animate in all 6 text meshes
    hexagonTextMeshes.forEach((mesh, i) => {
      mesh.scale.set(0, 0, 0);
      gsap.to(mesh.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.4,
        delay: i * 0.05,
        ease: "back.out(1.7)"
      });
    });
    return;
  }

  // Animate out all existing texts
  const animateOutPromises = hexagonTextMeshes.map((mesh, i) => {
    return new Promise(resolve => {
      gsap.to(mesh.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.25,
        delay: i * 0.02,
        ease: "power2.in",
        onComplete: resolve
      });
    });
  });

  // When all texts are hidden, create new ones
  Promise.all(animateOutPromises).then(() => {
    createHexagonText(newText);
    // Animate in new texts
    hexagonTextMeshes.forEach((mesh, i) => {
      mesh.scale.set(0, 0, 0);
      gsap.to(mesh.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.4,
        delay: i * 0.05,
        ease: "back.out(1.7)"
      });
    });
  });
}


// Custom shader for 3D mesh drawing effect
const logoShaderUniforms = {
  color: { value: new THREE.Color(0xFF8106) },
  emissiveColor: { value: new THREE.Color(0xFF8106) },
  progress: { value: 0 },
  glowIntensity: { value: 1.0 }
};

const logoMaterial = new THREE.ShaderMaterial({
  uniforms: logoShaderUniforms,
  vertexShader: `
    varying vec3 vPosition;
    varying vec3 vNormal;
    void main() {
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform vec3 emissiveColor;
    uniform float progress;
    uniform float glowIntensity;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      // Calculate angle from center (0-1 range, clockwise from top)
      float angle = atan(vPosition.x, vPosition.y);
      float normalizedAngle = (angle + 3.14159) / (2.0 * 3.14159);

      // Drawing reveal based on angle
      float reveal = step(normalizedAngle, progress);

      if (reveal < 0.5) discard;

      // Simple lighting
      vec3 light = normalize(vec3(0.5, 0.5, 1.0));
      float diff = max(dot(vNormal, light), 0.3);

      vec3 finalColor = color * diff + emissiveColor * glowIntensity * 0.5;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide
});

loader.load('/assets/SVG/hexagon-logo.svg', (data) => {
  const paths = data.paths;
  const meshGroup = new THREE.Group();

  paths.forEach((path) => {
    const shapes = SVGLoader.createShapes(path);
    shapes.forEach((shape) => {
      // 3D mesh with drawing shader
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 5,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 1
      });
      geometry.center();
      const mesh = new THREE.Mesh(geometry, logoMaterial);
      mesh.scale.set(0.02, -0.02, 0.02);
      meshGroup.add(mesh);
    });
  });

  const pivot = new THREE.Group();
  pivot.add(meshGroup);

  hexagonGroup = new THREE.Group();
  hexagonGroup.add(pivot);
  hexagonGroup.userData.pivot = pivot;
  hexagonGroup.userData.meshGroup = meshGroup;

  hexagonGroup.position.set(0, 0, 0);
  scene.add(hexagonGroup);

  // Create initial embossed text
  createHexagonText('HEXAGON');

  playNeonAnimation();
  setupScrollAnimations();
}, undefined, () => {
  hexagonGroup = new THREE.Mesh(createCorrectHexagon(2.5, 0.3, 0.4), logoMaterial);
  scene.add(hexagonGroup);
  setupScrollAnimations();
});


// --- 3D Neon Logo Animation ---
function playNeonAnimation() {
  const tl = gsap.timeline({ delay: 0.3 });

  // Logo at full scale
  hexagonGroup.scale.set(1.3, 1.3, 1.3);

  // Phase 1: DRAWING - 3D mesh draws with shader
  tl.to(logoShaderUniforms.progress, {
    value: 1,
    duration: 2.5,
    ease: "power1.inOut"
  }, 0);

  // Phase 2: NEON PULSE - 2 flickers only, slower
  // First flash ON
  tl.to(logoShaderUniforms.glowIntensity, {
    value: 4.0,
    duration: 0.3
  }, 2.6);
  // Flicker off
  tl.to(logoShaderUniforms.glowIntensity, {
    value: 0.2,
    duration: 0.25
  }, 2.9);
  // Final flash ON and hold
  tl.to(logoShaderUniforms.glowIntensity, {
    value: 4.5,
    duration: 0.3
  }, 3.15);
  // Settle to steady neon glow
  tl.to(logoShaderUniforms.glowIntensity, {
    value: 1.5,
    duration: 0.8,
    ease: "power2.out"
  }, 3.45);

  // Bloom pulse (2 flickers, slower)
  tl.to(bloomPass, {
    strength: 0.25,
    duration: 0.3
  }, 2.6);
  tl.to(bloomPass, {
    strength: 0.1,
    duration: 0.25
  }, 2.9);
  tl.to(bloomPass, {
    strength: 0.3,
    duration: 0.3
  }, 3.15);
  tl.to(bloomPass, {
    strength: 0.15,
    duration: 0.8,
    ease: "power2.out"
  }, 3.45);

  // Phase 3: Text reveal after neon settles
  tl.call(() => {
    revealText();
  }, null, 4.5);
}

// Shuffle text animation state
let shuffleAnimationTimeline = null;
let currentCharElements = [];
let isTextAnimating = false;

function cleanupShuffleAnimation() {
  // Kill existing timeline
  if (shuffleAnimationTimeline) {
    shuffleAnimationTimeline.kill();
    shuffleAnimationTimeline = null;
  }

  // Kill any tweens on current elements
  currentCharElements.forEach(item => {
    if (item && item.inner) {
      gsap.killTweensOf(item.inner);
    }
  });
  currentCharElements = [];

  // Kill subtitle animations
  gsap.killTweensOf('.subtitle');
}

function revealText() {
  const title = document.querySelector('.title');
  if (!title) return;

  // Prevent overlapping animations
  if (isTextAnimating) {
    cleanupShuffleAnimation();
  }
  isTextAnimating = true;

  // Store original text
  if (!title.dataset.origText) {
    title.dataset.origText = title.textContent.trim() || 'HEXAGON';
  }
  const text = title.dataset.origText;

  // Clean up previous animation
  cleanupShuffleAnimation();

  // Clear and setup title
  title.innerHTML = '';
  title.style.cssText = 'opacity:1;display:flex;justify-content:center;align-items:center;gap:0;';

  const shuffleChars = '01#X%&@<>[]{}ABCDEFGH';
  const rollCount = 10;

  const titleStyle = window.getComputedStyle(title);
  const fontSize = titleStyle.fontSize;
  const fontFamily = titleStyle.fontFamily;

  // Create character elements
  currentCharElements = text.split('').map((char) => {
    const isSpace = char === ' ';

    // Measure character width
    const measure = document.createElement('span');
    measure.style.cssText = `visibility:hidden;position:absolute;white-space:pre;font-size:${fontSize};font-family:${fontFamily}`;
    measure.textContent = isSpace ? '\u00A0' : char;
    document.body.appendChild(measure);
    let charWidth = measure.offsetWidth || 60;
    const charHeight = measure.offsetHeight || 80;
    document.body.removeChild(measure);

    // Container for single character
    const container = document.createElement('span');
    container.className = 'shuffle-char';
    container.style.cssText = `display:inline-block;width:${charWidth}px;height:${charHeight}px;overflow:hidden;position:relative;margin-right:${isSpace ? '2rem' : '1.2rem'};vertical-align:middle;`;

    // Inner strip that scrolls
    const inner = document.createElement('span');
    inner.className = 'shuffle-inner';
    inner.style.cssText = 'display:inline-flex;position:absolute;left:0;top:0;white-space:nowrap;';

    // Build strip: random chars first, then actual char at end
    const strip = [];
    for (let i = 0; i < rollCount; i++) {
      strip.push(shuffleChars.charAt(Math.floor(Math.random() * shuffleChars.length)));
    }
    strip.push(char);

    strip.forEach(s => {
      const sSpan = document.createElement('span');
      sSpan.textContent = s === ' ' ? '\u00A0' : s;
      sSpan.style.cssText = `display:inline-block;width:${charWidth}px;text-align:center;flex-shrink:0;`;
      inner.appendChild(sSpan);
    });

    container.appendChild(inner);
    title.appendChild(container);

    return { inner, charWidth, rollCount, container };
  });

  // Create animation timeline
  shuffleAnimationTimeline = gsap.timeline({
    onComplete: () => {
      isTextAnimating = false;
    }
  });

  // Animate each character
  currentCharElements.forEach((item, index) => {
    gsap.set(item.inner, { x: 0 });
    shuffleAnimationTimeline.to(item.inner, {
      x: -item.charWidth * item.rollCount,
      duration: 0.8,
      ease: "power3.out"
    }, index * 0.04);
  });

  // Subtitle animation
  shuffleAnimationTimeline.fromTo('.subtitle',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
    0.3
  );
}

function unrevealText() {
  const title = document.querySelector('.title');
  if (!title) return;

  // Prevent overlapping animations
  if (isTextAnimating) {
    cleanupShuffleAnimation();
  }
  isTextAnimating = true;

  const text = title.dataset.origText || 'HEXAGON';

  // Clean up previous animation
  cleanupShuffleAnimation();

  // Clear and setup title
  title.innerHTML = '';
  title.style.cssText = 'opacity:1;display:flex;justify-content:center;align-items:center;gap:0;';

  const shuffleChars = '01#X%&@<>[]{}ABCDEFGH';
  const rollCount = 10;

  const titleStyle = window.getComputedStyle(title);
  const fontSize = titleStyle.fontSize;
  const fontFamily = titleStyle.fontFamily;

  // Create character elements
  currentCharElements = text.split('').map((char) => {
    const isSpace = char === ' ';

    // Measure character width
    const measure = document.createElement('span');
    measure.style.cssText = `visibility:hidden;position:absolute;white-space:pre;font-size:${fontSize};font-family:${fontFamily}`;
    measure.textContent = isSpace ? '\u00A0' : char;
    document.body.appendChild(measure);
    let charWidth = measure.offsetWidth || 60;
    const charHeight = measure.offsetHeight || 80;
    document.body.removeChild(measure);

    // Container for single character
    const container = document.createElement('span');
    container.className = 'shuffle-char';
    container.style.cssText = `display:inline-block;width:${charWidth}px;height:${charHeight}px;overflow:hidden;position:relative;margin-right:${isSpace ? '2rem' : '1.2rem'};vertical-align:middle;`;

    // Inner strip that scrolls
    const inner = document.createElement('span');
    inner.className = 'shuffle-inner';
    inner.style.cssText = 'display:inline-flex;position:absolute;left:0;top:0;white-space:nowrap;';

    // Build strip: actual char first, then random chars
    const strip = [char];
    for (let i = 0; i < rollCount; i++) {
      strip.push(shuffleChars.charAt(Math.floor(Math.random() * shuffleChars.length)));
    }

    strip.forEach(s => {
      const sSpan = document.createElement('span');
      sSpan.textContent = s === ' ' ? '\u00A0' : s;
      sSpan.style.cssText = `display:inline-block;width:${charWidth}px;text-align:center;flex-shrink:0;`;
      inner.appendChild(sSpan);
    });

    container.appendChild(inner);
    title.appendChild(container);

    // Start showing actual character
    gsap.set(inner, { x: 0 });

    return { inner, charWidth, rollCount, container };
  });

  // Create animation timeline
  shuffleAnimationTimeline = gsap.timeline({
    onComplete: () => {
      isTextAnimating = false;
      // Hide title after animation
      title.style.opacity = '0';
    }
  });

  // Animate each character out
  currentCharElements.forEach((item, index) => {
    shuffleAnimationTimeline.to(item.inner, {
      x: -item.charWidth * item.rollCount,
      duration: 0.6,
      ease: "power3.in"
    }, index * 0.03);
  });

  // Subtitle fade out
  shuffleAnimationTimeline.to('.subtitle', {
    opacity: 0,
    y: -20,
    duration: 0.5,
    ease: 'power2.in'
  }, 0);
}

// Fallback procedurally generated proper hexagon ring if SVG fails or while loading
function createCorrectHexagon(radius, thickness, depth) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const hole = new THREE.Path();
  const innerR = radius - thickness;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * innerR;
    const y = Math.sin(angle) * innerR;
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  shape.holes.push(hole);

  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 });
}

// --- Scroll Logic (for active state) ---
// Handled by GSAP ScrollTrigger in setupScrollAnimations

function setupScrollAnimations() {
  if (!hexagonGroup) return;

  const serviceSections = document.querySelectorAll('.service-section');
  const totalServices = serviceSections.length; // 6 services
  const rotationPerService = (Math.PI * 2) / 6; // 60° per service (hexagon has 6 edges)

  // Track text state - simpler approach with just shuffle animations
  let textRevealed = true;

  // Separate ScrollTrigger just for text shuffle - no scrubbed animations
  ScrollTrigger.create({
    trigger: ".hero",
    start: "bottom 85%",
    end: "bottom 15%",
    onEnter: () => {
      // Scrolling down past hero - unreveal text
      if (textRevealed) {
        textRevealed = false;
        // Kill any running text animations first
        gsap.killTweensOf('.title span span');
        gsap.killTweensOf('.subtitle');
        unrevealText();
      }
    },
    onLeaveBack: () => {
      // Scrolling back up into hero - reveal text
      if (!textRevealed) {
        textRevealed = true;
        // Kill any running text animations first
        gsap.killTweensOf('.title span span');
        gsap.killTweensOf('.subtitle');
        revealText();
      }
    }
  });

  // 3D Text change triggers for each service section
  // Hero -> HEXAGON (index 0)
  ScrollTrigger.create({
    trigger: ".hero",
    start: "top center",
    end: "bottom center",
    onEnter: () => changeHexagonText(0),
    onEnterBack: () => changeHexagonText(0)
  });

  // Each service section changes the text
  serviceSections.forEach((section, index) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top center",
      end: "bottom center",
      onEnter: () => changeHexagonText(index + 1),
      onEnterBack: () => changeHexagonText(index + 1)
    });
  });

  // 2. Master timeline for continuous hexagon animation
  const masterTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#content",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.5
    }
  });

  // Initial move to side WITH ROTATION (hero to first service)
  masterTl.to(hexagonGroup.position, {
    x: 4.5, y: 0, z: 0.5,
    duration: 0.1,
    ease: "power2.out"
  }, 0);
  masterTl.to(hexagonGroup.scale, {
    x: 1.6, y: 1.6, z: 1.6,
    duration: 0.1,
    ease: "power2.out"
  }, 0);
  // Rotate while moving to side (half rotation = 180°)
  masterTl.to(hexagonGroup.rotation, {
    z: -Math.PI,
    duration: 0.1,
    ease: "power2.out"
  }, 0);

  // Rotate through each service (60° each = 1 full rotation for 6 services)
  const serviceScrollPortion = 0.8 / totalServices;

  for (let i = 0; i < totalServices; i++) {
    const startTime = 0.1 + (i * serviceScrollPortion);
    // Continue rotation from -π plus 60° per service
    masterTl.to(hexagonGroup.rotation, {
      z: -Math.PI - rotationPerService * (i + 1),
      duration: serviceScrollPortion,
      ease: "power1.inOut"
    }, startTime);
  }

  // Footer transition WITH ROTATION (last 10%)
  masterTl.to(hexagonGroup.position, {
    x: 0, y: -2.8, z: 1.8,
    duration: 0.1,
    ease: "power2.inOut"
  }, 0.9);
  masterTl.to(hexagonGroup.scale, {
    x: 1.1, y: 1.1, z: 1.1,
    duration: 0.1,
    ease: "power2.inOut"
  }, 0.9);
  // Half rotation while going to footer (180°) - Total: 2 full rotations
  masterTl.to(hexagonGroup.rotation, {
    z: -Math.PI * 4,
    duration: 0.1,
    ease: "power2.inOut"
  }, 0.9);

  // 3. Individual card animations synced with hexagon rotation
  serviceSections.forEach((section, index) => {
    const card = section.querySelector('.content-box');

    // Create a timeline for each card's full lifecycle
    const cardTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
        end: "bottom 20%",
        scrub: 1
      }
    });

    // Enter animation (0% - 30% of scroll through section)
    cardTl.fromTo(card,
      {
        opacity: 0,
        x: -60,
        rotateY: -15
      },
      {
        opacity: 1,
        x: 0,
        rotateY: 0,
        duration: 0.3,
        ease: "power2.out"
      }
    );

    // Stay visible (30% - 70%)
    cardTl.to(card, {
      opacity: 1,
      x: 0,
      rotateY: 0,
      duration: 0.4
    });

    // Exit animation (70% - 100%)
    cardTl.to(card, {
      opacity: 0,
      x: 60,
      rotateY: 15,
      duration: 0.3,
      ease: "power2.in"
    });
  });

  // Background stability
  gsap.to(bgGroup.position, {
    scrollTrigger: {
      trigger: "#content",
      start: "top top",
      end: "bottom bottom",
      scrub: 2
    },
    y: 1,
    z: -0.5
  });
}

// --- Animation Loop ---
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const elapsedTime = clock.getElapsedTime();

  // Subtle background glow pulse
  bgGlowPoint.intensity = 20 + Math.sin(elapsedTime * 0.5) * 3;

  composer.render();
}
animate();

// --- Resize Handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
