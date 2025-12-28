// src/HolographicCard.js
// 3D Holographic Profile Cards - Inline Version (No Modal)

const clamp = (v, min = 0, max = 100) => Math.min(Math.max(v, min), max);
const round = (v, precision = 3) => parseFloat(v.toFixed(precision));
const adjust = (v, fMin, fMax, tMin, tMax) => round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

// TiltEngine - Handles 3D tilt animation with smooth interpolation
class TiltEngine {
  constructor(shell, wrap) {
    this.shell = shell;
    this.wrap = wrap;
    this.rafId = null;
    this.running = false;
    this.lastTs = 0;

    this.currentX = 0;
    this.currentY = 0;
    this.targetX = 0;
    this.targetY = 0;

    this.DEFAULT_TAU = 0.14;
  }

  setVarsFromXY(x, y) {
    if (!this.shell || !this.wrap) return;

    const width = this.shell.clientWidth || 1;
    const height = this.shell.clientHeight || 1;

    const percentX = clamp((100 / width) * x);
    const percentY = clamp((100 / height) * y);

    const centerX = percentX - 50;
    const centerY = percentY - 50;

    const properties = {
      '--pointer-x': `${percentX}%`,
      '--pointer-y': `${percentY}%`,
      '--background-x': `${adjust(percentX, 0, 100, 35, 65)}%`,
      '--background-y': `${adjust(percentY, 0, 100, 35, 65)}%`,
      '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
      '--pointer-from-top': `${percentY / 100}`,
      '--pointer-from-left': `${percentX / 100}`,
      '--rotate-x': `${round(-(centerX / 6))}deg`,
      '--rotate-y': `${round(centerY / 5)}deg`
    };

    for (const [k, v] of Object.entries(properties)) {
      this.wrap.style.setProperty(k, v);
    }
  }

  step(ts) {
    if (!this.running) return;
    if (this.lastTs === 0) this.lastTs = ts;
    const dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;

    const k = 1 - Math.exp(-dt / this.DEFAULT_TAU);

    this.currentX += (this.targetX - this.currentX) * k;
    this.currentY += (this.targetY - this.currentY) * k;

    this.setVarsFromXY(this.currentX, this.currentY);

    const stillFar = Math.abs(this.targetX - this.currentX) > 0.05 ||
                     Math.abs(this.targetY - this.currentY) > 0.05;

    if (stillFar || document.hasFocus()) {
      this.rafId = requestAnimationFrame((ts) => this.step(ts));
    } else {
      this.running = false;
      this.lastTs = 0;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTs = 0;
    this.rafId = requestAnimationFrame((ts) => this.step(ts));
  }

  setImmediate(x, y) {
    this.currentX = x;
    this.currentY = y;
    this.setVarsFromXY(this.currentX, this.currentY);
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
    this.start();
  }

  toCenter() {
    if (!this.shell) return;
    this.setTarget(this.shell.clientWidth / 2, this.shell.clientHeight / 2);
  }

  getCurrent() {
    return { x: this.currentX, y: this.currentY, tx: this.targetX, ty: this.targetY };
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.running = false;
    this.lastTs = 0;
  }
}


export class HolographicCard {
  constructor() {
    this.tiltEngines = new Map();
    this.leaveRafs = new Map();

    // Team member data - 9 members across 3 pages
    this.teamData = [
      // Page 1
      {
        id: 'alihan',
        name: 'Alihan Tokmak',
        title: 'Managing Partner',
        avatar: '/assets/team/alihan.png',
        email: 'alihan@hexagon.qa',
        page: 1
      },
      {
        id: 'khalifa',
        name: 'Khalifa Al Sada',
        title: 'Partner',
        avatar: '/assets/team/khalifa.png',
        email: 'khalifa@hexagon.qa',
        page: 1
      },
      {
        id: 'hussain',
        name: 'Hussain Al Sada',
        title: 'Partner',
        avatar: '/assets/team/hussain.png',
        email: 'hussain@hexagon.qa',
        page: 1
      },
      // Page 2
      {
        id: 'edrin',
        name: 'Edrin Latorre',
        title: 'Senior Operations Manager',
        avatar: '/assets/team/edrin.png',
        email: 'edrin@hexagon.qa',
        page: 2
      },
      {
        id: 'karim',
        name: 'Karim Tawfik',
        title: 'Senior Projects Manager',
        avatar: '/assets/team/karim.png',
        email: 'karim@hexagon.qa',
        page: 2
      },
      {
        id: 'gulben',
        name: 'Gulben Gunduz',
        title: 'Business Operations Director',
        avatar: '/assets/team/gulben.png',
        email: 'gulben@hexagon.qa',
        page: 2
      },
      // Page 3
      {
        id: 'nicole',
        name: 'Nicole Bautista',
        title: 'Admin and DMC Executive',
        avatar: '/assets/team/nicole.png',
        email: 'nicole@hexagon.qa',
        page: 3
      },
      {
        id: 'omer',
        name: 'Omer Aybey',
        title: '3D Visualizer',
        avatar: '/assets/team/omer.png',
        email: 'omer@hexagon.qa',
        page: 3
      },
      {
        id: 'ahmed',
        name: 'Ahmed Nasser',
        title: 'Senior Designer',
        avatar: '/assets/team/ahmed.png',
        email: 'ahmed@hexagon.qa',
        page: 3
      }
    ];

    this.init();
  }

