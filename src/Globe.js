// src/Globe.js
import * as THREE from 'three';
import ThreeGlobe from 'three-globe';
import gsap from 'gsap';

export class HexagonGlobe {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globe = null;
    this.rafId = null;
    this.isDestroyed = false;
    this.pauseAutoRotate = false; // Flag to pause auto-rotation during city animation

    // Hexagon Theme Colors - Optimized for polygon display
    this.colors = {
      globe: '#050a15',                      // Very dark blue
      land: 'rgba(255, 129, 6, 0.4)',        // Semi-transparent orange for countries
      landStroke: 'rgba(255, 129, 6, 0.8)', // Brighter border
      arc: '#FFFFFF',                        // White - main office connections
      arcAlt: '#FFD700',                     // Gold - global connections
      point: '#FFFFFF',                      // White dots
      pointHQ: '#FFD700',                    // Gold for HQ
      atmosphere: '#FF8106',
      ring: 'rgba(255, 255, 255, 0.7)'       // White pulse rings
    };

    // Office Locations
    this.locations = [
      { name: 'Doha', lat: 25.3, lng: 51.5, isHQ: true },
      { name: 'London', lat: 51.5, lng: -0.1, isHQ: false },
      { name: 'Istanbul', lat: 41.0, lng: 29.0, isHQ: false },
      { name: 'Dubai', lat: 25.2, lng: 55.3, isHQ: false }
    ];

    // Connection Arcs
    this.arcs = this.generateArcs();

    // Countries data
    this.countriesLoaded = false;
    this.countriesData = { features: [] };

