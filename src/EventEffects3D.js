// src/EventEffects3D.js
// Lightweight 2D Canvas particle effects - no Three.js 3D objects

export class EventEffects3D {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.glows = [];
    this.animationId = null;
    this.width = 0;
    this.height = 0;
    this.currentCategory = null;

    this.init();
  }

  init() {
    // Create 2D Canvas - much lighter than Three.js
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    `;
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resize();

    this.boundResize = () => this.resize();
    window.addEventListener('resize', this.boundResize);

    this.animate();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setCategory(category) {
    this.currentCategory = category;
    this.particles = [];
    this.glows = [];

    // Category-specific configurations
    const configs = {
      'live-sports': { color: '#FF8106', intensity: 1, pulse: true },
      'public': { color: '#FF8106', intensity: 1.2, firework: true },
      'exhibitions': { color: '#FFD700', intensity: 0.8, spotlight: true },
      'corporate': { color: '#FF8106', intensity: 0.7, geometric: true },
      'festivals': { color: '#FF8106', intensity: 1.1, confetti: true }
    };

    const config = configs[category] || configs['live-sports'];
    this.createEffects(config);
  }

  createEffects(config) {
    // Corner glow positions
    const corners = [
      { x: 50, y: 50 },
      { x: this.width - 50, y: 50 },
      { x: 50, y: this.height - 50 },
      { x: this.width - 50, y: this.height - 50 }
    ];

    // Add corner glows
    corners.forEach((corner, i) => {
      this.glows.push({
        x: corner.x,
        y: corner.y,
        radius: 35 + Math.random() * 15,
        color: config.color,
        alpha: 0.35 * config.intensity,
        pulseSpeed: 0.015 + i * 0.003,
        pulsePhase: i * Math.PI / 2,
        type: 'glow'
      });

      // Floating particles around corners
      for (let j = 0; j < 6; j++) {
        this.particles.push({
          x: corner.x + (Math.random() - 0.5) * 60,
          y: corner.y + (Math.random() - 0.5) * 60,
          radius: 1.5 + Math.random() * 2.5,
          color: config.color,
          alpha: 0.4 + Math.random() * 0.4,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          cornerX: corner.x,
          cornerY: corner.y,
          type: 'float'
        });
      }
    });

    // Add edge glow lines
    this.glows.push({
      type: 'edge-top',
      color: config.color,
      alpha: 0.15 * config.intensity
    });
    this.glows.push({
      type: 'edge-bottom',
      color: config.color,
      alpha: 0.1 * config.intensity
    });

    // Category-specific extras
    if (config.confetti) {
      this.addConfetti(config);
    }
    if (config.firework) {
      this.addFireworkParticles(config);
    }
  }

  addConfetti(config) {
    const colors = ['#FF8106', '#FFD700', '#FF6B35', '#FFA500'];

    for (let i = 0; i < 25; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: -20 - Math.random() * 100,
        width: 4 + Math.random() * 4,
        height: 2 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.6 + Math.random() * 0.4,
        vy: 0.5 + Math.random() * 1,
        vx: (Math.random() - 0.5) * 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        swing: Math.random() * Math.PI * 2,
        type: 'confetti'
      });
    }
  }

  addFireworkParticles(config) {
    // Subtle sparkle particles in corners
    const corners = [
      { x: 60, y: 60 },
      { x: this.width - 60, y: 60 }
    ];

    corners.forEach(corner => {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 20 + Math.random() * 30;
        this.particles.push({
          x: corner.x + Math.cos(angle) * dist,
          y: corner.y + Math.sin(angle) * dist,
          radius: 1 + Math.random() * 1.5,
          color: config.color,
          alpha: 0,
          maxAlpha: 0.6 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          speed: 0.05 + Math.random() * 0.03,
          type: 'sparkle'
        });
      }
    });
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    const time = performance.now() / 1000;

    // Draw edge glows
    this.drawEdgeGlows(time);

    // Draw corner glows
    this.glows.forEach(glow => {
      if (glow.type === 'glow') {
        this.drawGlow(glow, time);
      }
    });

    // Update and draw particles
    this.particles.forEach(p => {
      if (p.type === 'float') {
        this.updateFloatParticle(p, time);
        this.drawParticle(p, time);
      } else if (p.type === 'confetti') {
        this.updateConfetti(p, time);
        this.drawConfetti(p);
      } else if (p.type === 'sparkle') {
        this.updateSparkle(p, time);
        this.drawSparkle(p);
      }
    });
  }

  drawEdgeGlows(time) {
    this.glows.forEach(glow => {
      if (glow.type === 'edge-top') {
        const pulse = 0.8 + Math.sin(time * 1.5) * 0.2;
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, this.hexToRgba(glow.color, glow.alpha * pulse));
        gradient.addColorStop(0.5, this.hexToRgba(glow.color, glow.alpha * 1.5 * pulse));
        gradient.addColorStop(0.7, this.hexToRgba(glow.color, glow.alpha * pulse));
        gradient.addColorStop(1, 'transparent');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, 3);
      } else if (glow.type === 'edge-bottom') {
        const pulse = 0.7 + Math.sin(time * 1.2 + 1) * 0.3;
        const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.4, this.hexToRgba(glow.color, glow.alpha * pulse));
        gradient.addColorStop(0.6, this.hexToRgba(glow.color, glow.alpha * pulse));
        gradient.addColorStop(1, 'transparent');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, this.height - 2, this.width, 2);
      }
    });
  }

  drawGlow(glow, time) {
    const pulse = 0.7 + Math.sin(time * 2 + glow.pulsePhase) * 0.3;
    const radius = glow.radius * pulse;

    const gradient = this.ctx.createRadialGradient(
      glow.x, glow.y, 0,
      glow.x, glow.y, radius
    );

    gradient.addColorStop(0, this.hexToRgba(glow.color, glow.alpha * pulse));
    gradient.addColorStop(0.4, this.hexToRgba(glow.color, glow.alpha * 0.5 * pulse));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(glow.x, glow.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  updateFloatParticle(p, time) {
    p.x += p.vx;
    p.y += p.vy;

    // Bounce within corner area
    const maxDist = 40;
    if (Math.abs(p.x - p.cornerX) > maxDist) p.vx *= -1;
    if (Math.abs(p.y - p.cornerY) > maxDist) p.vy *= -1;
  }

  drawParticle(p, time) {
    const twinkle = 0.6 + Math.sin(time * 4 + p.x * 0.1) * 0.4;

    this.ctx.fillStyle = this.hexToRgba(p.color, p.alpha * twinkle);
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  updateConfetti(p, time) {
    p.y += p.vy;
    p.x += p.vx + Math.sin(time * 2 + p.swing) * 0.3;
    p.rotation += p.rotationSpeed;

    // Reset when below view
    if (p.y > this.height + 20) {
      p.y = -20;
      p.x = Math.random() * this.width;
    }
  }

  drawConfetti(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.rotation);
    this.ctx.fillStyle = this.hexToRgba(p.color, p.alpha);
    this.ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
    this.ctx.restore();
  }

  updateSparkle(p, time) {
    p.alpha = Math.abs(Math.sin(time * p.speed * 10 + p.phase)) * p.maxAlpha;
  }

  drawSparkle(p) {
    if (p.alpha < 0.1) return;

    this.ctx.fillStyle = this.hexToRgba(p.color, p.alpha);
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.boundResize);

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.particles = [];
    this.glows = [];
    this.canvas = null;
    this.ctx = null;
  }
}

export default EventEffects3D;