  init() {
    this.renderCards();
    this.bindTiltEvents();
  }

  createCardHTML(member) {
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=400&background=FF8106&color=fff&bold=true`;

    return `
      <div class="holo-card-wrapper" data-member="${member.id}">
        <div class="holo-behind"></div>
        <div class="holo-card-shell">
          <div class="holo-card">
            <div class="holo-inside">
              <div class="holo-shine"></div>
              <div class="holo-glare"></div>

              <!-- Avatar layer -->
              <div class="holo-content holo-avatar-content">
                <img class="holo-avatar" src="${member.avatar}" alt="${member.name}"
                     onerror="this.src='${fallbackAvatar}'" loading="lazy">
              </div>

              <!-- Info layer -->
              <div class="holo-content">
                <div class="holo-details">
                  <h4 class="holo-name">${member.name}</h4>
                  <p class="holo-title">${member.title}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderCards() {
    // Render cards for each page
    for (let page = 1; page <= 3; page++) {
      const container = document.getElementById(`team-page-${page}`);
      if (!container) continue;

      const pageMembers = this.teamData.filter(m => m.page === page);
      container.innerHTML = pageMembers.map(m => this.createCardHTML(m)).join('');
    }
  }

  bindTiltEvents() {
    const wrappers = document.querySelectorAll('.holo-card-wrapper');

    wrappers.forEach(wrapper => {
      const shell = wrapper.querySelector('.holo-card-shell');
      const memberId = wrapper.dataset.member;

      if (!shell) return;

      const tiltEngine = new TiltEngine(shell, wrapper);
      this.tiltEngines.set(memberId, tiltEngine);

      // Initialize at center
      tiltEngine.setImmediate(shell.clientWidth / 2, shell.clientHeight / 2);

      const handlePointerMove = (e) => {
        const rect = shell.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        tiltEngine.setTarget(x, y);
      };

      const handlePointerEnter = (e) => {
        shell.classList.add('active');

        const rect = shell.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        tiltEngine.setTarget(x, y);
      };

      const handlePointerLeave = () => {
        tiltEngine.toCenter();

        const checkSettle = () => {
          const { x, y, tx, ty } = tiltEngine.getCurrent();
          const settled = Math.hypot(tx - x, ty - y) < 0.6;
          if (settled) {
            shell.classList.remove('active');
            this.leaveRafs.delete(memberId);
          } else {
            this.leaveRafs.set(memberId, requestAnimationFrame(checkSettle));
          }
        };

        const existingRaf = this.leaveRafs.get(memberId);
        if (existingRaf) cancelAnimationFrame(existingRaf);
        this.leaveRafs.set(memberId, requestAnimationFrame(checkSettle));
      };

      shell.addEventListener('pointerenter', handlePointerEnter);
      shell.addEventListener('pointermove', handlePointerMove);
      shell.addEventListener('pointerleave', handlePointerLeave);
    });
  }

  destroy() {
    this.tiltEngines.forEach(engine => engine.destroy());
    this.tiltEngines.clear();

    this.leaveRafs.forEach(raf => cancelAnimationFrame(raf));
    this.leaveRafs.clear();
  }
}

export default HolographicCard;
