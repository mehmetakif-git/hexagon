// src/Model3DViewer.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

// Kategori → Model mapping
const CATEGORY_MODELS = {
  'live-sports': {
    path: '/assets/models/soccer_ball.glb',
    scale: 1.0,
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
  'exhibitions': null,
  'corporate': null,
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

    // CLICK & HOLD interaction - NOT hover
    this.isDragging = false;
    this.previousMouseX = 0;
    this.previousMouseY = 0;
    this.rotationVelocityX = 0;
    this.rotationVelocityY = 0;

    // Auto rotate (when not dragging)
    this.autoRotate = true;
    this.currentConfig = null;
    this.loadingRing = null;

    // Base rotation (for auto-rotate continuation)
    this.baseRotationY = 0;

    this.init();
  }

  init() {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    // Scene - FULLY TRANSPARENT
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    // Renderer - TRANSPARENT
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // Fully transparent
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    // Lighting
    this.setupLighting();

    // CLICK & HOLD events
    this.bindEvents();

    // Start animation loop
    this.animate();
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Key light (right top)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 3, 5);
    this.scene.add(keyLight);

    // Fill light (left) - orange
    const fillLight = new THREE.DirectionalLight(0xFF8106, 0.5);
    fillLight.position.set(-3, 0, 3);
    this.scene.add(fillLight);

    // Rim light (back) - orange
    const rimLight = new THREE.DirectionalLight(0xFF8106, 0.8);
    rimLight.position.set(0, 2, -5);
    this.scene.add(rimLight);

    // Bottom glow
    const bottomLight = new THREE.PointLight(0xFF8106, 1, 10);
    bottomLight.position.set(0, -3, 2);
    this.scene.add(bottomLight);
  }

  bindEvents() {
    // =============================================
    // CLICK & HOLD - Mouse Down starts dragging
    // =============================================

    this.container.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      this.autoRotate = false;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
      this.container.style.cursor = 'grabbing';

      // Reset velocity
      this.rotationVelocityX = 0;
      this.rotationVelocityY = 0;
    });

    // Mouse Move - only if dragging is true
    this.mouseMoveHandler = (e) => {
      if (!this.isDragging || !this.model) return;

      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;

      // Calculate rotation velocity
      this.rotationVelocityY = deltaX * 0.01;
      this.rotationVelocityX = deltaY * 0.01;

      // Rotate model
      this.model.rotation.y += this.rotationVelocityY;
      this.model.rotation.x += this.rotationVelocityX;

      // Clamp X rotation (-45° to 45°)
      this.model.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.model.rotation.x));

      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    };
    document.addEventListener('mousemove', this.mouseMoveHandler);

    // Mouse Up - dragging ends
    this.mouseUpHandler = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.container.style.cursor = 'grab';

        // Return to auto-rotate after short delay
        setTimeout(() => {
          if (!this.isDragging) {
            this.autoRotate = true;
            // Save current Y rotation as base
            if (this.model) {
              this.baseRotationY = this.model.rotation.y;
            }
          }
        }, 1500); // Wait 1.5 seconds
      }
    };
    document.addEventListener('mouseup', this.mouseUpHandler);

    // =============================================
    // TOUCH EVENTS - Mobile support
    // =============================================

    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.autoRotate = false;
        this.previousMouseX = e.touches[0].clientX;
        this.previousMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.touchMoveHandler = (e) => {
      if (!this.isDragging || !this.model || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - this.previousMouseX;
      const deltaY = e.touches[0].clientY - this.previousMouseY;

      this.model.rotation.y += deltaX * 0.01;
      this.model.rotation.x += deltaY * 0.01;
      this.model.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.model.rotation.x));

      this.previousMouseX = e.touches[0].clientX;
      this.previousMouseY = e.touches[0].clientY;
    };
    document.addEventListener('touchmove', this.touchMoveHandler, { passive: true });

    this.touchEndHandler = () => {
      if (this.isDragging) {
        this.isDragging = false;
        setTimeout(() => {
          if (!this.isDragging) {
            this.autoRotate = true;
            if (this.model) {
              this.baseRotationY = this.model.rotation.y;
            }
          }
        }, 1500);
      }
    };
    document.addEventListener('touchend', this.touchEndHandler);

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

    if (!config) {
      this.showGlowOnly();
      return;
    }

    this.currentConfig = config;

    // Clear existing model
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
      this.baseRotationY = config.rotation.y;

      // Material enhancements
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            if (child.material.metalness !== undefined) {
              child.material.metalness = Math.min(child.material.metalness + 0.1, 1);
            }
            if (child.material.roughness !== undefined) {
              child.material.roughness = Math.max(child.material.roughness - 0.1, 0);
            }
            if (child.material.emissive) {
              child.material.emissive = new THREE.Color(0xFF8106);
              child.material.emissiveIntensity = 0.05;
            }
          }
        }
      });

      // Entrance animation
      this.model.scale.set(0, 0, 0);
      this.scene.add(this.model);

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
        ease: 'power2.out',
        onComplete: () => {
          if (this.model) {
            this.baseRotationY = this.model.rotation.y;
          }
        }
      });

      this.hideLoadingState();

    } catch (error) {
      console.error('Model could not be loaded:', error);
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
      // AUTO-ROTATE - only when not dragging
      if (this.autoRotate && !this.isDragging) {
        this.model.rotation.y += this.currentConfig.autoRotateSpeed * delta;

        // Floating animation
        const baseY = this.currentConfig.position?.y || 0;
        this.model.position.y = baseY + Math.sin(time * 1.5) * 0.1;
      }

      // Momentum/deceleration (after releasing drag)
      if (!this.isDragging && !this.autoRotate) {
        // Slowly reduce velocity
        this.rotationVelocityX *= 0.95;
        this.rotationVelocityY *= 0.95;

        this.model.rotation.y += this.rotationVelocityY;
        this.model.rotation.x += this.rotationVelocityX;
        this.model.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.model.rotation.x));
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Remove event listeners
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.mouseUpHandler) {
      document.removeEventListener('mouseup', this.mouseUpHandler);
    }
    if (this.touchMoveHandler) {
      document.removeEventListener('touchmove', this.touchMoveHandler);
    }
    if (this.touchEndHandler) {
      document.removeEventListener('touchend', this.touchEndHandler);
    }

    if (this.loadingRing) {
      this.scene.remove(this.loadingRing);
      this.loadingRing.geometry.dispose();
      this.loadingRing.material.dispose();
      this.loadingRing = null;
    }

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
