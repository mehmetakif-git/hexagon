import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { TracingBeam } from './TracingBeam.js'
import { HexagonGlobe } from './Globe.js'
import { EventModal } from './EventModal.js'
import { HolographicCard } from './HolographicCard.js'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// ═══════════════════════════════════════════════════════════════════════════════
//  ALLYNC - Digital Experience Studio
//  www.allync.com.tr | www.allyncai.com
// ═══════════════════════════════════════════════════════════════════════════════

// Console Branding - Shows when developers open browser console
(function printConsoleBranding() {
  const styles = {
    logo: 'font-size: 14px; font-weight: bold; color: #FF6B00; text-shadow: 0 0 10px #FF6B00;',
    title: 'font-size: 20px; font-weight: bold; background: linear-gradient(90deg, #FF6B00, #FF8C00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; padding: 10px 0;',
    subtitle: 'font-size: 12px; color: #888; font-style: italic;',
    link: 'font-size: 11px; color: #FF6B00; text-decoration: underline;',
    separator: 'font-size: 10px; color: #333;'
  };

  console.log(`
%c    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║     █████╗ ██╗     ██╗  ██╗   ██╗███╗   ██╗ ██████╗       ║
    ║    ██╔══██╗██║     ██║  ╚██╗ ██╔╝████╗  ██║██╔════╝       ║
    ║    ███████║██║     ██║   ╚████╔╝ ██╔██╗ ██║██║            ║
    ║    ██╔══██║██║     ██║    ╚██╔╝  ██║╚██╗██║██║            ║
    ║    ██║  ██║███████╗███████╗██║   ██║ ╚████║╚██████╗       ║
    ║    ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝   ╚═╝  ╚═══╝ ╚═════╝       ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
`, styles.logo);

  console.log('%c✦ Crafted with passion by Allync', styles.title);
  console.log('%cDigital Experience Studio', styles.subtitle);
  console.log('%c─────────────────────────────────────', styles.separator);
  console.log('%c🌐 www.allync.com.tr', styles.link);
  console.log('%c🤖 www.allyncai.com', styles.link);
  console.log('%c─────────────────────────────────────', styles.separator);
  console.log('%c© 2025 Allync. All rights reserved.', styles.subtitle);
  console.log('');
})();

// Global TracingBeam instance
let tracingBeam = null;

// Force scroll to top on page load/refresh - multiple fallbacks
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);
document.documentElement.scrollTop = 0;

// Additional scroll-to-top on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
});

// And on window load (after everything is loaded)
window.addEventListener('load', () => {
  // Small delay to override any browser restoration attempts
  setTimeout(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, 0);
});

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

// Service text labels for each section (index 0 not used - hero has no text)
const serviceTexts = ['', 'ABOUT', 'EVENT', 'MEDIA', 'DIGITAL', 'CONSULT', 'CONTACT'];
let currentTextIndex = -1; // -1 means no text (hero state)

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

// Array to hold laser shader materials for animation
let currentTextMaterials = [];

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

// Create laser draw shader material for text
function createLaserDrawMaterial(text) {
  const diffuseMap = createDiffuseMap(text);
  const alphaMap = createAlphaMap(text);

  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: diffuseMap },
      alphaMap: { value: alphaMap },
      drawProgress: { value: 1.0 },  // 0 = invisible, 1 = fully drawn (start visible)
      laserColor: { value: new THREE.Color(0xFFAA33) },
      laserCoreColor: { value: new THREE.Color(0xFFFFFF) },
      laserWidth: { value: 0.12 },
      glowIntensity: { value: 3.0 },
      time: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform sampler2D alphaMap;
      uniform float drawProgress;
      uniform vec3 laserColor;
      uniform vec3 laserCoreColor;
      uniform float laserWidth;
      uniform float glowIntensity;
      uniform float time;
      varying vec2 vUv;

      // Noise function for sparks
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main() {
        vec4 texColor = texture2D(map, vUv);
        float textAlpha = texture2D(alphaMap, vUv).r;

        // Draw mask - areas where UV.x < drawProgress are visible
        float drawMask = 1.0 - smoothstep(drawProgress - 0.02, drawProgress, vUv.x);

        // Laser position
        float laserDist = abs(vUv.x - drawProgress);
        float laserCore = smoothstep(laserWidth * 0.2, 0.0, laserDist);
        float laserGlow = smoothstep(laserWidth, 0.0, laserDist);
        float laserOuterGlow = smoothstep(laserWidth * 2.0, 0.0, laserDist) * 0.3;

        // Laser only on text and during drawing (not at 0 or 1)
        float laserMask = textAlpha * step(0.02, drawProgress) * step(drawProgress, 0.98);

        // Flicker effect
        float flicker = 0.85 + 0.15 * sin(time * 40.0 + vUv.x * 80.0);

        // Spark particles near laser
        float sparkNoise = random(vUv + vec2(time * 10.0, 0.0));
        float sparkMask = step(0.92, sparkNoise) * laserGlow * laserMask;
        vec3 sparkColor = laserCoreColor * sparkMask * 2.0;

        // Final colors
        vec3 textFinal = texColor.rgb * drawMask * textAlpha;
        vec3 laserFinal = mix(laserColor, laserCoreColor, laserCore) * laserGlow * laserMask * glowIntensity * flicker;
        vec3 outerGlowFinal = laserColor * laserOuterGlow * laserMask * glowIntensity * 0.5;

        vec3 finalColor = textFinal + laserFinal + outerGlowFinal + sparkColor;
        float finalAlpha = max(textAlpha * drawMask, max(laserGlow * laserMask * 0.9, laserOuterGlow * laserMask));

        if (finalAlpha < 0.01) discard;
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

// Create embossed text on hexagon edges using laser shader
function createHexagonText(text, initialProgress = 1.0) {
  if (!hexagonGroup) {
    console.log('Cannot create text - hexagon not ready');
    return;
  }

  const meshGroup = hexagonGroup.userData.meshGroup;
  if (!meshGroup) {
    console.log('meshGroup not found');
    return;
  }

  console.log('Creating laser text on 6 edges:', text);

  // Remove existing text planes and dispose materials
  hexagonTextMeshes.forEach(mesh => {
    if (mesh && mesh.parent) {
      mesh.parent.remove(mesh);
      mesh.geometry.dispose();
      // Dispose shader material uniforms
      if (mesh.material.uniforms) {
        if (mesh.material.uniforms.map?.value) mesh.material.uniforms.map.value.dispose();
        if (mesh.material.uniforms.alphaMap?.value) mesh.material.uniforms.alphaMap.value.dispose();
      }
      mesh.material.dispose();
    }
  });
  hexagonTextMeshes = [];
  currentTextMaterials = [];

  // Hexagon edge dimensions - positioned on the ring
  const edgeWidth = 1.8;
  const edgeHeight = 0.35;
  const edgeRadius = 3.2;

  // Create geometry for text planes
  const planeGeo = new THREE.PlaneGeometry(edgeWidth, edgeHeight, 32, 8);

  // Create 6 text planes, one for each edge
  for (let i = 0; i < 6; i++) {
    // Angle for hexagon edge centers (30°, 90°, 150°, 210°, 270°, 330°)
    const angle = (Math.PI / 6) + (i * Math.PI / 3);

    // Create laser draw shader material
    const material = createLaserDrawMaterial(text);
    material.uniforms.drawProgress.value = initialProgress;
    currentTextMaterials.push(material);

    const textPlane = new THREE.Mesh(planeGeo, material);

    // Position on the edge - on top of the hexagon ring
    const x = Math.cos(angle) * edgeRadius;
    const y = Math.sin(angle) * edgeRadius;
    textPlane.position.set(x, y, 0.12);

    // Rotate to face outward and align with edge
    textPlane.rotation.z = angle - Math.PI / 2;

    meshGroup.add(textPlane);
    hexagonTextMeshes.push(textPlane);
  }

  hexagonTextMesh = hexagonTextMeshes[0];
  console.log('Created 6 laser text planes');
}

// Track if text animation is in progress to prevent conflicts
let isTextChanging = false;

// Function to change text WITHOUT animation (scroll trigger will handle animation)
function changeHexagonText(newIndex, startProgress = 0.0) {
  if (newIndex === currentTextIndex) return;
  if (!hexagonGroup) return;
  if (isTextChanging) return; // Prevent overlapping changes

  const newText = serviceTexts[newIndex];

  // If no valid text (empty or index 0), clear text instead
  if (!newText || newText === '') {
    clearHexagonText();
    return;
  }

  isTextChanging = true;
  const oldIndex = currentTextIndex;
  currentTextIndex = newIndex;

  // If no existing text, just create new one
  if (hexagonTextMeshes.length === 0) {
    createHexagonText(newText, startProgress);
    isTextChanging = false;
    return;
  }

  // If same section (shouldn't happen but safety check)
  if (oldIndex === newIndex) {
    isTextChanging = false;
    return;
  }

  // Remove old text immediately and create new one
  // The scroll trigger will handle the draw animation
  hexagonTextMeshes.forEach(mesh => {
    if (mesh && mesh.parent) {
      mesh.parent.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material.uniforms) {
        if (mesh.material.uniforms.map?.value) mesh.material.uniforms.map.value.dispose();
        if (mesh.material.uniforms.alphaMap?.value) mesh.material.uniforms.alphaMap.value.dispose();
      }
      mesh.material.dispose();
    }
  });
  hexagonTextMeshes = [];
  currentTextMaterials = [];

  // Create new text (starts at given progress, scroll will animate it)
  createHexagonText(newText, startProgress);
  isTextChanging = false;
}

