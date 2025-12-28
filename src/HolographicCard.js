// src/HolographicCard.js
// Advanced 3D Holographic Profile Card Modal with Interactive Effects

export class HolographicCard {
  constructor() {
    this.modal = null;
    this.tiltEngine = null;
    this.isOpen = false;
    this.currentMember = null;

    // Team member data
    this.teamData = {
      'mohamed': {
        name: 'Mohamed Khalifa Al Sada',
        title: 'Chairman & Founding Partner',
        avatar: '/assets/team/mohamed.jpg',
        bio: 'Visionary leader with deep roots in Qatar\'s business landscape. Mohamed brings strategic insight and regional expertise to every project, driving Hexagon\'s mission to create meaningful connections.',
        stats: [
          { label: 'Years Experience', value: '15+' },
          { label: 'Projects Led', value: '200+' },
          { label: 'Team Size', value: '50+' }
        ],
        social: {
          linkedin: 'https://linkedin.com/in/mohamed-alsada',
          email: 'mohamed@hexagon.qa'
        },
        location: 'Doha, Qatar',
        color: '#FF8106'
      },
      'ali': {
        name: 'Ali Boray Dundar',
        title: 'Founding Partner',
        avatar: '/assets/team/ali.jpg',
        bio: 'Creative strategist with a passion for innovative brand experiences. Ali combines artistic vision with business acumen to deliver campaigns that resonate and inspire.',
        stats: [
          { label: 'Years Experience', value: '12+' },
          { label: 'Brands Served', value: '150+' },
          { label: 'Awards Won', value: '25+' }
        ],
        social: {
          linkedin: 'https://linkedin.com/in/ali-dundar',
          email: 'ali@hexagon.qa'
        },
        location: 'Istanbul, Turkey',
        color: '#FF6B35'
      },
      'markus': {
        name: 'Markus Katterle',
        title: 'Founding Partner',
        avatar: '/assets/team/markus.jpg',
        bio: 'International business developer with expertise in cross-cultural communication. Markus bridges markets and builds partnerships that drive growth across borders.',
        stats: [
          { label: 'Years Experience', value: '18+' },
          { label: 'Markets Entered', value: '30+' },
          { label: 'Partnerships', value: '100+' }
        ],
        social: {
          linkedin: 'https://linkedin.com/in/markus-katterle',
          email: 'markus@hexagon.qa'
        },
        location: 'London, UK',
        color: '#FFB366'
      },
      'alihan': {
        name: 'Alihan Tokmak',
        title: 'Managing Partner',
        avatar: '/assets/team/alihan.jpg',
        bio: 'Operations expert who transforms vision into reality. Alihan ensures flawless execution of every project, managing complex logistics with precision and creativity.',
        stats: [
          { label: 'Years Experience', value: '10+' },
          { label: 'Events Managed', value: '500+' },
          { label: 'Team Members', value: '40+' }
        ],
        social: {
          linkedin: 'https://linkedin.com/in/alihan-tokmak',
          email: 'alihan@hexagon.qa'
        },
        location: 'Doha, Qatar',
        color: '#FF9933'
      },
      'gulsah': {
        name: 'Gulsah Uzun',
        title: 'Events Business Director',
        avatar: '/assets/team/gulsah.jpg',
        bio: 'Event specialist with an eye for unforgettable experiences. Gulsah crafts immersive events that captivate audiences and leave lasting impressions.',
        stats: [
          { label: 'Years Experience', value: '8+' },
          { label: 'Events Produced', value: '300+' },
          { label: 'Happy Clients', value: '200+' }
        ],
        social: {
          linkedin: 'https://linkedin.com/in/gulsah-uzun',
          email: 'gulsah@hexagon.qa'
        },
        location: 'Doha, Qatar',
        color: '#FFAA55'
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
    // Create modal HTML structure
    const modalHTML = `
      <div class="holo-modal" id="holo-modal">
        <div class="holo-backdrop"></div>
        <div class="holo-shell">
          <div class="holo-wrap">
            <!-- Behind glow -->
            <div class="holo-glow"></div>

            <!-- Main card -->
            <div class="holo-card">
              <!-- Inside layer (background) -->
              <div class="holo-inside"></div>

              <!-- Content -->
              <div class="holo-content">
                <button class="holo-close" aria-label="Close">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>

                <div class="holo-avatar-wrap">
                  <div class="holo-avatar">
                    <img src="" alt="" class="holo-avatar-img">
                  </div>
                  <div class="holo-avatar-ring"></div>
                </div>

                <div class="holo-info">
                  <h2 class="holo-name"></h2>
                  <p class="holo-title"></p>
                  <p class="holo-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span></span>
                  </p>
                </div>

                <p class="holo-bio"></p>

                <div class="holo-stats"></div>

                <div class="holo-actions">
                  <a href="#" class="holo-btn holo-btn-linkedin">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                  <a href="#" class="holo-btn holo-btn-email">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Contact
                  </a>
                </div>
              </div>

              <!-- Holographic shine layer -->
              <div class="holo-shine"></div>

              <!-- Glare effect -->
              <div class="holo-glare"></div>

              <!-- Grain texture -->
              <div class="holo-grain"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('holo-modal');
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
    const backdrop = this.modal.querySelector('.holo-backdrop');
    const closeBtn = this.modal.querySelector('.holo-close');

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
      const shell = this.modal.querySelector('.holo-shell');
      const wrap = this.modal.querySelector('.holo-wrap');
      this.tiltEngine = new TiltEngine(shell, wrap);
      this.tiltEngine.start();
    });
  }

  close() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    this.isOpen = false;

    if (this.tiltEngine) {
      this.tiltEngine.destroy();
      this.tiltEngine = null;
    }

    this.currentMember = null;
  }

  populateCard(data) {
    // Avatar with fallback
    const avatarImg = this.modal.querySelector('.holo-avatar-img');
    avatarImg.src = data.avatar;
    avatarImg.alt = data.name;
    avatarImg.onerror = () => {
      avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&size=400&background=FF8106&color=fff&bold=true`;
    };

    // Basic info
    this.modal.querySelector('.holo-name').textContent = data.name;
    this.modal.querySelector('.holo-title').textContent = data.title;
    this.modal.querySelector('.holo-location span').textContent = data.location;
    this.modal.querySelector('.holo-bio').textContent = data.bio;

    // Stats
    const statsContainer = this.modal.querySelector('.holo-stats');
    statsContainer.innerHTML = data.stats.map(stat => `
      <div class="holo-stat">
        <span class="holo-stat-value">${stat.value}</span>
        <span class="holo-stat-label">${stat.label}</span>
      </div>
    `).join('');

    // Social links
    const linkedinBtn = this.modal.querySelector('.holo-btn-linkedin');
    const emailBtn = this.modal.querySelector('.holo-btn-email');

    linkedinBtn.href = data.social.linkedin;
    linkedinBtn.target = '_blank';
    linkedinBtn.rel = 'noopener noreferrer';

    emailBtn.href = `mailto:${data.social.email}`;

    // Set accent color
    const wrap = this.modal.querySelector('.holo-wrap');
    wrap.style.setProperty('--accent-color', data.color);
  }
}


// TiltEngine - Handles 3D tilt and holographic effects
class TiltEngine {
  constructor(shell, wrap) {
    this.shell = shell;
    this.wrap = wrap;
    this.card = wrap.querySelector('.holo-card');

    this.running = false;
    this.rafId = null;
    this.lastTime = 0;

    // Position state
    this.currentX = 0;
    this.currentY = 0;
    this.targetX = 0;
    this.targetY = 0;

    // Smoothing parameters
    this.tau = 0.14; // Exponential smoothing factor

    // Bounds
    this.bounds = null;

    // Animation state
    this.isHovering = false;
    this.hasEnteredOnce = false;

    this.bindEvents();
  }

