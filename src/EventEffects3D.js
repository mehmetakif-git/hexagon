// src/EventEffects3D.js
import * as THREE from 'three';
import gsap from 'gsap';

// Kategori efekt mapping
const CATEGORY_EFFECTS = {
  'live-sports': 'sports',
  'public': 'firework',
  'exhibitions': 'spotlight',
  'corporate': 'geometric',
  'festivals': 'festival'
};

export class EventEffects3D {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.effects = [];
    this.currentEffect = null;
    this.animationId = null;
    this.clock = new THREE.Clock();

    this.init();
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();

    // Camera - perspective for 3D effects
    const aspect = this.container.offsetWidth / this.container.offsetHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.camera.position.z = 10;

    // Renderer - transparent background
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // Canvas styling - overlay on carousel
    this.renderer.domElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    `;

    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xFF8106, 1, 20);
    pointLight.position.set(0, 0, 5);
    this.scene.add(pointLight);

    // Start render loop
    this.animate();

    // Resize handler
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  handleResize() {
    if (!this.container) return;

    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Kategori degistiginde efekt degistir
  setCategory(category) {
    const effectType = CATEGORY_EFFECTS[category] || 'default';

    // Mevcut efekti temizle
    this.clearEffects();

    // Yeni efekti olustur
    switch (effectType) {
      case 'sports':
        this.createSportsEffect();
        break;
      case 'firework':
        this.createFireworkEffect();
        break;
      case 'spotlight':
        this.createSpotlightEffect();
        break;
      case 'geometric':
        this.createGeometricEffect();
        break;
      case 'festival':
        this.createFestivalEffect();
        break;
      default:
        this.createDefaultEffect();
    }
  }

  clearEffects() {
    // Tum efekt objelerini kaldir
    this.effects.forEach(effect => {
      if (effect.mesh) {
        this.scene.remove(effect.mesh);
        effect.mesh.geometry?.dispose();
        if (Array.isArray(effect.mesh.material)) {
          effect.mesh.material.forEach(m => m.dispose());
        } else {
          effect.mesh.material?.dispose();
        }
      }
      if (effect.particles) {
        this.scene.remove(effect.particles);
        effect.particles.geometry?.dispose();
        effect.particles.material?.dispose();
      }
      if (effect.timeline) {
        effect.timeline.kill();
      }
    });
    this.effects = [];
  }

  // ========================================
  // SPORTS EFFECT - Futbol Topu + Kupa
  // ========================================
  createSportsEffect() {
    // Futbol topu - sol alt kose
    const ballGeometry = new THREE.IcosahedronGeometry(0.4, 2);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.8,
      flatShading: true
    });

    // Pentagon pattern icin vertex colors
    const colors = [];
    const positionAttribute = ballGeometry.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
      // Alternatif siyah-beyaz pattern
      const color = (Math.floor(i / 3) % 2 === 0)
        ? new THREE.Color(0xffffff)
        : new THREE.Color(0x222222);
      colors.push(color.r, color.g, color.b);
    }
    ballGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    ballMaterial.vertexColors = true;

    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(-5.5, -2.5, 0);
    this.scene.add(ball);

    // Ball animation
    const ballTl = gsap.timeline({ repeat: -1 });
    ballTl.to(ball.rotation, {
      x: Math.PI * 2,
      y: Math.PI,
      duration: 4,
      ease: 'none'
    });
    gsap.to(ball.position, {
      y: -2,
      duration: 1,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: -1
    });

    // Kupa - sag alt kose
    const trophyGroup = this.createTrophy();
    trophyGroup.position.set(5.5, -2.5, 0);
    trophyGroup.scale.set(0.5, 0.5, 0.5);
    this.scene.add(trophyGroup);

    // Trophy glow animation
    const trophyTl = gsap.timeline({ repeat: -1 });
    trophyTl.to(trophyGroup.rotation, {
      y: Math.PI * 2,
      duration: 8,
      ease: 'none'
    });

    this.effects.push(
      { mesh: ball, timeline: ballTl },
      { mesh: trophyGroup, timeline: trophyTl }
    );

    // Corner particles
    this.addCornerGlow(0xFF8106);
  }

  createTrophy() {
    const group = new THREE.Group();

    // Cup body - simplified using lathe
    const points = [];
    points.push(new THREE.Vector2(0.3, 0));
    points.push(new THREE.Vector2(0.5, 0.3));
    points.push(new THREE.Vector2(0.6, 0.8));
    points.push(new THREE.Vector2(0.5, 1.2));
    points.push(new THREE.Vector2(0.3, 1.4));
    points.push(new THREE.Vector2(0.15, 1.5));

    const cupGeometry = new THREE.LatheGeometry(points, 32);

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xFF8106,
      emissiveIntensity: 0.1
    });

    const cup = new THREE.Mesh(cupGeometry, goldMaterial);
    group.add(cup);

    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 32);
    const base = new THREE.Mesh(baseGeometry, goldMaterial);
    base.position.y = -0.15;
    group.add(base);

    // Handles (simplified)
    const handleGeometry = new THREE.TorusGeometry(0.25, 0.05, 8, 16, Math.PI);
    const leftHandle = new THREE.Mesh(handleGeometry, goldMaterial);
    leftHandle.position.set(-0.55, 0.9, 0);
    leftHandle.rotation.z = Math.PI / 2;
    leftHandle.rotation.y = Math.PI / 2;
    group.add(leftHandle);

    const rightHandle = leftHandle.clone();
    rightHandle.position.set(0.55, 0.9, 0);
    rightHandle.rotation.y = -Math.PI / 2;
    group.add(rightHandle);

    return group;
  }

  // ========================================
  // FIREWORK EFFECT - Particle Havai Fisek
  // ========================================
  createFireworkEffect() {
    // 4 kosede havai fisek
    const corners = [
      { x: -5, y: 3 },   // Sol ust
      { x: 5, y: 3 },    // Sag ust
      { x: -5, y: -3 },  // Sol alt
      { x: 5, y: -3 }    // Sag alt
    ];

    corners.forEach((corner, index) => {
      this.createFirework(corner.x, corner.y, index * 0.5);
    });
  }

  createFirework(x, y, delay = 0) {
    const particleCount = 80;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // Initialize particles at center
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 0;

      // Random explosion direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.02 + Math.random() * 0.03;

      velocities.push({
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.sin(phi) * Math.sin(theta) * speed,
        z: Math.cos(phi) * speed * 0.5
      });

      // Orange/gold colors
      const color = new THREE.Color();
      color.setHSL(0.08 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 3 + Math.random() * 5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    // Animation data
    const fireworkData = {
      particles,
      velocities,
      positions: geometry.attributes.position.array,
      material,
      startX: x,
      startY: y,
      time: delay,
      phase: 0 // 0: exploding, 1: reset
    };

    this.effects.push({
      particles,
      update: () => {
        fireworkData.time += 0.016;

        if (fireworkData.phase === 0) {
          // Exploding
          const progress = Math.min(fireworkData.time / 2, 1);
          material.opacity = 0.8 * (1 - progress);

          for (let i = 0; i < particleCount; i++) {
            fireworkData.positions[i * 3] += velocities[i].x * (1 - progress);
            fireworkData.positions[i * 3 + 1] += velocities[i].y * (1 - progress) - 0.001;
            fireworkData.positions[i * 3 + 2] += velocities[i].z * (1 - progress);
          }
          geometry.attributes.position.needsUpdate = true;

          if (progress >= 1) {
            fireworkData.phase = 1;
            fireworkData.time = 0;
          }
        } else {
          // Reset after delay
          if (fireworkData.time > 0.5) {
            for (let i = 0; i < particleCount; i++) {
              fireworkData.positions[i * 3] = fireworkData.startX;
              fireworkData.positions[i * 3 + 1] = fireworkData.startY;
              fireworkData.positions[i * 3 + 2] = 0;
            }
            geometry.attributes.position.needsUpdate = true;
            material.opacity = 0.8;
            fireworkData.phase = 0;
            fireworkData.time = 0;
          }
        }
      }
    });
  }

  // ========================================
  // SPOTLIGHT EFFECT - Isik Huzmeleri
  // ========================================
  createSpotlightEffect() {
    const spotlightCount = 4;

    for (let i = 0; i < spotlightCount; i++) {
      const angle = (i / spotlightCount) * Math.PI * 2;
      const x = Math.cos(angle) * 4;
      const baseY = -4;

      // Isik huzmesi - cone
      const coneGeometry = new THREE.ConeGeometry(0.3, 8, 16, 1, true);
      const coneMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF8106,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.set(x, baseY + 4, -2);
      cone.rotation.x = Math.PI;
      this.scene.add(cone);

      // Animate spotlight sweep
      const initialZ = (Math.random() - 0.5) * 0.5;
      const tl = gsap.timeline({ repeat: -1, yoyo: true });
      tl.to(cone.rotation, {
        z: Math.PI / 6,
        duration: 2 + Math.random(),
        ease: 'power1.inOut'
      });
      tl.to(cone.rotation, {
        z: -Math.PI / 6,
        duration: 2 + Math.random(),
        ease: 'power1.inOut'
      });

      // Intensity pulse
      gsap.to(coneMaterial, {
        opacity: 0.25,
        duration: 1.5 + Math.random(),
        ease: 'power1.inOut',
        yoyo: true,
        repeat: -1
      });

      this.effects.push({
        mesh: cone,
        timeline: tl
      });
    }

    // Add subtle corner glow
    this.addCornerGlow(0xFF8106, false);
  }

  // ========================================
  // GEOMETRIC EFFECT - Corporate Shapes
  // ========================================
  createGeometricEffect() {
    const shapeTypes = ['box', 'octahedron', 'tetrahedron', 'icosahedron'];

    for (let i = 0; i < 8; i++) {
      const type = shapeTypes[i % shapeTypes.length];
      let geometry;

      switch (type) {
        case 'box':
          geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
          break;
        case 'octahedron':
          geometry = new THREE.OctahedronGeometry(0.3);
          break;
        case 'tetrahedron':
          geometry = new THREE.TetrahedronGeometry(0.35);
          break;
        case 'icosahedron':
          geometry = new THREE.IcosahedronGeometry(0.25);
          break;
      }

      const material = new THREE.MeshStandardMaterial({
        color: 0xFF8106,
        metalness: 0.8,
        roughness: 0.2,
        transparent: true,
        opacity: 0.7,
        wireframe: Math.random() > 0.5
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Random position around edges
      const angle = (i / 8) * Math.PI * 2;
      const radius = 5 + Math.random();
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * 3,
        -1 + Math.random() * 2
      );

      this.scene.add(mesh);

      // Float animation
      const tl = gsap.timeline({ repeat: -1 });
      tl.to(mesh.rotation, {
        x: Math.PI * 2,
        y: Math.PI * 2,
        duration: 5 + Math.random() * 3,
        ease: 'none'
      });

      gsap.to(mesh.position, {
        y: mesh.position.y + 0.5,
        duration: 2 + Math.random(),
        ease: 'power1.inOut',
        yoyo: true,
        repeat: -1
      });

      this.effects.push({ mesh, timeline: tl });
    }
  }

  // ========================================
  // FESTIVAL EFFECT - Konfeti + Glow
  // ========================================
  createFestivalEffect() {
    // Konfeti particles
    const confettiCount = 150;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(confettiCount * 3);
    const colors = new Float32Array(confettiCount * 3);
    const velocities = [];

    const festivalColors = [
      new THREE.Color(0xFF8106), // Orange
      new THREE.Color(0xFFD700), // Gold
      new THREE.Color(0xFF4444), // Red
      new THREE.Color(0x44FF44), // Green
      new THREE.Color(0x4444FF), // Blue
      new THREE.Color(0xFF44FF), // Magenta
    ];

    for (let i = 0; i < confettiCount; i++) {
      // Spread across top
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = 5 + Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;

      const color = festivalColors[Math.floor(Math.random() * festivalColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: -0.02 - Math.random() * 0.02,
        swing: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    const confetti = new THREE.Points(geometry, material);
    this.scene.add(confetti);

    let time = 0;

    this.effects.push({
      particles: confetti,
      update: () => {
        time += 0.016;
        const posArray = geometry.attributes.position.array;

        for (let i = 0; i < confettiCount; i++) {
          // Falling
          posArray[i * 3 + 1] += velocities[i].y;
          // Swaying
          posArray[i * 3] += Math.sin(time * 2 + velocities[i].swing) * 0.01;

          // Reset if below view
          if (posArray[i * 3 + 1] < -4) {
            posArray[i * 3] = (Math.random() - 0.5) * 14;
            posArray[i * 3 + 1] = 5 + Math.random() * 2;
          }
        }
        geometry.attributes.position.needsUpdate = true;
      }
    });

    // Corner glow orbs with pulsing
    this.addCornerGlow(0xFF8106, true);
  }

  // ========================================
  // HELPER - Corner Glow Effects
  // ========================================
  addCornerGlow(color, pulsing = false) {
    const corners = [
      { x: -6, y: 3.5 },
      { x: 6, y: 3.5 },
      { x: -6, y: -3.5 },
      { x: 6, y: -3.5 }
    ];

    corners.forEach((corner, i) => {
      // Glow sprite
      const spriteMaterial = new THREE.SpriteMaterial({
        map: this.createGlowTexture(color),
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.5
      });

      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(corner.x, corner.y, 0);
      sprite.scale.set(2, 2, 1);
      this.scene.add(sprite);

      if (pulsing) {
        const tl = gsap.timeline({ repeat: -1, yoyo: true });
        tl.to(sprite.scale, {
          x: 2.5,
          y: 2.5,
          duration: 1 + i * 0.2,
          ease: 'power1.inOut'
        });
        tl.to(spriteMaterial, {
          opacity: 0.7,
          duration: 1 + i * 0.2,
          ease: 'power1.inOut'
        }, 0);

        this.effects.push({ mesh: sprite, timeline: tl });
      } else {
        this.effects.push({ mesh: sprite });
      }
    });
  }

  createGlowTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);

    const c = new THREE.Color(color);
    gradient.addColorStop(0, `rgba(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(c.b * 255)}, 1)`);
    gradient.addColorStop(0.3, `rgba(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(c.b * 255)}, 0.5)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // ========================================
  // DEFAULT EFFECT
  // ========================================
  createDefaultEffect() {
    this.addCornerGlow(0xFF8106, true);
  }

  // ========================================
  // ANIMATION LOOP
  // ========================================
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update all effects
    this.effects.forEach(effect => {
      if (effect.update) {
        effect.update();
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  // ========================================
  // CLEANUP
  // ========================================
  destroy() {
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize);

    // Clear effects
    this.clearEffects();

    // Dispose Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}

export default EventEffects3D;