// Helper function to set text draw progress (for scroll-based animation)
function setTextDrawProgress(progress) {
  currentTextMaterials.forEach(mat => {
    if (mat?.uniforms?.drawProgress) {
      mat.uniforms.drawProgress.value = progress;
    }
  });
}

// Clear all hexagon text (for hero section - no text)
function clearHexagonText() {
  // Immediately remove all meshes
  hexagonTextMeshes.forEach(mesh => {
    if (mesh && mesh.parent) {
      mesh.parent.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material.uniforms) {
        if (mesh.material.uniforms.map?.value) mesh.material.uniforms.map.value.dispose();
        if (mesh.material.uniforms.alphaMap?.value) mesh.material.uniforms.alphaMap.value.dispose();
      }
      mesh.material.dispose();
    }
  });
  hexagonTextMeshes = [];
  currentTextMaterials = [];
  currentTextIndex = -1; // Reset index so next section creates text
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

  // Text will be created on scroll, not at start
  // createHexagonText('HEXAGON');

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

  // Phase 4: TracingBeam reveal after text animation
  tl.call(() => {
    if (tracingBeam && tracingBeam.reveal) {
      tracingBeam.reveal();
    }
  }, null, 5.5);

  // Phase 5: Show scroll indicator after shuffle animation completes
  tl.call(() => {
    const scrollIndicator = document.getElementById('scroll-indicator');
    if (scrollIndicator) {
      scrollIndicator.classList.remove('hidden');
    }
  }, null, 6.0);
}

// ========================================
// SHUFFLE TEXT ANIMATION - Robust Implementation
// ========================================

