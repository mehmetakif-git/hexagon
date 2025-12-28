// src/CanvasFireworks.js
// Canvas-based 2D fireworks animation - based on original fireworks.html
// Transparent overlay for Event Modal

export class CanvasFireworks {
  constructor(container, options = {}) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.isRunning = false;
    this.mainLoop = null;

    // Options
    this.isOverlay = options.overlay || false;

    // Dimensions
    this.clientWidth = 0;
    this.clientHeight = 0;

    // State
    this.timer = 0;
    this.timedFirework = 1200; // Auto-launch every 1200ms (slower)
    this.limiterTicker = 0;
    this.fireworks = [];
    this.particles = [];
    this.sparks = [];
    this.typecount = 1; // Firework type (1-4)
    this.num = 1; // Color number
    this.colorchanger = 0;

    // Frame rate
    this.frameRate = 60.0;
    this.frameDelay = 1000.0 / this.frameRate;

    this.init();
  }

  init() {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fireworks-canvas';

    if (this.isOverlay) {
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '100';
    } else {
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
    }

    this.canvas.style.display = 'block';
    this.canvas.style.background = 'transparent';
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resize();

    // Resize handler
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);

    // Start animation
    this.start();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.clientWidth = rect.width || 800;
    this.clientHeight = rect.height || 600;
    this.canvas.width = this.clientWidth;
    this.canvas.height = this.clientHeight;
  }

  // Distance calculation - Pythagorean theorem
  distance(px1, py1, px2, py2) {
    const xdis = px1 - px2;
    const ydis = py1 - py2;
    return Math.sqrt((xdis * xdis) + (ydis * ydis));
  }

  // Get angle from point to point
  getAngle(posx1, posy1, posx2, posy2) {
    if (posx1 === posx2) {
      return posy1 > posy2 ? 90 : 270;
    }
    if (posy1 === posy2) {
      return posx1 > posx2 ? 0 : 180;
    }

    const xDist = posx1 - posx2;
    const yDist = posy1 - posy2;

    if (xDist === yDist) {
      return posx1 < posx2 ? 225 : 45;
    }
    if (-xDist === yDist) {
      return posx1 < posx2 ? 135 : 315;
    }

    return Math.atan2(posy2 - posy1, posx2 - posx1) * (180 / Math.PI) + 180;
  }

  // Random number generator
  random(min, max, round) {
    if (round === 'round') {
      return Math.round(Math.random() * (max - min) + min);
    }
    return Math.random() * (max - min) + min;
  }

  // Color selection - random colors for variety
  colors() {
    // Always pick a random color for each firework
    const colorList = [
      '#ff0000', // Red
      '#ff4444', // Light red
      '#ffff00', // Yellow
      '#ffdd00', // Gold
      '#00ff00', // Green
      '#00ff88', // Cyan-green
      '#00ffff', // Cyan
      '#0088ff', // Sky blue
      '#0000ff', // Blue
      '#8800ff', // Purple
      '#ff00ff', // Magenta
      '#ff0088', // Pink
      '#ff8800', // Orange
      '#ffac00', // Amber
      '#ffffff', // White
      '#ff6600'  // Deep orange
    ];
    return colorList[Math.floor(Math.random() * colorList.length)];
  }

  // Create a new firework
  createFirework(targetX, targetY) {
    const firework = {
      x: this.clientWidth / 2,
      y: this.clientHeight,
      sx: this.clientWidth / 2,
      sy: this.clientHeight,
      tx: targetX !== undefined ? targetX : this.random(100, this.clientWidth - 100),
      ty: targetY !== undefined ? targetY : this.random(50, this.clientHeight / 2),
      vx: 0,
      vy: 0,
      color: this.colors(),
      speed: this.random(600, 900),
      gravity: 1.2,
      ms: 0,
      s: 0,
      del: false,
      // Trail - store previous positions
      trail: [],
      trailLength: 15
    };

    firework.dis = this.distance(firework.sx, firework.sy, firework.tx, firework.ty);
    const angle = this.getAngle(firework.sx, firework.sy, firework.tx, firework.ty);
    firework.vx = Math.cos(angle * Math.PI / 180.0);
    firework.vy = Math.sin(angle * Math.PI / 180.0);

    this.fireworks.push(firework);
  }

  // Update firework
  updateFirework(fw, ms) {
    fw.ms = ms / 1000;

    // Store current position in trail
    fw.trail.push({ x: fw.x, y: fw.y });
    if (fw.trail.length > fw.trailLength) {
      fw.trail.shift();
    }

    if (fw.s > 2000 / ms) {
      // Explode - create particles
      this.createParticles(this.typecount, 30, fw.x, fw.y, fw.color);
      fw.del = true;
    } else {
      fw.speed *= 0.98;
      fw.x -= fw.vx * fw.speed * fw.ms;
      fw.y -= fw.vy * fw.speed * fw.ms - fw.gravity;
    }
    fw.s++;
  }

  // Draw firework with comet-like trail
  drawFirework(fw) {
    // Draw trail as a gradient line (comet tail effect)
    if (fw.trail.length > 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(fw.trail[0].x, fw.trail[0].y);

      for (let i = 1; i < fw.trail.length; i++) {
        this.ctx.lineTo(fw.trail[i].x, fw.trail[i].y);
      }
      this.ctx.lineTo(fw.x, fw.y);

      // Create gradient for trail
      const gradient = this.ctx.createLinearGradient(
        fw.trail[0].x, fw.trail[0].y,
        fw.x, fw.y
      );
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.5, fw.color + '88');
      gradient.addColorStop(1, fw.color);

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // Draw main firework head with glow
    this.ctx.beginPath();
    this.ctx.fillStyle = fw.color;
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = fw.color;
    this.ctx.arc(fw.x, fw.y, 2.5, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  // Create particles on explosion
  createParticles(type, count, pox, poy, color) {
    for (let i = 0; i < count; i++) {
      const angle = this.random(0, 360);
      const particle = {
        x: pox,
        y: poy,
        vx: Math.cos(angle * Math.PI / 180.0),
        vy: Math.sin(angle * Math.PI / 180.0),
        speed: this.random(150, 400),
        gravity: 0.8,
        wind: 0,
        type: type,
        opacity: 1,
        s: 0,
        scale: 1,
        color: color,
        ms: 0,
        // Trail for particles - longer and more visible
        trail: [],
        trailLength: 10
      };
      this.particles.push(particle);
    }
  }

  // Update particle
  updateParticle(p, ms) {
    p.ms = ms / 1000;

    // Store trail position
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > p.trailLength) {
      p.trail.shift();
    }

    // Fade out
    if (p.s > 900 / ms) {
      if (p.opacity - 0.05 < 0) {
        p.opacity = 0;
      } else {
        p.opacity -= 0.05;
      }
    }

    // Different behaviors based on type
    if (p.type === 1) {
      // Standard dots
      p.speed *= 0.96;
      p.x -= p.vx * p.speed * p.ms + p.wind;
      p.y -= p.vy * p.speed * p.ms - p.gravity;
    } else if (p.type === 2) {
      // Scaling squares
      if (p.s < 800 / ms) {
        p.scale += 0.1;
      } else {
        p.scale -= 0.2;
      }
      p.speed *= 0.96;
      p.x -= p.vx * p.speed * p.ms + p.wind;
      p.y -= p.vy * p.speed * p.ms - p.gravity;
    } else if (p.type === 3) {
      // Line trails
      p.speed *= 0.95;
      p.x -= p.vx * p.speed * p.ms + p.wind;
      p.y -= p.vy * p.speed * p.ms;
    } else if (p.type === 4) {
      // Sparkler with sparks
      p.speed *= 0.96;
      p.x -= p.vx * p.speed * p.ms + p.wind;
      p.y -= p.vy * p.speed * p.ms - p.gravity;

      // Create sparks
      const spark = {
        x: p.x,
        y: p.y,
        tx: p.x,
        ty: p.y,
        vx: Math.cos(this.random(0, 360, 'round') * (Math.PI / 180)) * 1.05,
        vy: Math.sin(this.random(0, 360, 'round') * (Math.PI / 180)) * 1.05,
        color: p.color,
        limit: this.random(4, 10, 'round')
      };
      this.sparks.push(spark);
    }

    p.s++;
  }

  // Draw particle with trail
  drawParticle(p) {
    this.ctx.save();

    // Draw trail first (fading tail) - more visible
    if (p.trail.length > 1) {
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const trailOpacity = (i / p.trail.length) * p.opacity * 0.85;
        const trailSize = (i / p.trail.length) * 1.8 + 0.3;

        this.ctx.beginPath();
        this.ctx.globalAlpha = trailOpacity;
        this.ctx.fillStyle = p.color;
        this.ctx.arc(t.x, t.y, trailSize, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    }

    this.ctx.globalAlpha = p.opacity;
    this.ctx.fillStyle = p.color;
    this.ctx.strokeStyle = p.color;

    if (p.type === 1) {
      // Dots with glow
      this.ctx.beginPath();
      this.ctx.shadowBlur = 3;
      this.ctx.shadowColor = p.color;
      this.ctx.arc(p.x, p.y, 1.5, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    } else if (p.type === 2) {
      // Scaling squares
      this.ctx.translate(p.x, p.y);
      this.ctx.scale(p.scale, p.scale);
      this.ctx.beginPath();
      this.ctx.fillRect(-0.5, -0.5, 1, 1);
    } else if (p.type === 3) {
      // Line trails (longer)
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(p.x - p.vx * 15, p.y - p.vy * 15);
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    } else if (p.type === 4) {
      // Sparkler dots with glow
      this.ctx.beginPath();
      this.ctx.shadowBlur = 4;
      this.ctx.shadowColor = p.color;
      this.ctx.arc(p.x, p.y, 1.5, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    } else {
      // Default
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 1, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  // Update spark
  updateSpark(spark) {
    spark.tx += spark.vx;
    spark.ty += spark.vy;
    spark.limit--;
  }

  // Draw spark
  drawSpark(spark) {
    this.ctx.beginPath();
    this.ctx.moveTo(spark.x, spark.y);
    this.ctx.lineTo(spark.tx, spark.ty);
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = spark.color;
    this.ctx.stroke();
    this.ctx.closePath();
  }

  // Main update loop
  update() {
    // Clear canvas - transparent for overlay mode
    if (this.isOverlay) {
      this.ctx.clearRect(0, 0, this.clientWidth, this.clientHeight);
    } else {
      // Semi-transparent black for trail effect
      this.ctx.globalAlpha = 1;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      this.ctx.fillRect(0, 0, this.clientWidth, this.clientHeight);
    }

    // Auto-launch fireworks
    if (this.timer > this.limiterTicker) {
      // Cycle through firework types
      this.typecount = (this.typecount % 4) + 1;
      this.createFirework();
      this.limiterTicker = this.timer + (this.timedFirework / this.frameDelay);
    }

    // Update and draw fireworks
    let i = this.fireworks.length;
    while (i--) {
      if (this.fireworks[i].del) {
        this.fireworks.splice(i, 1);
      } else {
        this.updateFirework(this.fireworks[i], this.frameDelay);
        this.drawFirework(this.fireworks[i]);
      }
    }

    // Update and draw particles
    i = this.particles.length;
    while (i--) {
      if (this.particles[i].opacity === 0) {
        this.particles.splice(i, 1);
      } else {
        this.updateParticle(this.particles[i], this.frameDelay);
        this.drawParticle(this.particles[i]);
      }
    }

    // Update and draw sparks
    i = this.sparks.length;
    while (i--) {
      if (this.sparks[i].limit < 0) {
        this.sparks.splice(i, 1);
      } else {
        this.updateSpark(this.sparks[i]);
        this.drawSpark(this.sparks[i]);
      }
    }

    this.timer++;
  }

  start() {
    this.isRunning = true;
    this.mainLoop = setInterval(() => this.update(), this.frameDelay);
  }

  stop() {
    this.isRunning = false;
    if (this.mainLoop) {
      clearInterval(this.mainLoop);
      this.mainLoop = null;
    }
  }

  destroy() {
    this.stop();

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    this.fireworks = [];
    this.particles = [];
    this.sparks = [];
    this.canvas = null;
    this.ctx = null;
  }
}

export default CanvasFireworks;
