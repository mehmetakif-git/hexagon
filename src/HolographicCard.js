// src/HolographicCard.js
// 3D Holographic Profile Card - Converted from React to Vanilla JS

const ANIMATION_CONFIG = {
  INITIAL_DURATION: 1200,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60,
  ENTER_TRANSITION_MS: 180
};

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
    this.INITIAL_TAU = 0.6;
    this.initialUntil = 0;
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
      '--rotate-x': `${round(-(centerX / 5))}deg`,
      '--rotate-y': `${round(centerY / 4)}deg`
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

    const tau = ts < this.initialUntil ? this.INITIAL_TAU : this.DEFAULT_TAU;
    const k = 1 - Math.exp(-dt / tau);

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

  beginInitial(durationMs) {
    this.initialUntil = performance.now() + durationMs;
    this.start();
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
    this.modal = null;
    this.tiltEngine = null;
    this.isOpen = false;
    this.currentMember = null;
    this.enterTimer = null;
    this.leaveRaf = null;

    // Team member data
    this.teamData = {
      'mohamed': {
        name: 'Mohamed Khalifa Al Sada',
        title: 'Chairman & Founding Partner',
        handle: 'mohamed.alsada',
        status: 'Doha, Qatar',
        avatar: '/assets/team/mohamed.jpg',
        contactText: 'Contact',
        email: 'mohamed@hexagon.qa'
      },
      'ali': {
        name: 'Ali Boray Dundar',
        title: 'Founding Partner',
        handle: 'ali.dundar',
        status: 'Istanbul, Turkey',
        avatar: '/assets/team/ali.jpg',
        contactText: 'Contact',
        email: 'ali@hexagon.qa'
      },
      'markus': {
        name: 'Markus Katterle',
        title: 'Founding Partner',
        handle: 'markus.katterle',
        status: 'London, UK',
        avatar: '/assets/team/markus.jpg',
        contactText: 'Contact',
        email: 'markus@hexagon.qa'
      },
      'alihan': {
        name: 'Alihan Tokmak',
        title: 'Managing Partner',
        handle: 'alihan.tokmak',
        status: 'Doha, Qatar',
        avatar: '/assets/team/alihan.jpg',
        contactText: 'Contact',
        email: 'alihan@hexagon.qa'
      },
      'gulsah': {
        name: 'Gulsah Uzun',
        title: 'Events Business Director',
        handle: 'gulsah.uzun',
        status: 'Doha, Qatar',
        avatar: '/assets/team/gulsah.jpg',
        contactText: 'Contact',
        email: 'gulsah@hexagon.qa'
      }
    };

    this.init();
  }

  init() {
    this.createModal();
    this.bindTeamMemberClicks();
    this.bindModalEvents();
  }

  createModal() {
    const modalHTML = `
      <div class="pc-modal" id="pc-modal">
        <div class="pc-modal-backdrop"></div>
        <div class="pc-modal-container">
          <button class="pc-modal-close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          <div class="pc-card-wrapper">
            <div class="pc-behind"></div>
            <div class="pc-card-shell">
              <section class="pc-card">
                <div class="pc-inside">
                  <div class="pc-shine"></div>
                  <div class="pc-glare"></div>

                  <!-- Avatar content layer -->
                  <div class="pc-content pc-avatar-content">
                    <img class="pc-avatar" src="" alt="" loading="lazy">

                    <!-- User info bar at bottom -->
                    <div class="pc-user-info">
                      <div class="pc-user-details">
                        <div class="pc-mini-avatar">
                          <img src="" alt="">
                        </div>
                        <div class="pc-user-text">
                          <div class="pc-handle"></div>
                          <div class="pc-status"></div>
                        </div>
                      </div>
                      <button class="pc-contact-btn">Contact</button>
                    </div>
                  </div>

                  <!-- Name/Title layer -->
                  <div class="pc-content">
                    <div class="pc-details">
                      <h3 class="pc-name"></h3>
                      <p class="pc-title"></p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('pc-modal');
  }

  bindTeamMemberClicks() {
    const teamMembers = document.querySelectorAll('.team-member-flip');
    const memberKeys = ['mohamed', 'ali', 'markus', 'alihan', 'gulsah'];

    teamMembers.forEach((member, index) => {
      const key = memberKeys[index];
      if (key) {
        member.dataset.member = key;
        member.style.cursor = 'pointer';
        member.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.open(key);
        });
      }
    });
  }

  bindModalEvents() {
    const backdrop = this.modal.querySelector('.pc-modal-backdrop');
    const closeBtn = this.modal.querySelector('.pc-modal-close');

    backdrop.addEventListener('click', () => this.close());
    closeBtn.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open(memberKey) {
    const data = this.teamData[memberKey];
    if (!data) return;

    this.currentMember = memberKey;
    this.populateCard(data);

    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.isOpen = true;

    // Initialize tilt engine after modal is visible
    requestAnimationFrame(() => {
      this.initTiltEngine();
    });
  }

  close() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    this.isOpen = false;

    // Cleanup
    if (this.tiltEngine) {
      this.tiltEngine.destroy();
      this.tiltEngine = null;
    }
    if (this.enterTimer) {
      clearTimeout(this.enterTimer);
      this.enterTimer = null;
    }
    if (this.leaveRaf) {
      cancelAnimationFrame(this.leaveRaf);
      this.leaveRaf = null;
    }

    const shell = this.modal.querySelector('.pc-card-shell');
    if (shell) {
      shell.classList.remove('active', 'entering');
    }

    this.currentMember = null;
  }

  populateCard(data) {
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&size=800&background=FF8106&color=fff&bold=true`;

    // Main avatar
    const avatar = this.modal.querySelector('.pc-avatar');
    avatar.src = data.avatar;
    avatar.alt = data.name;
    avatar.onerror = () => { avatar.src = fallbackAvatar; };

    // Mini avatar
    const miniAvatar = this.modal.querySelector('.pc-mini-avatar img');
    miniAvatar.src = data.avatar;
    miniAvatar.alt = data.name;
    miniAvatar.onerror = () => { miniAvatar.src = fallbackAvatar; };

    // Details
    this.modal.querySelector('.pc-name').textContent = data.name;
    this.modal.querySelector('.pc-title').textContent = data.title;
    this.modal.querySelector('.pc-handle').textContent = `@${data.handle}`;
    this.modal.querySelector('.pc-status').textContent = data.status;

    // Contact button
    const contactBtn = this.modal.querySelector('.pc-contact-btn');
    contactBtn.textContent = data.contactText;
    contactBtn.onclick = () => {
      window.location.href = `mailto:${data.email}`;
    };
  }

  initTiltEngine() {
    const shell = this.modal.querySelector('.pc-card-shell');
    const wrap = this.modal.querySelector('.pc-card-wrapper');

    if (!shell || !wrap) return;

    this.tiltEngine = new TiltEngine(shell, wrap);

    // Event handlers
    const handlePointerMove = (e) => {
      const rect = shell.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.tiltEngine.setTarget(x, y);
    };

    const handlePointerEnter = (e) => {
      shell.classList.add('active');
      shell.classList.add('entering');

      if (this.enterTimer) clearTimeout(this.enterTimer);
      this.enterTimer = setTimeout(() => {
        shell.classList.remove('entering');
      }, ANIMATION_CONFIG.ENTER_TRANSITION_MS);

      const rect = shell.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.tiltEngine.setTarget(x, y);
    };

    const handlePointerLeave = () => {
      this.tiltEngine.toCenter();

      const checkSettle = () => {
        const { x, y, tx, ty } = this.tiltEngine.getCurrent();
        const settled = Math.hypot(tx - x, ty - y) < 0.6;
        if (settled) {
          shell.classList.remove('active');
          this.leaveRaf = null;
        } else {
          this.leaveRaf = requestAnimationFrame(checkSettle);
        }
      };

      if (this.leaveRaf) cancelAnimationFrame(this.leaveRaf);
      this.leaveRaf = requestAnimationFrame(checkSettle);
    };

    shell.addEventListener('pointerenter', handlePointerEnter);
    shell.addEventListener('pointermove', handlePointerMove);
    shell.addEventListener('pointerleave', handlePointerLeave);

    // Store handlers for cleanup
    shell._holoHandlers = { handlePointerEnter, handlePointerMove, handlePointerLeave };

    // Initial animation - start from corner, move to center
    const initialX = (shell.clientWidth || 300) - ANIMATION_CONFIG.INITIAL_X_OFFSET;
    const initialY = ANIMATION_CONFIG.INITIAL_Y_OFFSET;
    this.tiltEngine.setImmediate(initialX, initialY);
    this.tiltEngine.toCenter();
    this.tiltEngine.beginInitial(ANIMATION_CONFIG.INITIAL_DURATION);
  }
}

export default HolographicCard;