const ShuffleText = {
  timeline: null,
  isAnimating: false,
  isRevealed: false,
  originalText: 'HEXAGON',
  chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&',

  // Character width cache (prevents measurement issues)
  charWidthCache: {},
  baseCharWidth: 0,
  baseCharHeight: 0,

  init() {
    const title = document.querySelector('.title');
    if (!title) return;

    // Store original text
    this.originalText = title.textContent.trim() || 'HEXAGON';
    title.dataset.origText = this.originalText;

    // Pre-calculate base character dimensions once
    this.measureBaseCharacter(title);

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());

    // Handle window focus/blur
    window.addEventListener('blur', () => this.handleBlur());
    window.addEventListener('focus', () => this.handleFocus());
  },

  measureBaseCharacter(title) {
    const titleStyle = window.getComputedStyle(title);
    const measure = document.createElement('span');
    measure.style.cssText = `
      visibility: hidden;
      position: absolute;
      white-space: pre;
      font-size: ${titleStyle.fontSize};
      font-family: ${titleStyle.fontFamily};
      font-weight: ${titleStyle.fontWeight};
      letter-spacing: ${titleStyle.letterSpacing};
    `;
    measure.textContent = 'W'; // Use widest character for base
    document.body.appendChild(measure);

    this.baseCharWidth = measure.offsetWidth || 60;
    this.baseCharHeight = measure.offsetHeight || 80;

    document.body.removeChild(measure);
  },

  cleanup() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    gsap.killTweensOf('.shuffle-char');
    gsap.killTweensOf('.shuffle-inner');
    gsap.killTweensOf('.subtitle');
    this.isAnimating = false;
  },

  forceComplete(showText = true) {
    this.cleanup();

    const title = document.querySelector('.title');
    if (!title) return;

    title.innerHTML = '';

    if (showText) {
      // Create shuffle-char elements showing final characters (same as reveal animation end state)
      title.style.cssText = `
        opacity: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0;
      `;

      // Create static character elements with same spacing as animation
      this.originalText.split('').forEach(char => {
        const isSpace = char === ' ';
        const charWidth = this.baseCharWidth;
        const charHeight = this.baseCharHeight;

        const container = document.createElement('span');
        container.className = 'shuffle-char';
        container.style.cssText = `
          display: inline-block;
          width: ${charWidth}px;
          height: ${charHeight}px;
          overflow: hidden;
          position: relative;
          margin-right: ${isSpace ? '1.5rem' : '0.8rem'};
          vertical-align: middle;
        `;

        const inner = document.createElement('span');
        inner.style.cssText = `
          display: inline-flex;
          justify-content: center;
          align-items: center;
          width: ${charWidth}px;
          height: ${charHeight}px;
        `;
        inner.textContent = char === ' ' ? '\u00A0' : char;

        container.appendChild(inner);
        title.appendChild(container);
      });

      this.isRevealed = true;

      const subtitle = document.querySelector('.subtitle');
      if (subtitle) {
        gsap.set(subtitle, { opacity: 1, y: 0 });
      }
    } else {
      title.style.cssText = 'opacity: 0; display: none;';
      this.isRevealed = false;

      const subtitle = document.querySelector('.subtitle');
      if (subtitle) {
        gsap.set(subtitle, { opacity: 0 });
      }
    }
  },

  handleVisibilityChange() {
    if (document.visibilityState === 'visible' && this.isAnimating) {
      // Animation was interrupted - force to expected state
      this.forceComplete(this.isRevealed);
    }
  },

  handleBlur() {
    if (this.isAnimating) {
      // Page lost focus during animation - complete it immediately
      this.forceComplete(this.isRevealed);
    }
  },

  handleFocus() {
    // Page regained focus - only intervene if animation was interrupted
    // If shuffle-chars exist and animation is NOT running, that's the normal completed state
    // Don't call forceComplete as it would change the spacing
  },

  createCharacterStrip(char, isReverse = false) {
    const isSpace = char === ' ';
    const rollCount = 8;

    // Use cached base width for consistency
    const charWidth = this.baseCharWidth;
    const charHeight = this.baseCharHeight;

    // Container
    const container = document.createElement('span');
    container.className = 'shuffle-char';
    container.style.cssText = `
      display: inline-block;
      width: ${charWidth}px;
      height: ${charHeight}px;
      overflow: hidden;
      position: relative;
      margin-right: ${isSpace ? '1.5rem' : '0.8rem'};
      vertical-align: middle;
    `;

    // Inner scrolling strip
    const inner = document.createElement('span');
    inner.className = 'shuffle-inner';
    inner.style.cssText = `
      display: flex;
      flex-direction: row;
      position: absolute;
      left: 0;
      top: 0;
      white-space: nowrap;
      will-change: transform;
    `;

    // Build character strip
    const strip = [];
    if (isReverse) {
      // For unreveal: actual char first, then random
      strip.push(char);
      for (let i = 0; i < rollCount; i++) {
        strip.push(this.chars.charAt(Math.floor(Math.random() * this.chars.length)));
      }
    } else {
      // For reveal: random chars first, then actual char
      for (let i = 0; i < rollCount; i++) {
        strip.push(this.chars.charAt(Math.floor(Math.random() * this.chars.length)));
      }
      strip.push(char);
    }

    strip.forEach(s => {
      const span = document.createElement('span');
      span.textContent = s === ' ' ? '\u00A0' : s;
      span.style.cssText = `
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: ${charWidth}px;
        height: ${charHeight}px;
        flex-shrink: 0;
      `;
      inner.appendChild(span);
    });

    container.appendChild(inner);

    return {
      container,
      inner,
      charWidth,
      totalWidth: charWidth * strip.length,
      rollCount
    };
  },

  reveal() {
    const title = document.querySelector('.title');
    if (!title) return;

    // Prevent overlapping
    if (this.isAnimating) {
      this.cleanup();
    }

    this.isAnimating = true;
    this.isRevealed = true;

    // Setup title
    title.innerHTML = '';
    title.style.cssText = `
      opacity: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0;
    `;

    const text = this.originalText;
    const charElements = [];

    // Create all character elements
    text.split('').forEach(char => {
      const { container, inner, charWidth, rollCount } = this.createCharacterStrip(char, false);
      title.appendChild(container);
      charElements.push({ inner, charWidth, rollCount });
    });

    // Create timeline
    this.timeline = gsap.timeline({
      onComplete: () => {
        this.isAnimating = false;
        // Keep shuffle-chars in place - they're showing final characters with correct spacing
        // Don't convert to plain text as it changes the visual spacing
      }
    });

    // Animate each character with stagger
    charElements.forEach((item, index) => {
      // Start at beginning (showing random chars)
      gsap.set(item.inner, { x: 0 });

      // Animate to show final character
      this.timeline.to(item.inner, {
        x: -item.charWidth * item.rollCount,
        duration: 0.6,
        ease: 'power2.out'
      }, index * 0.05);
    });

    // Subtitle fade in
    this.timeline.fromTo('.subtitle',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
      0.2
    );
  },

  unreveal() {
    const title = document.querySelector('.title');
    if (!title) return;

    // Prevent overlapping
    if (this.isAnimating) {
      this.cleanup();
    }

    this.isAnimating = true;
    this.isRevealed = false;

    // Setup title
    title.innerHTML = '';
    title.style.cssText = `
      opacity: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0;
    `;

    const text = this.originalText;
    const charElements = [];

    // Create all character elements (reverse order - actual char first)
    text.split('').forEach(char => {
      const { container, inner, charWidth, rollCount } = this.createCharacterStrip(char, true);
      title.appendChild(container);
      charElements.push({ inner, charWidth, rollCount });
    });

    // Create timeline
    this.timeline = gsap.timeline({
      onComplete: () => {
        this.isAnimating = false;
        title.style.opacity = '0';
      }
    });

    // Animate each character with stagger
    charElements.forEach((item, index) => {
      // Start showing the actual character
      gsap.set(item.inner, { x: 0 });

      // Animate to hide (scroll through random chars)
      this.timeline.to(item.inner, {
        x: -item.charWidth * item.rollCount,
        duration: 0.5,
        ease: 'power2.in'
      }, index * 0.04);
    });

    // Subtitle fade out
    this.timeline.to('.subtitle', {
      opacity: 0,
      y: -15,
      duration: 0.4,
      ease: 'power2.in'
    }, 0);
  }
};

// Legacy function wrappers for compatibility
function revealText() {
  ShuffleText.reveal();
}

function unrevealText() {
  ShuffleText.unreveal();
}

function forceTextComplete() {
  ShuffleText.forceComplete(true);
}