  bindEvents() {
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleMouseEnter = this.onMouseEnter.bind(this);
    this.handleMouseLeave = this.onMouseLeave.bind(this);
    this.handleResize = this.onResize.bind(this);

    this.shell.addEventListener('mousemove', this.handleMouseMove);
    this.shell.addEventListener('mouseenter', this.handleMouseEnter);
    this.shell.addEventListener('mouseleave', this.handleMouseLeave);
    window.addEventListener('resize', this.handleResize);

    this.updateBounds();
  }

  updateBounds() {
    this.bounds = this.shell.getBoundingClientRect();
  }

  onResize() {
    this.updateBounds();
  }

  onMouseEnter(e) {
    this.isHovering = true;
    this.updateBounds();

    if (!this.hasEnteredOnce) {
      // First entry - animate from corner
      this.hasEnteredOnce = true;
      this.currentX = 0;
      this.currentY = 0;
    }

    this.wrap.classList.add('hovering');
  }

  onMouseLeave() {
    this.isHovering = false;
    this.wrap.classList.remove('hovering');

    // Return to center
    this.targetX = this.bounds.width / 2;
    this.targetY = this.bounds.height / 2;
  }

  onMouseMove(e) {
    if (!this.bounds) return;

    const x = e.clientX - this.bounds.left;
    const y = e.clientY - this.bounds.top;

    this.targetX = Math.max(0, Math.min(this.bounds.width, x));
    this.targetY = Math.max(0, Math.min(this.bounds.height, y));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();

    // Initialize to center
    if (this.bounds) {
      this.currentX = this.bounds.width / 2;
      this.currentY = this.bounds.height / 2;
      this.targetX = this.bounds.width / 2;
      this.targetY = this.bounds.height / 2;
    }

    this.step();
  }

