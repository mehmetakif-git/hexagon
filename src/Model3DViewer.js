// src/Model3DViewer.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

// Kategori → Model mapping
const CATEGORY_MODELS = {
  'live-sports': {
    path: '/assets/models/soccer_ball.glb',
    scale: 2.5,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    autoRotateSpeed: 0.5
  },
  'public': {
    path: '/assets/models/firework_red_rocket.glb',
    scale: 1.5,
    position: { x: 0, y: -0.5, z: 0 },
    rotation: { x: -0.3, y: 0, z: 0 },
    autoRotateSpeed: 0.3
  },
  'exhibitions': null, // Model yok
  'corporate': null,   // Model yok
  'festivals': {
    path: '/assets/models/venetian_maskk_g.glb',
    scale: 2,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    autoRotateSpeed: 0.2
  }
};

export class Model3DViewer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.model = null;
    this.animationId = null;
    this.loader = new GLTFLoader();
    this.clock = new THREE.Clock();

    // Mouse interaction
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.isHovered = false;
    this.autoRotate = true;
    this.currentConfig = null;
    this.loadingRing = null;

    this.init();
  }

  init() {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // Mouse events
    this.bindEvents();

    // Start animation loop
    this.animate();
  }

  setupLighting() {
    // Ambient light - genel aydınlatma
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Key light - ana ışık (sağ üst)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 3, 5);
    this.scene.add(keyLight);

    // Fill light - dolgu ışık (sol)
    const fillLight = new THREE.DirectionalLight(0xFF8106, 0.5);
    fillLight.position.set(-3, 0, 3);
    this.scene.add(fillLight);

    // Rim light - kenar ışık (arka)
    const rimLight = new THREE.DirectionalLight(0xFF8106, 0.8);
    rimLight.position.set(0, 2, -5);
    this.scene.add(rimLight);

    // Bottom glow - alt turuncu ışık
    const bottomLight = new THREE.PointLight(0xFF8106, 1, 10);
    bottomLight.position.set(0, -3, 2);
    this.scene.add(bottomLight);
  }

  bindEvents() {
    // Mouse move - sadece container üzerinde
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();

      // -1 ile 1 arasında normalize et
      this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Hedef rotasyon
      this.targetRotationY = this.mouseX * Math.PI * 0.3; // Max 54° sağ-sol
      this.targetRotationX = this.mouseY * Math.PI * 0.15; // Max 27° yukarı-aşağı
    });

    // Hover state
    this.container.addEventListener('mouseenter', () => {
      this.isHovered = true;
      this.autoRotate = false;

      // Hover'da scale up
      if (this.model && this.currentConfig) {
        gsap.to(this.model.scale, {
          x: this.currentConfig.scale * 1.1,
          y: this.currentConfig.scale * 1.1,
          z: this.currentConfig.scale * 1.1,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    });

    this.container.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.autoRotate = true;

      // Reset rotation targets
      this.targetRotationX = 0;
      this.targetRotationY = 0;

      // Scale back
      if (this.model && this.currentConfig) {
        gsap.to(this.model.scale, {
          x: this.currentConfig.scale,
          y: this.currentConfig.scale,
          z: this.currentConfig.scale,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    });

    // Resize
    this.resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  handleResize() {
    if (!this.container) return;

    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  async loadModel(category) {
    const config = CATEGORY_MODELS[category];

    // Model yoksa sadece glow göster
    if (!config) {
      this.showGlowOnly();
      return;
    }

    this.currentConfig = config;

    // Mevcut modeli temizle
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.model = null;
    }

    // Loading state
    this.showLoadingState();

    try {
      const gltf = await this.loadGLTF(config.path);
      this.model = gltf.scene;

      // Scale
      this.model.scale.set(config.scale, config.scale, config.scale);

      // Position
      this.model.position.set(
        config.position.x,
        config.position.y,
        config.position.z
      );

      // Initial rotation
      this.model.rotation.set(
        config.rotation.x,
        config.rotation.y,
        config.rotation.z
      );

      // Material enhancements - daha parlak görünüm
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            // Metalik ve roughness ayarları
            if (child.material.metalness !== undefined) {
              child.material.metalness = Math.min(child.material.metalness + 0.1, 1);
            }
            if (child.material.roughness !== undefined) {
              child.material.roughness = Math.max(child.material.roughness - 0.1, 0);
            }
            // Emissive glow (hafif turuncu)
            if (child.material.emissive) {
              child.material.emissive = new THREE.Color(0xFF8106);
              child.material.emissiveIntensity = 0.05;
            }
          }
        }
      });

      // Add to scene with entrance animation
      this.model.scale.set(0, 0, 0);
      this.scene.add(this.model);

      // Entrance animation
      gsap.to(this.model.scale, {
        x: config.scale,
        y: config.scale,
        z: config.scale,
        duration: 0.6,
        ease: 'back.out(1.7)'
      });

      gsap.to(this.model.rotation, {
        y: this.model.rotation.y + Math.PI * 2,
        duration: 1,
        ease: 'power2.out'
      });

      this.hideLoadingState();

    } catch (error) {
      console.error('Model yüklenemedi:', error);
      this.hideLoadingState();
      this.showGlowOnly();
    }
  }

  loadGLTF(path) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => resolve(gltf),
        (progress) => {
          // Progress callback
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`Loading model: ${percent.toFixed(0)}%`);
          }
        },
        (error) => reject(error)
      );
    });
  }

  showLoadingState() {
    // Loading placeholder - spinning ring
    const geometry = new THREE.TorusGeometry(1, 0.1, 8, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFF8106,
      transparent: true,
      opacity: 0.5
    });
    this.loadingRing = new THREE.Mesh(geometry, material);
    this.scene.add(this.loadingRing);
  }

  hideLoadingState() {
    if (this.loadingRing) {
      this.scene.remove(this.loadingRing);
      this.loadingRing.geometry.dispose();
      this.loadingRing.material.dispose();
      this.loadingRing = null;
    }
  }

  showGlowOnly() {
    // Model olmayan kategoriler için sadece glow sphere
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFF8106,
      transparent: true,
      opacity: 0.15,
      wireframe: true
    });

    this.model = new THREE.Mesh(geometry, material);
    this.scene.add(this.model);

    this.currentConfig = {
      scale: 1,
      autoRotateSpeed: 0.5,
      position: { x: 0, y: 0, z: 0 }
    };
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Loading ring animation
    if (this.loadingRing) {
      this.loadingRing.rotation.z += delta * 2;
    }

    // Model animation
    if (this.model && this.currentConfig) {
      if (this.isHovered) {
        // Mouse-controlled rotation (smooth lerp)
        this.model.rotation.x += (this.targetRotationX - this.model.rotation.x) * 0.1;
        this.model.rotation.y += (this.targetRotationY - this.model.rotation.y) * 0.1;
      } else if (this.autoRotate) {
        // Auto rotate when not hovered
        this.model.rotation.y += this.currentConfig.autoRotateSpeed * delta;

        // Gentle floating animation
        const baseY = this.currentConfig.position?.y || 0;
        this.model.position.y = baseY + Math.sin(time * 1.5) * 0.1;
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Remove resize listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    // Clean up loading ring
    if (this.loadingRing) {
      this.scene.remove(this.loadingRing);
      this.loadingRing.geometry.dispose();
      this.loadingRing.material.dispose();
      this.loadingRing = null;
    }

    // Clean up model
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.model = null;
    }

    // Clean up renderer
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
  }
}

export default Model3DViewer;