function cleanupShuffleAnimation() {
  ShuffleText.cleanup();
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ShuffleText.init());
} else {
  ShuffleText.init();
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

  // 3D Text - NO text in hero, only in service sections
  // Track which section's text is currently showing
  let activeTextSection = -1;
  let lastScrollDirection = 1; // 1 = down, -1 = up

  // Track scroll direction
  let lastScrollY = 0;
  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    lastScrollDirection = currentScrollY > lastScrollY ? 1 : -1;
    lastScrollY = currentScrollY;
  });

  // Hero trigger - only clear text when fully back in hero
  ScrollTrigger.create({
    trigger: ".hero",
    start: "bottom 90%", // When hero bottom is at 90% of viewport (we're back at top)
    end: "bottom 50%",
    onEnterBack: () => {
      // Only clear if we're actually at the hero (not just passing through)
      if (activeTextSection === 1) {
        // First section's text - let it erase naturally, then clear
        // Don't clear immediately - the section trigger will handle erase
      }
    }
  });

  // Track if a reverse transition is in progress
  let reverseTransitionInProgress = false;

  // Each service section: unified trigger for text + laser animation
  serviceSections.forEach((section, index) => {
    const textIndex = index + 1; // serviceTexts index
    const isFirstSection = index === 0;
    const isLastSection = index === serviceSections.length - 1;

    ScrollTrigger.create({
      trigger: section,
      start: "top 90%",    // Start when section top hits 90% of viewport
      end: "top 10%",      // End when section top hits 10% of viewport
      scrub: 0.5,          // Smooth scrub
      onEnter: () => {
        // Scrolling DOWN - entering section from above
        if (activeTextSection !== textIndex && !reverseTransitionInProgress) {
          // Check if there's existing text to erase first
          if (currentTextMaterials.length > 0 && activeTextSection !== -1) {
            // Smooth erase of old text before creating new
            reverseTransitionInProgress = true;
            const currentProgress = currentTextMaterials[0]?.uniforms?.drawProgress?.value ?? 1;

            gsap.to({ progress: currentProgress }, {
              progress: 0,
              duration: 0.2,
              ease: "power2.in",
              onUpdate: function() {
                setTextDrawProgress(this.targets()[0].progress);
              },
              onComplete: () => {
                // Now create new text starting invisible
                changeHexagonText(textIndex, 0.0);
                activeTextSection = textIndex;
                reverseTransitionInProgress = false;
              }
            });
          } else {
            // No existing text, just create new
            changeHexagonText(textIndex, 0.0);
            activeTextSection = textIndex;
          }
        }
      },
      onLeave: () => {
        // Scrolling DOWN - leaving section going to next
        // Keep text fully drawn, next section will handle transition
        setTextDrawProgress(1);
      },
      onEnterBack: () => {
        // Scrolling UP - entering section from below
        if (activeTextSection !== textIndex && !reverseTransitionInProgress) {
          if (activeTextSection > textIndex && currentTextMaterials.length > 0) {
            // Coming from a LATER section - smooth erase transition first
            reverseTransitionInProgress = true;
            const currentProgress = currentTextMaterials[0]?.uniforms?.drawProgress?.value ?? 1;

            // Quick erase of current text with laser effect
            gsap.to({ progress: currentProgress }, {
              progress: 0,
              duration: 0.25,
              ease: "power2.in",
              onUpdate: function() {
                setTextDrawProgress(this.targets()[0].progress);
              },
              onComplete: () => {
                // Now create new section's text at full visibility
                changeHexagonText(textIndex, 1.0);
                activeTextSection = textIndex;
                reverseTransitionInProgress = false;
              }
            });
          } else {
            // Normal case - just create text
            changeHexagonText(textIndex, 1.0);
            activeTextSection = textIndex;
          }
        }
      },
      onLeaveBack: () => {
        // Scrolling UP - leaving section going to previous
        // Text should be fully erased by now via scrub
        if (!reverseTransitionInProgress) {
          setTextDrawProgress(0);
        }

        // If leaving first section going to hero, clear text after erase
        if (isFirstSection) {
          setTimeout(() => {
            if (activeTextSection === 1 && lastScrollDirection === -1 && !reverseTransitionInProgress) {
              // Smooth erase before clearing
              const currentProgress = currentTextMaterials[0]?.uniforms?.drawProgress?.value ?? 0;
              if (currentProgress > 0.05) {
                gsap.to({ progress: currentProgress }, {
                  progress: 0,
                  duration: 0.2,
                  onUpdate: function() {
                    setTextDrawProgress(this.targets()[0].progress);
                  },
                  onComplete: () => {
                    clearHexagonText();
                    activeTextSection = -1;
                  }
                });
              } else {
                clearHexagonText();
                activeTextSection = -1;
              }
            }
          }, 100);
        }
      },
      onUpdate: (self) => {
        // Only update progress if this section's text is active and no transition running
        if (activeTextSection === textIndex && currentTextMaterials.length > 0 && !reverseTransitionInProgress) {
          setTextDrawProgress(self.progress);
        }
      }
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
    x: 0, y: -1.5, z: 2,
    duration: 0.1,
    ease: "power2.inOut"
  }, 0.9);
  masterTl.to(hexagonGroup.scale, {
    x: 1.3, y: 1.3, z: 1.3,
    duration: 0.1,
    ease: "power2.inOut"
  }, 0.9);
  // Complete 2 full rotations at the end
  masterTl.to(hexagonGroup.rotation, {
    z: -Math.PI * 4,
    duration: 0.1,
    ease: "power2.inOut"
  }, 0.9);

  // 3. Individual card animations synced with hexagon rotation
  // Skip flip-section cards (About Us index 0, Event index 1) - they have custom flip animation
  serviceSections.forEach((section, index) => {
    // Skip sections that use flip card system
    if (section.classList.contains('flip-section')) return;

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
  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Subtle background glow pulse
  bgGlowPoint.intensity = 20 + Math.sin(elapsedTime * 0.5) * 3;

  // Update laser shader time uniform for flicker/spark effects
  currentTextMaterials.forEach(mat => {
    if (mat?.uniforms?.time) {
      mat.uniforms.time.value = elapsedTime;
    }
  });

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

// --- 3D FLIP CARD SCROLL SYSTEM ---
// Two-phase animation: Card enters from bottom, then pages flip

function setupFlipCards() {
  const flipSections = document.querySelectorAll('.flip-section');
  const blurOverlay = document.getElementById('flip-blur-overlay');

  flipSections.forEach(section => {
    const container = section.querySelector('.flip-card-container');
    const flipCard = section.querySelector('.flip-card');
    const pages = section.querySelectorAll('.flip-page');
    const dots = section.querySelectorAll('.progress-dot');
    const totalPages = pages.length;

    if (totalPages === 0 || !container || !flipCard) return;

    // İlk sayfayı aktif yap
    if (pages[0]) pages[0].classList.add('active');
    if (dots[0]) dots[0].classList.add('active');

    // Başlangıç durumu - kart aşağıda
    gsap.set(flipCard, {
      y: 400,
      rotateX: 25,
      scale: 0.9,
      transformOrigin: "center bottom"
    });

    let cardArrived = false;

    // Sayfayı değiştiren fonksiyon
    function setPage(pageIndex) {
      pages.forEach((page, i) => {
        page.classList.remove('active', 'prev', 'next');
        if (i === pageIndex) {
          page.classList.add('active');
        } else if (i < pageIndex) {
          page.classList.add('prev');
        } else {
          page.classList.add('next');
        }
      });

      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === pageIndex);
      });
    }

    // PHASE 1: Kart yukarı gelir (0% - 20% scroll)
    // PHASE 2: Sayfalar değişir (20% - 100% scroll)

    // ScrollTrigger'ı değişkene ata ki dot click'te kullanabilelim
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top 95%",
      end: "bottom bottom",
      scrub: 0.5,
      onEnter: () => {
        container.classList.remove('exiting');
        flipCard.classList.remove('page-transitions');
        container.classList.add('visible');
        if (blurOverlay) blurOverlay.classList.add('visible');
      },
      onLeave: () => {
        container.classList.add('exiting');
        flipCard.classList.remove('page-transitions');
        if (blurOverlay) blurOverlay.classList.remove('visible');
        setTimeout(() => {
          container.classList.remove('visible', 'exiting');
          cardArrived = false;
        }, 500);
      },
      onLeaveBack: () => {
        container.classList.add('exiting');
        flipCard.classList.remove('page-transitions');
        if (blurOverlay) blurOverlay.classList.remove('visible');
        setTimeout(() => {
          container.classList.remove('visible', 'exiting');
          cardArrived = false;
          gsap.set(flipCard, { y: 400, rotateX: 25, scale: 0.9 });
        }, 500);
      },
      onEnterBack: () => {
        container.classList.remove('exiting');
        flipCard.classList.remove('page-transitions');
        container.classList.add('visible');
        if (blurOverlay) blurOverlay.classList.add('visible');
      },
      onUpdate: (self) => {
        const progress = self.progress;

        // PHASE 1: 0 - 0.2 → Kart yukarı gelir
        if (progress <= 0.2) {
          const phase1Progress = progress / 0.2;
          const easedProgress = gsap.parseEase("power2.out")(phase1Progress);
          const currentY = 400 - (easedProgress * 400);
          const currentRotateX = 25 - (easedProgress * 25);
          const currentScale = 0.9 + (easedProgress * 0.1);

          gsap.set(flipCard, {
            y: currentY,
            rotateX: currentRotateX,
            scale: currentScale
          });

          cardArrived = false;
          setPage(0);
        }
        // PHASE 2: 0.2 - 1.0 → Kart sahnede, scroll ile sayfa değişir
        else {
          if (!cardArrived) {
            cardArrived = true;
            gsap.set(flipCard, { y: 0, rotateX: 0, scale: 1 });
            setTimeout(() => {
              flipCard.classList.add('page-transitions');
            }, 100);
          }

          const phase2Progress = (progress - 0.2) / 0.8;
          const pageIndex = Math.min(
            totalPages - 1,
            Math.floor(phase2Progress * totalPages)
          );
          setPage(pageIndex);
        }
      }
    });

    // Dot'lara tıklama - ScrollTrigger'ın gerçek start/end değerlerini kullan
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        // Sayfa i için hedef progress: aralığın ortası
        const phase2Progress = (i + 0.5) / totalPages;
        const targetProgress = 0.2 + (phase2Progress * 0.8);

        // ScrollTrigger'ın start ve end değerlerini kullanarak gerçek scroll pozisyonunu hesapla
        const scrollStart = trigger.start;
        const scrollEnd = trigger.end;
        const scrollTarget = scrollStart + (scrollEnd - scrollStart) * targetProgress;

        gsap.to(window, {
          scrollTo: { y: scrollTarget, autoKill: false },
          duration: 0.6,
          ease: "power2.inOut"
        });
      });
    });
  });
}

