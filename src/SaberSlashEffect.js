import * as THREE from 'three';

/**
 * SaberSlashEffect - Lightsaber kesme efekti
 * Hexagon mesh kartlarla kesiştiğinde kıvılcım ve glow efektleri oluşturur
 */
export class SaberSlashEffect {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Kart elementleri
    this.cards = document.querySelectorAll('.hexagon-card');

    // Parçacık sistemi
    this.maxParticles = 500;
    this.particleIndex = 0;
    this.particles = [];

    // Aktif kesişimler (debounce için)
    this.activeIntersections = new Map();
    this.intersectionCooldown = 50; // ms

    // Renk paleti
    this.colors = {
      core: new THREE.Color(0xFFFFFF),    // Beyaz çekirdek
      bright: new THREE.Color(0xFFAA00),   // Parlak sarı
      primary: new THREE.Color(0xFF8106),  // Ana turuncu
      dim: new THREE.Color(0xFF4400),      // Koyu turuncu
      ember: new THREE.Color(0x882200)     // Kırmızı kor
    };

    this.initParticleSystem();
  }

  /**
   * GPU-based parçacık sistemi oluştur
   */
  initParticleSystem() {
    // Parçacık geometry
    const geometry = new THREE.BufferGeometry();

    // Pozisyonlar
    const positions = new Float32Array(this.maxParticles * 3);
    // Hızlar (velocity)
    const velocities = new Float32Array(this.maxParticles * 3);
    // Renkler
    const colors = new Float32Array(this.maxParticles * 3);
    // Boyutlar
    const sizes = new Float32Array(this.maxParticles);
    // Yaşam süreleri
    const lifetimes = new Float32Array(this.maxParticles);
    // Başlangıç yaşam süreleri (renk geçişi için)
    const maxLifetimes = new Float32Array(this.maxParticles);

    // Başlangıç değerleri
    for (let i = 0; i < this.maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = -1000; // Görünmez konumda başla

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = 0;

      sizes[i] = 0;
      lifetimes[i] = 0;
      maxLifetimes[i] = 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('maxLifetime', new THREE.BufferAttribute(maxLifetimes, 1));

    // Shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute vec3 color;
        attribute float size;
        attribute float lifetime;
        attribute float maxLifetime;

        varying vec3 vColor;
        varying float vLifeRatio;

        void main() {
          vColor = color;
          vLifeRatio = lifetime / maxLifetime;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLifeRatio;

        void main() {
          // Yuvarlak parçacık
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Merkeze doğru parlama
          float glow = 1.0 - (dist * 2.0);
          glow = pow(glow, 2.0);

          // Yaşam süresine göre solma
          float alpha = vLifeRatio * glow;

          // Renk: yaşam süresine göre beyaz -> sarı -> turuncu -> kırmızı
          vec3 finalColor = vColor;
          if (vLifeRatio > 0.7) {
            // Beyaz çekirdek
            finalColor = mix(vColor, vec3(1.0, 1.0, 1.0), (vLifeRatio - 0.7) / 0.3);
          }

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleGeometry = geometry;
    this.particleMaterial = material;
    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.frustumCulled = false;

    this.scene.add(this.particleSystem);

    // Parçacık veri dizisi
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: 1,
        size: 0
      });
    }
  }

  /**
   * 3D dünya koordinatını 2D ekran koordinatına çevir
   */
  worldToScreen(position) {
    const vector = position.clone();
    vector.project(this.camera);

    const widthHalf = this.renderer.domElement.clientWidth / 2;
    const heightHalf = this.renderer.domElement.clientHeight / 2;

    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf,
      z: vector.z // Kamera arkasında mı kontrolü için
    };
  }

  /**
   * 2D ekran koordinatını 3D dünya koordinatına çevir (z düzlemi üzerinde)
   */
  screenToWorld(screenX, screenY, zPlane = 0) {
    const vector = new THREE.Vector3(
      (screenX / this.renderer.domElement.clientWidth) * 2 - 1,
      -(screenY / this.renderer.domElement.clientHeight) * 2 + 1,
      0.5
    );

    vector.unproject(this.camera);

    const dir = vector.sub(this.camera.position).normalize();
    const distance = (zPlane - this.camera.position.z) / dir.z;

    return this.camera.position.clone().add(dir.multiplyScalar(distance));
  }

  /**
   * Hexagon mesh'in dünya koordinatlarındaki noktalarını al
   */
  getMeshPoints(hexagonGroup) {
    const points = [];
    const meshGroup = hexagonGroup.userData.meshGroup;

    if (!meshGroup) return points;

    meshGroup.children.forEach(child => {
      if (child.geometry && child.geometry.attributes.position) {
        const position = child.geometry.attributes.position;
        const matrix = child.matrixWorld;

        // Performans için her 30. vertex'i al
        const step = Math.max(1, Math.floor(position.count / 50));
        for (let i = 0; i < position.count; i += step) {
          const vertex = new THREE.Vector3(
            position.getX(i),
            position.getY(i),
            position.getZ(i)
          );
          vertex.applyMatrix4(matrix);
          points.push(vertex);
        }
      }
    });

    return points;
  }

  /**
   * Hexagon'un bounding box kenarlarını al
   */
  getMeshEdgePoints(hexagonGroup) {
    const points = [];
    const meshGroup = hexagonGroup.userData.meshGroup;

    if (!meshGroup) return points;

    // Tüm mesh'lerin combined bounding box'ını hesapla
    const box = new THREE.Box3();
    meshGroup.children.forEach(child => {
      if (child.geometry) {
        child.geometry.computeBoundingBox();
        const childBox = child.geometry.boundingBox.clone();
        childBox.applyMatrix4(child.matrixWorld);
        box.union(childBox);
      }
    });

    // Bounding box köşelerini ve kenar noktalarını ekle
    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];

    // Kenar ortalarını da ekle
    const center = new THREE.Vector3();
    box.getCenter(center);

    points.push(...corners);
    points.push(new THREE.Vector3(box.min.x, center.y, center.z));
    points.push(new THREE.Vector3(box.max.x, center.y, center.z));
    points.push(new THREE.Vector3(center.x, box.min.y, center.z));
    points.push(new THREE.Vector3(center.x, box.max.y, center.z));
    points.push(center);

    return points;
  }

  /**
   * Kesişim kontrolü yap
   */
  checkIntersections(hexagonGroup) {
    const meshPoints = this.getMeshPoints(hexagonGroup);
    const edgePoints = this.getMeshEdgePoints(hexagonGroup);
    const allPoints = [...meshPoints, ...edgePoints];

    const now = Date.now();

    this.cards.forEach((card, cardIndex) => {
      const rect = card.getBoundingClientRect();
      let hasIntersection = false;
      let closestEdge = null;
      let closestPosition = 50;
      let closestPoint = null;
      let minEdgeDist = Infinity;

      allPoints.forEach(point => {
        const screen = this.worldToScreen(point);

        // Kamera arkasındaki noktaları atla
        if (screen.z > 1) return;

        // Kart sınırları içinde mi?
        const padding = 30; // Kenar hassasiyeti için padding
        if (screen.x >= rect.left - padding && screen.x <= rect.right + padding &&
            screen.y >= rect.top - padding && screen.y <= rect.bottom + padding) {

          // Hangi kenara en yakın?
          const distLeft = Math.abs(screen.x - rect.left);
          const distRight = Math.abs(screen.x - rect.right);
          const distTop = Math.abs(screen.y - rect.top);
          const distBottom = Math.abs(screen.y - rect.bottom);

          const minDist = Math.min(distLeft, distRight, distTop, distBottom);

          // Kenar yakınında mı? (padding içinde)
          if (minDist < padding && minDist < minEdgeDist) {
            hasIntersection = true;
            minEdgeDist = minDist;
            closestPoint = point.clone();

            if (minDist === distLeft) {
              closestEdge = 'left';
              closestPosition = ((screen.y - rect.top) / rect.height) * 100;
            } else if (minDist === distRight) {
              closestEdge = 'right';
              closestPosition = ((screen.y - rect.top) / rect.height) * 100;
            } else if (minDist === distTop) {
              closestEdge = 'top';
              closestPosition = ((screen.x - rect.left) / rect.width) * 100;
            } else {
              closestEdge = 'bottom';
              closestPosition = ((screen.x - rect.left) / rect.width) * 100;
            }
          }
        }
      });

      if (hasIntersection && closestEdge) {
        // Debounce kontrolü
        const key = `${cardIndex}-${closestEdge}`;
        const lastTime = this.activeIntersections.get(key) || 0;

        if (now - lastTime > this.intersectionCooldown) {
          this.activeIntersections.set(key, now);
          this.applyEffect(card, closestEdge, closestPosition, closestPoint);
        }

        // CSS class'ı aktif tut
        card.classList.add('saber-active');
        card.style.setProperty('--slash-edge', closestEdge);
        card.style.setProperty('--slash-position', `${closestPosition}%`);
      } else {
        card.classList.remove('saber-active');
      }
    });
  }

  /**
   * Parçacık spawn et
   */
  spawnParticles(worldPosition, direction, count = 15) {
    for (let i = 0; i < count; i++) {
      const particle = this.particles[this.particleIndex];
      this.particleIndex = (this.particleIndex + 1) % this.maxParticles;

      particle.active = true;
      particle.position.copy(worldPosition);

      // Rastgele yön (direction etrafında)
      const spread = 0.8;
      particle.velocity.set(
        direction.x + (Math.random() - 0.5) * spread,
        direction.y + (Math.random() - 0.5) * spread + 0.3, // Yukarı bias
        direction.z + (Math.random() - 0.5) * spread
      );
      particle.velocity.multiplyScalar(2 + Math.random() * 3);

      particle.lifetime = 0.5 + Math.random() * 0.8;
      particle.maxLifetime = particle.lifetime;
      particle.size = 3 + Math.random() * 5;

      // Buffer'a yaz
      const positions = this.particleGeometry.attributes.position.array;
      const velocities = this.particleGeometry.attributes.velocity.array;
      const sizes = this.particleGeometry.attributes.size.array;
      const lifetimes = this.particleGeometry.attributes.lifetime.array;
      const maxLifetimes = this.particleGeometry.attributes.maxLifetime.array;
      const colors = this.particleGeometry.attributes.color.array;

      const idx = this.particles.indexOf(particle);
      positions[idx * 3] = particle.position.x;
      positions[idx * 3 + 1] = particle.position.y;
      positions[idx * 3 + 2] = particle.position.z;

      velocities[idx * 3] = particle.velocity.x;
      velocities[idx * 3 + 1] = particle.velocity.y;
      velocities[idx * 3 + 2] = particle.velocity.z;

      sizes[idx] = particle.size;
      lifetimes[idx] = particle.lifetime;
      maxLifetimes[idx] = particle.maxLifetime;

      // Başlangıç rengi (turuncu)
      colors[idx * 3] = 1.0;
      colors[idx * 3 + 1] = 0.5 + Math.random() * 0.3;
      colors[idx * 3 + 2] = 0.0;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.velocity.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
    this.particleGeometry.attributes.lifetime.needsUpdate = true;
    this.particleGeometry.attributes.maxLifetime.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  /**
   * Efekt uygula
   */
  applyEffect(card, edge, position, worldPoint) {
    // Parçacık yönü (kenardan dışarı)
    const dir = new THREE.Vector3(
      edge === 'left' ? -1 : edge === 'right' ? 1 : 0,
      edge === 'top' ? -1 : edge === 'bottom' ? 1 : 0,
      0.5
    );

    // Parçacık spawn
    this.spawnParticles(worldPoint, dir, 10 + Math.floor(Math.random() * 10));
  }

  /**
   * Parçacıkları güncelle
   */
  updateParticles(deltaTime) {
    const positions = this.particleGeometry.attributes.position.array;
    const velocities = this.particleGeometry.attributes.velocity.array;
    const lifetimes = this.particleGeometry.attributes.lifetime.array;
    const sizes = this.particleGeometry.attributes.size.array;
    const colors = this.particleGeometry.attributes.color.array;

    const gravity = -9.8;
    const drag = 0.98;

    this.particles.forEach((particle, i) => {
      if (!particle.active) return;

      // Yaşam süresi azalt
      particle.lifetime -= deltaTime;

      if (particle.lifetime <= 0) {
        particle.active = false;
        positions[i * 3 + 2] = -1000; // Görünmez yap
        sizes[i] = 0;
      } else {
        // Fizik güncelle
        particle.velocity.y += gravity * deltaTime;
        particle.velocity.multiplyScalar(drag);

        particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

        // Buffer güncelle
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;

        velocities[i * 3] = particle.velocity.x;
        velocities[i * 3 + 1] = particle.velocity.y;
        velocities[i * 3 + 2] = particle.velocity.z;

        lifetimes[i] = particle.lifetime;

        // Yaşam oranına göre boyut küçült
        const lifeRatio = particle.lifetime / particle.maxLifetime;
        sizes[i] = particle.size * lifeRatio;

        // Renk geçişi: turuncu -> kırmızı -> koyu kırmızı
        if (lifeRatio > 0.6) {
          colors[i * 3] = 1.0;
          colors[i * 3 + 1] = 0.5 + (lifeRatio - 0.6) * 1.25;
          colors[i * 3 + 2] = 0.0;
        } else if (lifeRatio > 0.3) {
          colors[i * 3] = 1.0;
          colors[i * 3 + 1] = 0.2 + (lifeRatio - 0.3) * 1.0;
          colors[i * 3 + 2] = 0.0;
        } else {
          colors[i * 3] = 0.5 + lifeRatio * 1.67;
          colors[i * 3 + 1] = lifeRatio * 0.67;
          colors[i * 3 + 2] = 0.0;
        }
      }
    });

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.velocity.needsUpdate = true;
    this.particleGeometry.attributes.lifetime.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  /**
   * Her frame'de çağrılacak update fonksiyonu
   */
  update(deltaTime, hexagonGroup) {
    if (!hexagonGroup) return;

    // Matrix'leri güncelle
    hexagonGroup.updateMatrixWorld(true);

    // Kesişim kontrol et
    this.checkIntersections(hexagonGroup);

    // Parçacıkları güncelle
    this.updateParticles(deltaTime);

    // Shader time güncelle
    this.particleMaterial.uniforms.time.value += deltaTime;
  }

  /**
   * Cleanup
   */
  dispose() {
    this.scene.remove(this.particleSystem);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.particles = [];
  }
}
