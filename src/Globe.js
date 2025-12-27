// src/Globe.js
import * as THREE from 'three';
import ThreeGlobe from 'three-globe';

export class HexagonGlobe {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globe = null;
    this.rafId = null;
    this.isDestroyed = false;

    // Hexagon Theme Colors
    this.colors = {
      globe: '#0a0815',
      land: 'rgba(255, 129, 6, 0.3)',
      arc: '#FF8106',
      arcAlt: '#FFAA33',
      point: '#FF8106',
      atmosphere: '#FF8106',
      ring: 'rgba(255, 129, 6, 0.6)'
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
    try {
      const response = await fetch('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/datasets/ne_110m_admin_0_countries.geojson');
      const data = await response.json();
      this.countriesData = data;
      this.countriesLoaded = true;
    } catch (error) {
      console.warn('Could not load countries data:', error);
      this.countriesLoaded = false;
    }
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
    // Create globe
    this.globe = new ThreeGlobe()
      // Globe appearance
      .showGlobe(true)
      .showAtmosphere(true)
      .atmosphereColor(this.colors.atmosphere)
      .atmosphereAltitude(0.2);

    // Add hex polygons if data loaded
    if (this.countriesLoaded && this.countriesData.features.length > 0) {
      this.globe
        .hexPolygonsData(this.countriesData.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.7)
        .hexPolygonColor(() => this.colors.land);
    }

    // Arcs
    this.globe
      .arcsData(this.arcs)
      .arcColor(d => d.color)
      .arcAltitude(0.15)
      .arcStroke(0.6)
      .arcDashLength(0.9)
      .arcDashGap(0.4)
      .arcDashAnimateTime(2000)
      .arcDashInitialGap(d => d.order * 0.5);

    // Points (locations)
    this.globe
      .pointsData(this.locations)
      .pointColor(d => d.isHQ ? '#FF8106' : '#FFAA33')
      .pointAltitude(0.02)
      .pointRadius(d => d.isHQ ? 1.0 : 0.6);

    // Rings (pulse effect)
    this.globe
      .ringsData(this.locations)
      .ringColor(() => this.colors.ring)
      .ringMaxRadius(4)
      .ringPropagationSpeed(3)
      .ringRepeatPeriod(1200);

    // Globe material customization
    const globeMaterial = this.globe.globeMaterial();
    globeMaterial.color = new THREE.Color(this.colors.globe);
    globeMaterial.emissive = new THREE.Color(0x220811);
    globeMaterial.emissiveIntensity = 0.15;
    globeMaterial.shininess = 0.9;

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

    // Mouse interaction (drag to rotate)
    let isDragging = false;
    let previousMouseX = 0;

    this.mouseDownHandler = (e) => {
      isDragging = true;
      previousMouseX = e.clientX;
    };

    this.mouseUpHandler = () => {
      isDragging = false;
    };

    this.mouseMoveHandler = (e) => {
      if (isDragging && this.globe) {
        const deltaX = e.clientX - previousMouseX;
        this.globe.rotation.y += deltaX * 0.005;
        previousMouseX = e.clientX;
      }
    };

    this.renderer.domElement.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    window.addEventListener('mousemove', this.mouseMoveHandler);
  }

  animate() {
    if (this.isDestroyed) return;

    this.rafId = requestAnimationFrame(() => this.animate());

    // Auto rotate (slow)
    if (this.globe) {
      this.globe.rotation.y += 0.001;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
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

    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globe = null;
  }
}