// Initialize flip cards and tracing beam when DOM is ready
function initializeUI() {
  setupFlipCards();

  // Initialize TracingBeam after a short delay to ensure layout is ready
  setTimeout(() => {
    tracingBeam = new TracingBeam();
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}

// ========================================
// LOGO MARQUEE SYSTEM
// ========================================

class LogoMarquee {
  constructor(container, options = {}) {
    this.container = container;
    this.track = container.querySelector('.marquee-track');

    // Settings
    this.speed = options.speed || 80;
    this.direction = options.direction || 'left';
    this.pauseOnHover = options.pauseOnHover ?? true;
    this.hoverSpeed = options.hoverSpeed ?? 0;
    this.logos = options.logos || [];

    // State
    this.offset = 0;
    this.velocity = this.speed;
    this.targetVelocity = this.speed;
    this.isHovered = false;
    this.seqWidth = 0;
    this.rafId = null;
    this.lastTimestamp = null;

    // Smooth easing factor
    this.smoothTau = 0.25;

    this.init();
  }

  init() {
    this.renderLogos();
    this.setupEvents();
    requestAnimationFrame(() => {
      this.calculateDimensions();
      this.startAnimation();
    });
  }

  renderLogos() {
    if (!this.track || this.logos.length === 0) return;

    const list = this.createLogoList();
    this.track.innerHTML = '';
    this.track.appendChild(list);
  }

  createLogoList(isClone = false) {
    const ul = document.createElement('ul');
    ul.className = 'marquee-list';
    if (isClone) ul.setAttribute('aria-hidden', 'true');

    this.logos.forEach((logo) => {
      const li = document.createElement('li');
      li.className = 'marquee-item';

      let content;

      if (logo.src) {
        const img = document.createElement('img');
        img.src = logo.src;
        img.alt = logo.alt || '';
        img.loading = 'lazy';
        img.draggable = false;
        content = img;
      } else if (logo.text) {
        const span = document.createElement('span');
        span.className = 'logo-text';
        span.textContent = logo.text;
        content = span;
      }

      if (logo.href && content) {
        const link = document.createElement('a');
        link.className = 'marquee-link';
        link.href = logo.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', logo.alt || logo.text || 'Partner link');
        link.appendChild(content);
        li.appendChild(link);
      } else if (content) {
        li.appendChild(content);
      }

      ul.appendChild(li);
    });

    return ul;
  }

  calculateDimensions() {
    const firstList = this.track.querySelector('.marquee-list');
    if (!firstList) return;

    this.seqWidth = firstList.offsetWidth;

    const containerWidth = this.container.offsetWidth;
    const copiesNeeded = Math.ceil(containerWidth / this.seqWidth) + 2;

    const lists = this.track.querySelectorAll('.marquee-list');
    lists.forEach((list, i) => {
      if (i > 0) list.remove();
    });

    for (let i = 1; i < copiesNeeded; i++) {
      const clone = this.createLogoList(true);
      this.track.appendChild(clone);
    }
  }

  setupEvents() {
    this.track.addEventListener('mouseenter', () => {
      this.isHovered = true;
      this.targetVelocity = this.hoverSpeed;
    });

    this.track.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.targetVelocity = this.speed;
    });

    window.addEventListener('resize', () => {
      this.calculateDimensions();
    });

    const images = this.track.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', () => {
        this.calculateDimensions();
      });
    });
  }

  startAnimation() {
    const animate = (timestamp) => {
      if (this.lastTimestamp === null) {
        this.lastTimestamp = timestamp;
      }

      const deltaTime = Math.max(0, timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      const easingFactor = 1 - Math.exp(-deltaTime / this.smoothTau);
      this.velocity += (this.targetVelocity - this.velocity) * easingFactor;

      if (this.seqWidth > 0) {
        const dirMultiplier = this.direction === 'left' ? 1 : -1;
        this.offset += this.velocity * deltaTime * dirMultiplier;
        this.offset = ((this.offset % this.seqWidth) + this.seqWidth) % this.seqWidth;
        this.track.style.transform = `translate3d(${-this.offset}px, 0, 0)`;
      }

      this.rafId = requestAnimationFrame(animate);
    };

    this.rafId = requestAnimationFrame(animate);
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

// Initialize Logo Marquee
function initLogoMarquee() {
  const marqueeContainer = document.getElementById('logo-marquee');
  if (!marqueeContainer) return;

  // Logo görselleri - public/assets/logos/ klasörüne koy
  // Desteklenen formatlar: PNG, SVG, JPG, WEBP
  // Önerilen boyut: yükseklik 80-120px, şeffaf arka plan (PNG/SVG)
  const logos = [
    { src: '/assets/logos/katara.webp', alt: 'Katara' },
    { src: '/assets/logos/workinton.webp', alt: 'Workinton' },
    { src: '/assets/logos/qatar-university.webp', alt: 'Qatar University' },
    { src: '/assets/logos/qatar.webp', alt: 'Qatar' },
    { src: '/assets/logos/bmc.webp', alt: 'BMC' },
    { src: '/assets/logos/development-by-udc.webp', alt: 'Development by UDC' },
    { src: '/assets/logos/qnb-finansbank.webp', alt: 'QNB Finansbank' },
  ];

  new LogoMarquee(marqueeContainer, {
    logos: logos,
    speed: 50,
    direction: 'left',
    pauseOnHover: true,
    hoverSpeed: 0
  });
}

// Initialize marquee when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogoMarquee);
} else {
  initLogoMarquee();
}

// ========================================
// CONTACT SECTION WITH 3D GLOBE
// ========================================

let hexagonGlobe = null;
let globeInitialized = false;

function initContactSection() {
  const contactSection = document.getElementById('contact');
  const globeContainer = document.getElementById('globe-container');
  const contactForm = document.getElementById('contact-form');

  if (!contactSection) return;

  // Initialize globe when contact section becomes visible
  function initGlobeIfNeeded() {
    if (!globeInitialized && globeContainer && globeContainer.offsetWidth > 0) {
      console.log('🌐 Initializing globe...');
      hexagonGlobe = new HexagonGlobe(globeContainer);
      globeInitialized = true;
    }
  }

  // Use IntersectionObserver to detect when contact section is visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Small delay to ensure container has dimensions
        setTimeout(initGlobeIfNeeded, 200);
      }
    });
  }, { threshold: 0.1 });

  observer.observe(contactSection);

  // Also try to init when flip-card becomes visible
  const flipCardContainer = contactSection.querySelector('.flip-card-container');
  if (flipCardContainer) {
    const containerObserver = new MutationObserver(() => {
      if (flipCardContainer.classList.contains('visible')) {
        setTimeout(initGlobeIfNeeded, 200);
      }
    });
    containerObserver.observe(flipCardContainer, { attributes: true, attributeFilter: ['class'] });
  }

  // Form submit handler
  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());

    console.log('Form submitted:', data);

    // Show success feedback
    const submitBtn = contactForm.querySelector('.form-submit');
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML = `
      <span>Message Sent!</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
    `;
    submitBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';

    // Reset after 2 seconds
    setTimeout(() => {
      submitBtn.innerHTML = originalText;
      submitBtn.style.background = '';
      contactForm.reset();
    }, 2000);
  });

  // Location click - rotate globe to exact coordinates
  const locations = contactSection.querySelectorAll('.globe-locations .location');

  // City coordinates (lat, lng)
  const cityCoords = {
    doha: { lat: 25.3, lng: 51.5 },
    london: { lat: 51.5, lng: -0.1 },
    istanbul: { lat: 41.0, lng: 29.0 },
    dubai: { lat: 25.2, lng: 55.3 }
  };

  locations.forEach(loc => {
    loc.addEventListener('click', () => {
      console.log('🔘 Location clicked:', loc.dataset.city);

      // Remove active from all
      locations.forEach(l => l.classList.remove('active'));
      // Add active to clicked
      loc.classList.add('active');

      // Rotate globe to exact location
      const city = loc.dataset.city;
      const coords = cityCoords[city];

      if (hexagonGlobe && coords) {
        hexagonGlobe.rotateToCity(coords.lat, coords.lng);
      }
    });
  });
}