    this.init();
  }

  generateArcs() {
    const doha = this.locations[0];
    const arcs = [];

    // Doha'dan diger ofislere
    this.locations.slice(1).forEach((loc, i) => {
      arcs.push({
        startLat: doha.lat,
        startLng: doha.lng,
        endLat: loc.lat,
        endLng: loc.lng,
        color: this.colors.arc,
        order: i + 1
      });
    });

    // Ekstra global baglantilar
    const globalConnections = [
      { start: { lat: 51.5, lng: -0.1 }, end: { lat: 40.7, lng: -74.0 } }, // London - NY
      { start: { lat: 41.0, lng: 29.0 }, end: { lat: 52.5, lng: 13.4 } },  // Istanbul - Berlin
      { start: { lat: 25.2, lng: 55.3 }, end: { lat: 1.3, lng: 103.8 } },  // Dubai - Singapore
      { start: { lat: 25.3, lng: 51.5 }, end: { lat: 35.7, lng: 139.7 } }, // Doha - Tokyo
      { start: { lat: 25.3, lng: 51.5 }, end: { lat: -33.9, lng: 18.4 } }, // Doha - Cape Town
    ];

    globalConnections.forEach((conn, i) => {
      arcs.push({
        startLat: conn.start.lat,
        startLng: conn.start.lng,
        endLat: conn.end.lat,
        endLng: conn.end.lng,
        color: this.colors.arcAlt,
        order: i + 5
      });
    });

    return arcs;
  }

  async init() {
    // Load countries data first
    await this.loadCountriesData();

    if (this.isDestroyed) return;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 1, 1000);
    this.camera.position.z = 280;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    // Lights
    this.setupLights();

    // Globe
    this.setupGlobe();

    // Events
    this.setupEvents();

    // Start animation
    this.animate();
  }

  async loadCountriesData() {
    // Direct GeoJSON URLs (not TopoJSON)
    const urls = [
      'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson',
      'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
    ];

    for (const url of urls) {
      try {
        console.log('🌍 Trying to load countries from:', url);
        const response = await fetch(url);

        if (!response.ok) {
          console.warn(`❌ Failed to fetch from ${url}: ${response.status}`);
          continue;
        }

        const data = await response.json();

        // GeoJSON format
        if (data.type === 'FeatureCollection' && data.features) {
          this.countriesData = data;
          console.log('✅ Countries loaded (GeoJSON):', data.features.length);
          this.countriesLoaded = true;
          return;
        }

      } catch (error) {
        console.warn(`❌ Error loading from ${url}:`, error.message);
      }
    }

    console.warn('⚠️ Could not load countries from any source');
    this.countriesLoaded = false;
  }

  setupLights() {
    // Ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Directional (left)
    const dirLeft = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLeft.position.set(-200, 100, 200);
    this.scene.add(dirLeft);

    // Directional (top)
    const dirTop = new THREE.DirectionalLight(0xffffff, 0.5);
    dirTop.position.set(0, 200, 100);
    this.scene.add(dirTop);

    // Point light (orange accent)
    const pointLight = new THREE.PointLight(0xFF8106, 1.5, 500);
    pointLight.position.set(100, 100, 200);
    this.scene.add(pointLight);
  }

  setupGlobe() {
    console.log('🔧 Setting up globe...');
    console.log('📊 Countries loaded:', this.countriesLoaded);
    console.log('📊 Features count:', this.countriesData?.features?.length || 0);

    // Create globe
    this.globe = new ThreeGlobe()
      // Globe appearance
      .showGlobe(true)
      .showAtmosphere(true)
      .atmosphereColor(this.colors.atmosphere)
      .atmosphereAltitude(0.12);

    // Add polygons if data loaded (using polygonsData instead of hexPolygons for reliability)
    if (this.countriesLoaded && this.countriesData?.features?.length > 0) {
      console.log('🌍 Adding polygons for', this.countriesData.features.length, 'countries');
      this.globe
        .polygonsData(this.countriesData.features)
        .polygonCapColor(() => this.colors.land)
        .polygonSideColor(() => 'rgba(255, 129, 6, 0.15)')
        .polygonStrokeColor(() => this.colors.landStroke)
        .polygonAltitude(0.008);
    } else {
      console.warn('⚠️ No countries data - adding wireframe fallback');
      // Fallback wireframe sphere
      const geometry = new THREE.SphereGeometry(100.5, 48, 24);
      const material = new THREE.MeshBasicMaterial({
        color: 0xFF8106,
        wireframe: true,
        transparent: true,
        opacity: 0.15
      });
      this.wireframeSphere = new THREE.Mesh(geometry, material);
      this.scene.add(this.wireframeSphere);
    }

    // Arcs - White/Gold animated connections
    this.globe
      .arcsData(this.arcs)
      .arcColor(d => d.color)
      .arcAltitude(0.2)
      .arcStroke(1.2)
      .arcDashLength(0.6)
      .arcDashGap(0.3)
      .arcDashAnimateTime(1500)
      .arcDashInitialGap(d => d.order * 0.4);

    // Points (locations) - White/Gold dots
    this.globe
      .pointsData(this.locations)
      .pointColor(d => d.isHQ ? this.colors.pointHQ : this.colors.point)
      .pointAltitude(0.025)
      .pointRadius(d => d.isHQ ? 1.2 : 0.8);

    // Rings (pulse effect) - White pulses (above polygons)
    this.globe
      .ringsData(this.locations)
      .ringColor(() => this.colors.ring)
      .ringAltitude(0.015)
      .ringMaxRadius(5)
      .ringPropagationSpeed(2.5)
      .ringRepeatPeriod(1000);

    // Globe material customization
    const globeMaterial = this.globe.globeMaterial();
    globeMaterial.color = new THREE.Color(this.colors.globe);
    globeMaterial.emissive = new THREE.Color(0x110408);
    globeMaterial.emissiveIntensity = 0.08;
    globeMaterial.shininess = 0.7;

    // Position globe
    this.globe.position.set(0, 0, 0);
    this.scene.add(this.globe);

    // Initial rotation (show Doha region - Middle East facing camera)
    this.globe.rotation.y = -Math.PI / 2.5;
    this.globe.rotation.x = 0.1;
  }

  setupEvents() {
    // Resize
    this.resizeHandler = () => {
      if (!this.container || this.isDestroyed) return;

      const width = this.container.clientWidth;
      const height = this.container.clientHeight;

      if (width === 0 || height === 0) return;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };

    window.addEventListener('resize', this.resizeHandler);

    // Mouse interaction (drag to rotate in all directions)
    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;

    this.mouseDownHandler = (e) => {
      isDragging = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
      this.renderer.domElement.style.cursor = 'grabbing';
      // Pause auto-rotate while dragging
      this.pauseAutoRotate = true;
    };

    this.mouseUpHandler = () => {
      isDragging = false;
      if (this.renderer?.domElement) {
        this.renderer.domElement.style.cursor = 'grab';
      }
      // Resume auto-rotate after dragging
      this.pauseAutoRotate = false;
    };

    this.mouseMoveHandler = (e) => {
      if (isDragging && this.globe) {
        const deltaX = e.clientX - previousMouseX;
        const deltaY = e.clientY - previousMouseY;

        // Horizontal rotation (Y axis)
        this.globe.rotation.y += deltaX * 0.005;

        // Vertical rotation (X axis) with limits
        this.globe.rotation.x += deltaY * 0.005;
        // Limit vertical rotation to prevent flipping
        this.globe.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.globe.rotation.x));

        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
      }
    };

    // Set initial cursor style
    this.renderer.domElement.style.cursor = 'grab';

    this.renderer.domElement.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    window.addEventListener('mousemove', this.mouseMoveHandler);
  }

  animate() {
    if (this.isDestroyed) return;

    this.rafId = requestAnimationFrame(() => this.animate());

    // Auto rotate (slow) - only if not paused
    if (this.globe) {
      if (!this.pauseAutoRotate) {
        this.globe.rotation.y += 0.001;
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Rotate to specific city coordinates
  rotateToCity(lat, lng, onComplete) {
    if (!this.globe) {
      console.warn('Globe not ready');
      return;
    }

    console.log(`🌍 Rotating to: lat=${lat}, lng=${lng}`);
    console.log(`📍 Current rotation: x=${this.globe.rotation.x}, y=${this.globe.rotation.y}`);

    // Pause auto-rotate during animation
    this.pauseAutoRotate = true;
    console.log('⏸️ Auto-rotate paused');

    // Convert lat/lng to globe rotation
    // three-globe coordinate system:
    // - Y rotation: controls which longitude faces camera (negative = east)
    // - X rotation: controls tilt (latitude view)
    // Camera is at z=280, looking at origin

    // Calibration: Initial rotation shows Doha (lng=51.5) at rotation.y = -Math.PI/2.5 ≈ -1.257
    // So we need an offset to match: -51.5*(PI/180) - offset = -1.257
    // offset ≈ -0.358 (about -20.5 degrees)
    const lngOffset = -0.358;
    const targetY = -lng * (Math.PI / 180) + lngOffset;
    const targetX = lat * (Math.PI / 180) * 0.3; // Slight tilt for latitude

    console.log(`🎯 Target rotation: x=${targetX}, y=${targetY}`);

    gsap.to(this.globe.rotation, {
      x: targetX,
      y: targetY,
      duration: 1.2,
      ease: 'power2.inOut',
      onStart: () => {
        console.log('🚀 Animation started');
      },
      onComplete: () => {
        console.log('✅ Animation complete');
        // Resume auto-rotate after a short delay
        setTimeout(() => {
          this.pauseAutoRotate = false;
          console.log('▶️ Auto-rotate resumed');
        }, 500);
        if (onComplete) onComplete();
      }
    });
  }

  destroy() {
    this.isDestroyed = true;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Remove event listeners
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
    window.removeEventListener('mousemove', this.mouseMoveHandler);

    if (this.renderer) {
      this.renderer.domElement.removeEventListener('mousedown', this.mouseDownHandler);
      this.renderer.dispose();
      if (this.container && this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }

    // Dispose globe
    if (this.globe) {
      this.scene.remove(this.globe);
    }

    // Dispose wireframe fallback
    if (this.wireframeSphere) {
      this.scene.remove(this.wireframeSphere);
      this.wireframeSphere.geometry.dispose();
      this.wireframeSphere.material.dispose();
    }

    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globe = null;
    this.wireframeSphere = null;
  }
}
