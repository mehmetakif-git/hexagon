// src/FlyingDrone.js
// Animated flying drone that moves across the modal
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class FlyingDrone {
  constructor(container, options = {}) {
    this.container = container;
    this.canvas = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.loader = new GLTFLoader();
    this.clock = new THREE.Clock();
    this.animationId = null;

    // Drone model
    this.drone = null;
    this.mixer = null;

    // Flight path settings
    this.flightProgress = 0;
    this.flightSpeed = options.speed || 0.06; // Speed of flight
    this.droneScale = options.scale || 3.0; // Good visible scale
    this.totalRounds = 5; // 5 round trips before reset
    this.currentRound = 0;
    this.goingRight = true; // Direction flag for ping-pong

    // Simple linear flight path
    this.startX = -4;
    this.endX = 4;
    this.baseY = -2.5; // Lower position in view

    this.init();
  }

  init() {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'flying-drone-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '300px'; // Top portion
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '99';
    this.container.appendChild(this.canvas);

    const width = this.container.offsetWidth || 800;
    const height = 300;

    // Scene
    this.scene = new THREE.Scene();

    // Camera - perspective, centered on drone's flight path
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 1.0, 6);
    this.camera.lookAt(0, -1.2, 0);

    // Renderer with transparent background
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;

    // Lighting - subtle theme-matched orange tones
    const ambientLight = new THREE.AmbientLight(0xfff5eb, 0.7); // Warm ambient
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3, 3, 5);
    this.scene.add(keyLight);

    const orangeAccent = new THREE.DirectionalLight(0xff8106, 0.3); // Subtle orange
    orangeAccent.position.set(-2, 0, 3);
    this.scene.add(orangeAccent);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(0, 2, -5);
    this.scene.add(rimLight);

    // Resize handler
    this.resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.resizeHandler);

    // Load drone model
    this.loadDrone();

    // Start animation
    this.animate();
  }

  handleResize() {
    const width = this.container.offsetWidth || 800;
    const height = 300;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  async loadDrone() {
    try {
      const gltf = await this.loadGLTF('/assets/models/flying-drone-animation/source/Flying%20drone_.glb');
      this.drone = gltf.scene;

      // Load textures manually
      const textureLoader = new THREE.TextureLoader();
      const texturePath = '/assets/models/flying-drone-animation/textures/';

      const albedoTexture = textureLoader.load(texturePath + 'gltf_embedded_0.png');
      const normalTexture = textureLoader.load(texturePath + 'gltf_embedded_1.png');
      const roughnessTexture = textureLoader.load(texturePath + 'gltf_embedded_2.png');

      // Set texture color space
      albedoTexture.colorSpace = THREE.SRGBColorSpace;

      // Apply textures to all materials
      this.drone.traverse((child) => {
        if (child.isMesh && child.material) {
          const mat = child.material;
          mat.map = albedoTexture;
          mat.normalMap = normalTexture;
          mat.roughnessMap = roughnessTexture;
          mat.metalness = 0.3;
          mat.roughness = 0.7;
          mat.needsUpdate = true;
        }
      });

      // Scale the drone
      const box = new THREE.Box3().setFromObject(this.drone);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = (1 / maxDim) * this.droneScale;
      this.drone.scale.set(scale, scale, scale);

      // Initial position (off-screen left, at baseY height)
      this.drone.position.set(this.startX, this.baseY, 0);

      // Setup animation - only play "hover" animation
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.drone);

        // Find and play only the "hover" animation
        const hoverClip = gltf.animations.find(clip =>
          clip.name.toLowerCase().includes('hover')
        );

        if (hoverClip) {
          const action = this.mixer.clipAction(hoverClip);
          action.play();
          console.log('Playing hover animation:', hoverClip.name);
        } else {
          // Fallback: play first animation if no hover found
          console.log('Available animations:', gltf.animations.map(c => c.name));
          const action = this.mixer.clipAction(gltf.animations[0]);
          action.play();
        }
      }

      this.scene.add(this.drone);
      console.log('Flying drone loaded successfully');

    } catch (error) {
      console.error('Failed to load drone model:', error);
    }
  }

  loadGLTF(path) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      );
    });
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Update drone animation mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Move drone across screen - ping-pong style
    if (this.drone) {
      // Update flight progress
      this.flightProgress += delta * this.flightSpeed;

      // Check if completed one pass (0 to 1)
      if (this.flightProgress >= 1) {
        this.flightProgress = 0;
        this.goingRight = !this.goingRight; // Reverse direction

        // Count half-round (each direction change = half round)
        if (!this.goingRight) {
          this.currentRound++;
        }

        // Reset after 5 full rounds (10 direction changes)
        if (this.currentRound >= this.totalRounds) {
          this.currentRound = 0;
          this.goingRight = true;
        }
      }

      const t = this.flightProgress;

      // X position: ping-pong based on direction
      let x;
      if (this.goingRight) {
        x = this.startX + (this.endX - this.startX) * t;
      } else {
        x = this.endX - (this.endX - this.startX) * t;
      }

      // Y position: gentle hover motion
      const y = this.baseY + Math.sin(t * Math.PI * 2) * 0.03;

      this.drone.position.x = x;
      this.drone.position.y = y;
      this.drone.position.z = 0;

      // Slight tilt in direction of movement
      const tiltDirection = this.goingRight ? 1 : -1;
      this.drone.rotation.z = tiltDirection * 0.03;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }

    if (this.drone) {
      this.scene.remove(this.drone);
      this.drone.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.drone = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
  }
}

export default FlyingDrone;