// Initialize contact section when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContactSection);
} else {
  initContactSection();
}

// ========================================
// EVENT MODAL WITH 3D CAROUSEL
// ========================================

let eventModal = null;

function initEventModal() {
  eventModal = new EventModal();
}

// Initialize event modal when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventModal);
} else {
  initEventModal();
}

// ========================================
// HOLOGRAPHIC PROFILE CARD
// ========================================

let holographicCard = null;

function initHolographicCard() {
  holographicCard = new HolographicCard();
}

// Initialize holographic card when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHolographicCard);
} else {
  initHolographicCard();
}

// ========================================
// SCROLL TO EXPLORE INDICATOR
// ========================================

function initScrollIndicator() {
  const scrollIndicator = document.getElementById('scroll-indicator');
  if (!scrollIndicator) return;

  let scrollTimeout = null;
  let isInForbiddenZone = false; // Footer or Contact section
  const IDLE_DELAY = 3000; // 3 seconds of no scrolling

  // Function to show indicator if not in forbidden zone
  function showIndicator() {
    if (!isInForbiddenZone) {
      scrollIndicator.classList.remove('hidden');
    }
  }

  // Function to hide and start idle timer
  function hideAndStartTimer() {
    scrollIndicator.classList.add('hidden');

    // Clear existing timeout
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    // Start new timeout to show indicator after idle period
    scrollTimeout = setTimeout(() => {
      showIndicator();
    }, IDLE_DELAY);
  }

  // Listen for scroll events - works on ALL sections
  window.addEventListener('scroll', () => {
    if (!isInForbiddenZone) {
      hideAndStartTimer();
    }
  }, { passive: true });

  // Hide in Contact section (section 6)
  ScrollTrigger.create({
    trigger: '#contact',
    start: 'top 80%',
    end: 'bottom top',
    onEnter: () => {
      isInForbiddenZone = true;
      scrollIndicator.classList.add('hidden');
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
        scrollTimeout = null;
      }
    },
    onLeaveBack: () => {
      isInForbiddenZone = false;
      hideAndStartTimer();
    }
  });

  // Hide in Footer section
  ScrollTrigger.create({
    trigger: '#footer',
    start: 'top bottom',
    onEnter: () => {
      isInForbiddenZone = true;
      scrollIndicator.classList.add('hidden');
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
        scrollTimeout = null;
      }
    },
    onLeaveBack: () => {
      // Check if we're back before contact section
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        const contactTop = contactSection.getBoundingClientRect().top;
        if (contactTop > window.innerHeight * 0.8) {
          isInForbiddenZone = false;
          hideAndStartTimer();
        }
      } else {
        isInForbiddenZone = false;
        hideAndStartTimer();
      }
    }
  });
}

// Initialize scroll indicator when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollIndicator);
} else {
  initScrollIndicator();
}

// ========================================
// COUNT-UP ANIMATION - Spring Physics
// ========================================

class SpringCountUp {
  constructor(element, options = {}) {
    this.element = element;
    this.from = options.from ?? 0;
    this.to = parseInt(element.dataset.target, 10) || 100;
    this.suffix = element.dataset.suffix || '';
    this.separator = options.separator ?? ',';
    this.duration = options.duration ?? 2;
    this.delay = options.delay ?? 0;

    // Spring physics parameters
    this.damping = 20 + 40 * (1 / this.duration);
    this.stiffness = 100 * (1 / this.duration);

    // State
    this.currentValue = this.from;
    this.velocity = 0;
    this.targetValue = this.from;
    this.isAnimating = false;
    this.hasStarted = false;
    this.rafId = null;
    this.lastTime = null;

    // Set initial value
    this.updateDisplay(this.from);
  }

  // Format number with separator
  formatValue(value) {
    const rounded = Math.round(value);
    const formatted = rounded.toLocaleString('en-US');
    return (this.separator ? formatted.replace(/,/g, this.separator) : rounded.toString()) + this.suffix;
  }

  // Update DOM
  updateDisplay(value) {
    const formatted = this.formatValue(value);
    this.element.textContent = formatted;
    // Update data attribute for CSS ::before pseudo-element
    this.element.setAttribute('data-value', formatted);
  }

  // Spring physics update
  springStep(deltaTime) {
    // Spring force: F = -k * x (where x is displacement from target)
    const displacement = this.currentValue - this.targetValue;
    const springForce = -this.stiffness * displacement;

    // Damping force: F = -c * v
    const dampingForce = -this.damping * this.velocity;

    // Total acceleration (F = ma, assuming m = 1)
    const acceleration = springForce + dampingForce;

    // Update velocity and position
    this.velocity += acceleration * deltaTime;
    this.currentValue += this.velocity * deltaTime;

    // Check if settled (velocity and displacement both very small)
    const isSettled = Math.abs(this.velocity) < 0.01 && Math.abs(displacement) < 0.5;

    return isSettled;
  }