  step() {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Exponential smoothing
    const k = 1 - Math.exp(-deltaTime / this.tau);
    this.currentX += (this.targetX - this.currentX) * k;
    this.currentY += (this.targetY - this.currentY) * k;

    this.updateCSSVariables();

    this.rafId = requestAnimationFrame(() => this.step());
  }

  updateCSSVariables() {
    if (!this.bounds || !this.wrap) return;

    const width = this.bounds.width;
    const height = this.bounds.height;

    if (width === 0 || height === 0) return;

    // Calculate percentages
    const percentX = (100 / width) * this.currentX;
    const percentY = (100 / height) * this.currentY;

    // Center offset (-50 to 50)
    const centerX = percentX - 50;
    const centerY = percentY - 50;

    // Distance from center (0 to ~70 at corners)
    const distanceFromCenter = Math.hypot(centerX, centerY) / 50;

    // Rotation values
    const rotateX = -(centerY / 4); // Vertical tilt
    const rotateY = centerX / 5;    // Horizontal tilt

    // Background parallax positions
    const bgX = 35 + ((65 - 35) * percentX / 100);
    const bgY = 35 + ((65 - 35) * percentY / 100);

    // Apply CSS variables
    this.wrap.style.setProperty('--pointer-x', `${percentX}%`);
    this.wrap.style.setProperty('--pointer-y', `${percentY}%`);
    this.wrap.style.setProperty('--rotate-x', `${rotateY}deg`);
    this.wrap.style.setProperty('--rotate-y', `${rotateX}deg`);
    this.wrap.style.setProperty('--pointer-from-center', distanceFromCenter.toFixed(3));
    this.wrap.style.setProperty('--background-x', `${bgX}%`);
    this.wrap.style.setProperty('--background-y', `${bgY}%`);
    this.wrap.style.setProperty('--center-x', centerX.toFixed(2));
    this.wrap.style.setProperty('--center-y', centerY.toFixed(2));
  }

  destroy() {
    this.running = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.shell.removeEventListener('mousemove', this.handleMouseMove);
    this.shell.removeEventListener('mouseenter', this.handleMouseEnter);
    this.shell.removeEventListener('mouseleave', this.handleMouseLeave);
    window.removeEventListener('resize', this.handleResize);

    // Reset CSS variables
    if (this.wrap) {
      this.wrap.style.removeProperty('--pointer-x');
      this.wrap.style.removeProperty('--pointer-y');
      this.wrap.style.removeProperty('--rotate-x');
      this.wrap.style.removeProperty('--rotate-y');
      this.wrap.style.removeProperty('--pointer-from-center');
      this.wrap.style.removeProperty('--background-x');
      this.wrap.style.removeProperty('--background-y');
      this.wrap.classList.remove('hovering');
    }
  }
}

export default HolographicCard;
