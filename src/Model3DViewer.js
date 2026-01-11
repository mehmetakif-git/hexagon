// src/Model3DViewer.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { CanvasFireworks } from './CanvasFireworks.js';

// Kategori → Model mapping
const CATEGORY_MODELS = {
  'live-sports': {
    path: '/assets/models/soccer_ball.glb',
    scale: 1.0,  // Multiplier (1.0 = auto-fit size)
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    autoRotateSpeed: 0.5
  },
  'public': null, // Fireworks handled separately as overlay in EventModal
  'exhibitions': {
    path: '/assets/models/building_entrance.glb',
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0.3, z: 0 },
    autoRotateSpeed: 0.3,
    autoRotateSpeedX: 0.1 // Slight X rotation
  },
  'corporate': {
    path: '/assets/models/office_suitcas.glb',
    scale: 1.0,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    autoRotateSpeed: 0.4
  },
  'festivals': {
    path: '/assets/models/venetian_maskk_g.glb',
    scale: 1.0,
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

    // CLICK & HOLD interaction
    this.isDragging = false;
    this.previousMouseX = 0;
    this.previousMouseY = 0;
    this.rotationVelocityX = 0;
    this.rotationVelocityY = 0;

    // Auto rotate
    this.autoRotate = true;
    this.currentConfig = null;
    this.loadingRing = null;
    this.baseRotationY = 0;

    // Animation support
    this.mixer = null;
    this.animations = [];

    // Multiple instances support (for fireworks)
    this.additionalModels = [];
    this.additionalMixers = [];

    // Canvas fireworks (2D alternative)
    this.canvasFireworks = null;

    this.init();
  }

  init() {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    // Scene
    this.scene = new THREE.Scene();

    // Camera - positioned to see model properly
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 6;

    // Renderer - transparent
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

    this.setupLighting();
    this.bindEvents();
    this.animate();
  }

  setupLighting() {
    // Warm ambient with slight orange tint
    const ambientLight = new THREE.AmbientLight(0xfff5eb, 0.7);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3, 3, 5);
    this.scene.add(keyLight);

    // Subtle orange accent light for theme consistency
    const orangeAccent = new THREE.DirectionalLight(0xff8106, 0.3);
    orangeAccent.position.set(-3, 0, 3);
    this.scene.add(orangeAccent);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(0, 2, -5);
    this.scene.add(rimLight);

    const bottomLight = new THREE.PointLight(0xffffff, 0.4, 10);
    bottomLight.position.set(0, -3, 2);
    this.scene.add(bottomLight);
  }

  bindEvents() {
    // Mouse down - start dragging
    this.container.addEventListener('mousedown', (e) => {
      // Skip interaction if disabled for this model
      if (this.currentConfig?.disableInteraction) return;

      e.preventDefault();
      this.isDragging = true;
      this.autoRotate = false;
      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
      this.container.style.cursor = 'grabbing';
      this.rotationVelocityX = 0;
      this.rotationVelocityY = 0;
    });

    // Mouse move
    this.mouseMoveHandler = (e) => {
      if (!this.isDragging || !this.model) return;
      if (this.currentConfig?.disableInteraction) return;

      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;

      this.rotationVelocityY = deltaX * 0.01;
      this.rotationVelocityX = deltaY * 0.01;

      this.model.rotation.y += this.rotationVelocityY;
      this.model.rotation.x += this.rotationVelocityX;
      this.model.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.model.rotation.x));

      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    };
    document.addEventListener('mousemove', this.mouseMoveHandler);

    // Mouse up - smooth return to initial position
    this.mouseUpHandler = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.container.style.cursor = 'grab';

        // Smooth return to initial rotation
        this.smoothReturnToStart();
      }
    };
    document.addEventListener('mouseup', this.mouseUpHandler);

    // Touch events
    this.container.addEventListener('touchstart', (e) => {
      // Skip interaction if disabled for this model
      if (this.currentConfig?.disableInteraction) return;

      if (e.touches.length === 1) {
        this.isDragging = true;
        this.autoRotate = false;
        this.previousMouseX = e.touches[0].clientX;
        this.previousMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.touchMoveHandler = (e) => {
      if (!this.isDragging || !this.model || e.touches.length !== 1) return;
      if (this.currentConfig?.disableInteraction) return;

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

        // Smooth return to initial rotation
        this.smoothReturnToStart();
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

  // Smooth return to initial rotation position
  smoothReturnToStart() {
    if (!this.model || !this.currentConfig) return;

    const initialRotationX = this.currentConfig.rotation?.x || 0;
    const initialRotationY = this.currentConfig.rotation?.y || 0;

    // Animate back to initial rotation
    gsap.to(this.model.rotation, {
      x: initialRotationX,
      y: initialRotationY,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => {
        // Re-enable auto rotate after return
        this.autoRotate = true;
        this.baseRotationY = initialRotationY;
      }
    });
  }

  async loadModel(category) {
    const config = CATEGORY_MODELS[category];

    if (!config) {
      this.showGlowOnly();
      return;
    }

    this.currentConfig = { ...config };

    // Clear existing models and animations
    this.clearAllModels();

    // Check if using canvas fireworks (2D)
    if (config.useCanvasFireworks) {
      this.loadCanvasFireworks();
      return;
    }

    this.showLoadingState();

    try {
      // Check if we need multiple instances (fireworks)
      if (config.multipleInstances && config.multipleInstances.length > 0) {
        await this.loadMultipleInstances(config);
      } else {
        await this.loadSingleModel(config);
      }

      this.hideLoadingState();

    } catch (error) {
      console.error('Model could not be loaded:', error);
      this.hideLoadingState();
      this.showGlowOnly();
    }
  }

  // Load canvas-based 2D fireworks
  loadCanvasFireworks() {
    // Hide 3D renderer
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.style.display = 'none';
    }

    // Create canvas fireworks
    this.canvasFireworks = new CanvasFireworks(this.container);
  }

  // Clear all models and animations
  clearAllModels() {
    // Clear canvas fireworks if exists
    if (this.canvasFireworks) {
      this.canvasFireworks.destroy();
      this.canvasFireworks = null;

      // Show 3D renderer again
      if (this.renderer && this.renderer.domElement) {
        this.renderer.domElement.style.display = 'block';
      }
    }

    // Clear main model
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
      this.animations = [];
    }

    if (this.model) {
      this.scene.remove(this.model);
      this.disposeModel(this.model);
      this.model = null;
    }

    // Clear additional models (fireworks)
    this.additionalMixers.forEach(mixer => {
      if (mixer) mixer.stopAllAction();
    });
    this.additionalMixers = [];

    this.additionalModels.forEach(model => {
      if (model) {
        this.scene.remove(model);
        this.disposeModel(model);
      }
    });
    this.additionalModels = [];
  }

  // Dispose model resources
  disposeModel(model) {
    model.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  // Load multiple fireworks instances with different colors
  async loadMultipleInstances(config) {
    const instances = config.multipleInstances;
    const particleReduction = config.particleReduction || 1;
    const maxMeshes = config.maxMeshesPerInstance || Infinity;

    console.log(`Loading ${instances.length} firework instances with ${(particleReduction * 100).toFixed(0)}% particles...`);

    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      const gltf = await this.loadGLTF(config.path);
      const model = gltf.scene.clone();

      // Calculate scale
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 3.2;

      let finalScale;
      if (maxDim === 0 || !isFinite(maxDim)) {
        finalScale = config.scale || 1;
      } else {
        finalScale = (targetSize / maxDim) * (config.scale || 1);
      }

      model.scale.set(finalScale, finalScale, finalScale);

      // Position with offset
      const center = box.getCenter(new THREE.Vector3());
      model.position.set(
        -center.x * finalScale + (instance.position?.x || 0) * finalScale,
        -center.y * finalScale + (instance.position?.y || 0) * finalScale,
        -center.z * finalScale + (instance.position?.z || 0) * finalScale
      );

      // Rotation
      model.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);

      // Count total meshes first
      let totalMeshes = 0;
      model.traverse((child) => {
        if (child.isMesh) totalMeshes++;
      });

      // Calculate how many meshes to keep
      const targetMeshCount = Math.min(
        Math.floor(totalMeshes * particleReduction),
        maxMeshes
      );

      // Create a deterministic pattern for mesh visibility (based on instance index)
      // This ensures each firework has a different subset of particles
      const seed = i * 12345;
      let visibleCount = 0;
      let meshIndex = 0;

      model.traverse((child) => {
        if (child.isMesh) {
          // Deterministic pseudo-random based on mesh index and seed
          const pseudoRandom = ((meshIndex * 9301 + seed) % 49297) / 49297;

          // Show mesh if under target count and passes random check
          const shouldShow = visibleCount < targetMeshCount && pseudoRandom < particleReduction * 2;

          if (shouldShow) {
            child.visible = true;
            child.frustumCulled = false;
            visibleCount++;

            // Apply instance color
            if (child.material) {
              // Clone material to avoid affecting other instances
              child.material = child.material.clone();
              child.material.color = new THREE.Color(instance.color);
              if (child.material.emissive) {
                child.material.emissive = new THREE.Color(instance.color);
                child.material.emissiveIntensity = 0.6;
              }
              // Make particles slightly transparent for performance
              child.material.transparent = true;
              child.material.opacity = 0.9;
            }
          } else {
            child.visible = false;
          }
          meshIndex++;
        }
      });

      console.log(`Firework ${i + 1}: ${visibleCount}/${totalMeshes} meshes visible`);

      // Setup animation with delay
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);

        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat);

          // Staggered start - delay the animation
          if (instance.delay > 0) {
            action.startAt(mixer.time + instance.delay);
          }
          action.play();
        });

        if (i === 0) {
          this.mixer = mixer;
          this.animations = gltf.animations;
          this.model = model;
        } else {
          this.additionalMixers.push(mixer);
          this.additionalModels.push(model);
        }
      }

      // Add to scene
      this.scene.add(model);
    }

    this.currentConfig.finalScale = config.scale;
  }

  // Load single model (non-fireworks)
  async loadSingleModel(config) {
    const gltf = await this.loadGLTF(config.path);
    this.model = gltf.scene;

    // Animation support
    if (gltf.animations && gltf.animations.length > 0) {
      console.log('Model has animations:', gltf.animations.length);
      this.mixer = new THREE.AnimationMixer(this.model);
      this.animations = gltf.animations;

      gltf.animations.forEach((clip, index) => {
        console.log(`Playing animation ${index}: ${clip.name}, duration: ${clip.duration}s`);
        const action = this.mixer.clipAction(clip);
        action.play();
      });
    }

    // Setup meshes and fix texture colorSpace for Three.js r152+
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.visible = true;
        child.frustumCulled = false;

        // Fix texture colorSpace for proper rendering
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            // Color/diffuse maps should be sRGB
            if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
            if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            // Ensure material updates
            mat.needsUpdate = true;
          });
        }
      }
    });

    // Auto-fit scale
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 3.2;

    let finalScale;
    if (maxDim === 0 || !isFinite(maxDim)) {
      finalScale = config.scale || 1;
    } else {
      finalScale = (targetSize / maxDim) * (config.scale || 1);
    }

    this.model.scale.set(finalScale, finalScale, finalScale);

    // Center the model
    if (isFinite(center.x) && isFinite(center.y) && isFinite(center.z)) {
      this.model.position.set(
        -center.x * finalScale,
        -center.y * finalScale + (config.position?.y || 0),
        -center.z * finalScale
      );
    }

    this.currentConfig.finalScale = finalScale;

    // Initial rotation
    this.model.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
    this.baseRotationY = config.rotation.y;

    // Apply tint color
    if (config.tintColor) {
      this.model.traverse((child) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              mat.color = new THREE.Color(config.tintColor);
              if (mat.emissive) {
                mat.emissive = new THREE.Color(config.tintColor);
                mat.emissiveIntensity = 0.3;
              }
            });
          } else {
            child.material.color = new THREE.Color(config.tintColor);
            if (child.material.emissive) {
              child.material.emissive = new THREE.Color(config.tintColor);
              child.material.emissiveIntensity = 0.3;
            }
          }
        }
      });
    }

    // Add to scene
    this.scene.add(this.model);

    // Entrance animation
    gsap.fromTo(this.model.scale,
      { x: finalScale * 0.5, y: finalScale * 0.5, z: finalScale * 0.5 },
      { x: finalScale, y: finalScale, z: finalScale, duration: 0.6, ease: 'back.out(1.7)' }
    );

    gsap.fromTo(this.model.rotation,
      { y: this.model.rotation.y - Math.PI },
      {
        y: this.model.rotation.y + Math.PI,
        duration: 1.2,
        ease: 'power2.out',
        onComplete: () => {
          if (this.model) {
            this.baseRotationY = this.model.rotation.y;
          }
        }
      }
    );
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
      finalScale: 1,
      autoRotateSpeed: 0.5,
      position: { x: 0, y: 0, z: 0 }
    };
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Update main animation mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Update additional mixers (for multiple fireworks)
    this.additionalMixers.forEach(mixer => {
      if (mixer) mixer.update(delta);
    });

    if (this.loadingRing) {
      this.loadingRing.rotation.z += delta * 2;
    }

    if (this.model && this.currentConfig) {
      if (this.autoRotate && !this.isDragging) {
        this.model.rotation.y += this.currentConfig.autoRotateSpeed * delta;

        // Optional X axis rotation (for building_entrance)
        if (this.currentConfig.autoRotateSpeedX) {
          this.model.rotation.x += this.currentConfig.autoRotateSpeedX * delta;
        }

        // Subtle floating animation
        const floatOffset = Math.sin(time * 1.5) * 0.05;
        if (this.currentConfig.baseY !== undefined) {
          this.model.position.y = this.currentConfig.baseY + floatOffset;
        }
      }

      if (!this.isDragging && !this.autoRotate) {
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

    // Clean up all models and animations (including multiple fireworks)
    this.clearAllModels();

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