  // Animation loop
  animate(timestamp) {
    if (!this.lastTime) {
      this.lastTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap delta to prevent jumps
    this.lastTime = timestamp;

    const isSettled = this.springStep(deltaTime);
    this.updateDisplay(this.currentValue);

    if (isSettled) {
      // Snap to final value
      this.currentValue = this.targetValue;
      this.updateDisplay(this.currentValue);
      this.isAnimating = false;
      this.rafId = null;
    } else {
      this.rafId = requestAnimationFrame((t) => this.animate(t));
    }
  }

  // Start animation
  start() {
    if (this.hasStarted) return;
    this.hasStarted = true;

    setTimeout(() => {
      this.targetValue = this.to;
      this.isAnimating = true;
      this.lastTime = null;
      this.rafId = requestAnimationFrame((t) => this.animate(t));
    }, this.delay * 1000);
  }

  // Cleanup
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

function initCountUpAnimation() {
  const countElements = document.querySelectorAll('.count-up');
  if (countElements.length === 0) return;

  const instances = new Map();

  // Create SpringCountUp instance for each element
  countElements.forEach((el, index) => {
    const instance = new SpringCountUp(el, {
      duration: 2,
      delay: index * 0.15, // Stagger delay
      separator: ','
    });
    instances.set(el, instance);
  });

  // Use Intersection Observer to trigger animation
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const instance = instances.get(entry.target);
        if (instance) {
          instance.start();
        }
        // Unobserve after triggering (once: true behavior)
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.3,
    rootMargin: '0px'
  });

  // Observe all elements
  countElements.forEach(el => observer.observe(el));
}

// Initialize count-up animation when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCountUpAnimation);
} else {
  initCountUpAnimation();
}

// ========================================
// EVENT LIST HOVER PREVIEW - Spring Physics
// ========================================

class EventHoverPreview {
  constructor() {
    this.preview = document.getElementById('category-preview');
    this.previewImage = this.preview?.querySelector('.preview-image');
    if (!this.preview || !this.previewImage) return;

    // Spring physics state
    this.currentX = 0;
    this.currentY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.velocityX = 0;
    this.velocityY = 0;

    // Spring parameters
    this.stiffness = 150;
    this.damping = 20;

    // State
    this.isVisible = false;
    this.rafId = null;
    this.lastTime = null;
    this.activeItem = null;

    // Event images mapping (placeholder paths - replace with actual images)
    // Format: 'event-name-slug': '/assets/previews/events/filename.webp'
    this.eventImages = {
      // Live & Sports Events
      'padel-world-cup-closing-ceremonies': '/assets/previews/events/padel-world-cup.webp',
      'hayatna-activation-fifa-world-cup': '/assets/previews/events/hayatna-fifa.webp',
      'fifa-world-cup-pre-match-ceremonies': '/assets/previews/events/fifa-pre-match.webp',
      'arab-cup-opening-ceremonies': '/assets/previews/events/arab-cup.webp',
      // Public Events
      'psg-legends-at-the-pearl-qatar': '/assets/previews/events/psg-legends.webp',
      'lusail-circuit-sports-club-speed-fest': '/assets/previews/events/speed-fest.webp',
      'formula-1-concerts-stage-pyrotechnics': '/assets/previews/events/f1-concerts.webp',
      'qatar-national-sports-day': '/assets/previews/events/sports-day.webp',
      // Exhibitions
      'treve-tower-exhibition-stand': '/assets/previews/events/treve-tower.webp',
      'kowate-pavilion-at-project-qatar': '/assets/previews/events/kowate-pavilion.webp',
      'bmc-pavilion-at-dimdex-qatar': '/assets/previews/events/bmc-pavilion.webp',
      'ministry-of-culture-pavilion': '/assets/previews/events/ministry-culture.webp',
      // Corporate Events
      'porsche-cayenne-launch-event': '/assets/previews/events/porsche-cayenne.webp',
      'qatar-university-alumni-gathering': '/assets/previews/events/qatar-uni.webp',
      'executive-conferences': '/assets/previews/events/executive-conf.webp',
      'product-launch-ceremonies': '/assets/previews/events/product-launch.webp',
      // Festivals
      'darb-al-saai-activation': '/assets/previews/events/darb-al-saai.webp',
      'medina-centrale-festival': '/assets/previews/events/medina-centrale.webp',
      'eid-festivals-at-katara': '/assets/previews/events/eid-katara.webp',
      'qatar-international-food-festival': '/assets/previews/events/food-festival.webp'
    };

    this.init();
  }

  // Convert event name to slug
  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }

  init() {
    const eventItems = document.querySelectorAll('.event-list li');

    eventItems.forEach(item => {
      // Add data attribute for image lookup
      const eventText = item.textContent.replace('✓', '').trim();
      const slug = this.slugify(eventText);
      item.dataset.event = slug;

      item.addEventListener('mouseenter', (e) => this.handleMouseEnter(e, item));
      item.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      item.addEventListener('mouseleave', () => this.handleMouseLeave());
    });
  }

  handleMouseEnter(e, item) {
    const eventSlug = item.dataset.event;
    const imageSrc = this.eventImages[eventSlug];

    if (imageSrc) {
      this.previewImage.src = imageSrc;
      this.previewImage.classList.remove('placeholder');

      // Handle image load error - show placeholder pattern
      this.previewImage.onerror = () => {
        this.previewImage.src = '';
        this.previewImage.classList.add('placeholder');
      };
    } else {
      this.previewImage.src = '';
      this.previewImage.classList.add('placeholder');
    }

    this.activeItem = item;
    this.isVisible = true;

    // Initialize position at mouse
    const rect = item.getBoundingClientRect();
    this.targetX = e.clientX;
    this.targetY = rect.top - 200; // Position above the item
    this.currentX = this.targetX;
    this.currentY = this.targetY + 20; // Start slightly below for animation

    this.preview.classList.add('visible');
    this.startAnimation();
  }

  handleMouseMove(e) {
    if (!this.isVisible || !this.activeItem) return;

    const rect = this.activeItem.getBoundingClientRect();
    const itemCenterX = rect.left + rect.width / 2;

    // Calculate offset from item center (subtle following effect)
    const offsetX = (e.clientX - itemCenterX) * 0.5;

    this.targetX = itemCenterX + offsetX;
    this.targetY = rect.top - 200;
  }

  handleMouseLeave() {
    this.isVisible = false;
    this.preview.classList.remove('visible');
    this.activeItem = null;
    
    // Stop animation after fade out
    setTimeout(() => {
      if (!this.isVisible && this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }, 200);
  }

  springStep(deltaTime) {
    // X axis spring
    const displacementX = this.currentX - this.targetX;
    const springForceX = -this.stiffness * displacementX;
    const dampingForceX = -this.damping * this.velocityX;
    const accelerationX = springForceX + dampingForceX;
    this.velocityX += accelerationX * deltaTime;
    this.currentX += this.velocityX * deltaTime;

    // Y axis spring
    const displacementY = this.currentY - this.targetY;
    const springForceY = -this.stiffness * displacementY;
    const dampingForceY = -this.damping * this.velocityY;
    const accelerationY = springForceY + dampingForceY;
    this.velocityY += accelerationY * deltaTime;
    this.currentY += this.velocityY * deltaTime;
  }

  updatePosition() {
    // Center the preview horizontally on the current position
    const previewWidth = this.preview.offsetWidth || 288;
    const x = this.currentX - previewWidth / 2;
    const y = this.currentY;
    
    this.preview.style.left = `${x}px`;
    this.preview.style.top = `${y}px`;
  }

  animate(timestamp) {
    if (!this.lastTime) {
      this.lastTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.springStep(deltaTime);
    this.updatePosition();

    if (this.isVisible) {
      this.rafId = requestAnimationFrame((t) => this.animate(t));
    }
  }

  startAnimation() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.lastTime = null;
    this.rafId = requestAnimationFrame((t) => this.animate(t));
  }
}

// Initialize event hover preview when DOM ready
function initEventHoverPreview() {
  new EventHoverPreview();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventHoverPreview);
} else {
  initEventHoverPreview();
}

// ========================================
// SECURITY PROTECTION SYSTEM
// ========================================
// © Allync - www.allync.com.tr | www.allyncai.com
// Unauthorized copying, modification, or distribution is prohibited.

(function SecurityProtection() {
  'use strict';

  const SECURITY_CONFIG = {
    disableRightClick: true,
    disableKeyboardShortcuts: true,
    disableTextSelection: true,
    disableDragDrop: true,
    disablePrint: true,
    detectDevTools: true,
    consoleWarning: true,
    antiDebug: true
  };

  // ═══════════════════════════════════════════════════════════════
  // 1. DISABLE RIGHT-CLICK CONTEXT MENU
  // ═══════════════════════════════════════════════════════════════
  if (SECURITY_CONFIG.disableRightClick) {
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, true);
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. DISABLE KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════════════
  if (SECURITY_CONFIG.disableKeyboardShortcuts) {
    document.addEventListener('keydown', function(e) {
      // F12 - Dev Tools
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I - Dev Tools
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+J - Console
      if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+C - Element Inspector
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U - View Source
      if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S - Save Page
      if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+P - Print
      if (e.ctrlKey && (e.key === 'P' || e.key === 'p' || e.keyCode === 80)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+A - Select All
      if (e.ctrlKey && (e.key === 'A' || e.key === 'a' || e.keyCode === 65)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+C - Copy (optional - can be annoying)
      if (e.ctrlKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67) && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, true);
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. DISABLE TEXT SELECTION
  // ═══════════════════════════════════════════════════════════════
  if (SECURITY_CONFIG.disableTextSelection) {
    document.addEventListener('selectstart', function(e) {
      e.preventDefault();
      return false;
    }, true);

    document.addEventListener('mousedown', function(e) {
      if (e.detail > 1) { // Double-click or more
        e.preventDefault();
        return false;
      }
    }, true);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. DISABLE DRAG AND DROP
  // ═══════════════════════════════════════════════════════════════
  if (SECURITY_CONFIG.disableDragDrop) {
    document.addEventListener('dragstart', function(e) {
      e.preventDefault();
      return false;
    }, true);

    document.addEventListener('drop', function(e) {
      e.preventDefault();
      return false;
    }, true);
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. DISABLE PRINT
  // ═══════════════════════════════════════════════════════════════
  if (SECURITY_CONFIG.disablePrint) {
    window.addEventListener('beforeprint', function(e) {
      e.preventDefault();
      document.body.style.display = 'none';
    });

    window.addEventListener('afterprint', function() {
      document.body.style.display = '';
    });

    // Override print function
    window.print = function() {
      console.warn('⚠️ Printing is disabled on this website.');
      return false;
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. DEV TOOLS DETECTION
  // ═══════════════════════════════════════════════════════════════
  if (SECURITY_CONFIG.detectDevTools) {
    let devToolsOpen = false;

    const detectDevTools = function() {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      if (widthThreshold || heightThreshold) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          console.clear();
          console.log('%c⚠️ WARNING', 'color: red; font-size: 40px; font-weight: bold; text-shadow: 2px 2px 0 #000;');
          console.log('%cThis website is protected by Allync Security System.', 'color: #FF8106; font-size: 16px;');
          console.log('%cUnauthorized access, copying, or reverse engineering is prohibited.', 'color: #ff4444; font-size: 14px;');
          console.log('%c© Allync - www.allync.com.tr', 'color: #888; font-size: 12px;');
        }
      } else {
        devToolsOpen = false;
      }
    };

    // Check periodically
    setInterval(detectDevTools, 1000);

    // Debugger detection using timing
    const detectDebugger = function() {
      const start = performance.now();
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        console.clear();
      }
    };

    // Run debugger detection occasionally
    if (SECURITY_CONFIG.antiDebug) {
      setInterval(detectDebugger, 5000);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. CONSOLE WARNING
  // ═══════════════════════════════════════════════════════════════
  if (SECURITY_CONFIG.consoleWarning) {
    // Initial warning
    setTimeout(function() {
      console.log('%c🛡️ PROTECTED CONTENT', 'color: #FF8106; font-size: 24px; font-weight: bold;');
      console.log('%c════════════════════════════════════════════════════════════════', 'color: #333;');
      console.log('%cThis website and its source code are protected by copyright law.', 'color: #ff6666; font-size: 14px;');
      console.log('%cUnauthorized copying, modification, or distribution is strictly prohibited.', 'color: #ff6666; font-size: 12px;');
      console.log('%c════════════════════════════════════════════════════════════════', 'color: #333;');
      console.log('%c© 2025 Allync. All Rights Reserved.', 'color: #888; font-size: 11px;');
      console.log('%cwww.allync.com.tr | www.allyncai.com', 'color: #FF8106; font-size: 11px;');
    }, 100);
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. IFRAME PROTECTION (Clickjacking Prevention)
  // ═══════════════════════════════════════════════════════════════
  if (window.self !== window.top) {
    // Site is in an iframe - break out or hide content
    try {
      window.top.location = window.self.location;
    } catch (e) {
      // Can't break out, hide content
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#FF8106;font-family:Arial;font-size:24px;">⚠️ This content cannot be displayed in an iframe.</div>';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. DISABLE IMAGE DOWNLOAD
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img');
    images.forEach(function(img) {
      img.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });
      img.setAttribute('draggable', 'false');
      img.style.pointerEvents = 'none';
    });

    // Re-apply to dynamically loaded images
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeName === 'IMG') {
            node.addEventListener('contextmenu', function(e) { e.preventDefault(); });
            node.setAttribute('draggable', 'false');
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('img').forEach(function(img) {
              img.addEventListener('contextmenu', function(e) { e.preventDefault(); });
              img.setAttribute('draggable', 'false');
            });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. SOURCE CODE OBFUSCATION MARKER
  // ═══════════════════════════════════════════════════════════════
  // This code is protected and minified in production.
  // Any attempt to reverse-engineer will result in legal action.
  Object.defineProperty(window, '__ALLYNC_PROTECTED__', {
    value: true,
    writable: false,
    configurable: false
  });

  Object.defineProperty(window, '__COPYRIGHT__', {
    value: '© 2025 Allync. All Rights Reserved. www.allync.com.tr',
    writable: false,
    configurable: false
  });

})();
