import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

class TracingBeam {
  constructor() {
    this.container = null;
    this.svg = null;
    this.pathActive = null;
    this.pathBg = null;
    this.gradient = null;
    this.dot = null;
    this.pathLength = 0;
    this.totalHeight = 0;
    this.sections = [];
    this.markers = null;

    this.init();
  }

  init() {
    this.createElements();
    this.collectSections();
    this.createPath();
    this.setupScrollTrigger();
    window.addEventListener('resize', () => this.onResize());
  }

  createElements() {
    this.container = document.createElement('div');
    this.container.id = 'tracing-beam-container';
    this.container.innerHTML = `
      <div class="beam-dot">
        <div class="beam-dot-inner"></div>
        <div class="beam-dot-pulse"></div>
      </div>
      <svg id="tracing-beam-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="beam-gradient" gradientUnits="userSpaceOnUse" x1="0" x2="0">
            <stop offset="0%" stop-color="#FF8106" stop-opacity="0"></stop>
            <stop offset="30%" stop-color="#FF8106" stop-opacity="1"></stop>
            <stop offset="50%" stop-color="#FFCC66" stop-opacity="1"></stop>
            <stop offset="70%" stop-color="#FF8106" stop-opacity="1"></stop>
            <stop offset="100%" stop-color="#FF8106" stop-opacity="0"></stop>
          </linearGradient>
          <filter id="beam-glow">
            <feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur>
            <feMerge>
              <feMergeNode in="blur"></feMergeNode>
              <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
          </filter>
        </defs>
        <path id="beam-path-bg" fill="none" stroke="rgba(255, 129, 6, 0.08)" stroke-width="2"></path>
        <path id="beam-path-active" fill="none" stroke="url(#beam-gradient)" stroke-width="2.5" filter="url(#beam-glow)"></path>
      </svg>
      <div class="beam-markers"></div>
    `;
    document.body.prepend(this.container);

    this.svg = document.getElementById('tracing-beam-svg');
    this.pathBg = document.getElementById('beam-path-bg');
    this.pathActive = document.getElementById('beam-path-active');
    this.gradient = document.getElementById('beam-gradient');
    this.dot = this.container.querySelector('.beam-dot');
    this.markers = this.container.querySelector('.beam-markers');
  }

  collectSections() {
    const hero = document.querySelector('.hero');
    const serviceSections = document.querySelectorAll('.service-section');
    const footer = document.getElementById('footer');

    this.sections = [];

    if (hero) this.sections.push({ element: hero, label: 'HOME', icon: '⬡' });

    const labels = ['ABOUT', 'EVENT', 'MEDIA', 'DIGITAL', 'CONSULT', 'CONTACT'];
    serviceSections.forEach((section, i) => {
      this.sections.push({ element: section, label: labels[i] || `SEC${i+1}`, icon: '◆' });
    });

    if (footer) this.sections.push({ element: footer, label: 'FOOTER', icon: '◇' });
  }

  createPath() {
    this.totalHeight = document.documentElement.scrollHeight;
    this.svg.style.height = `${this.totalHeight}px`;
    this.svg.setAttribute('viewBox', `0 0 50 ${this.totalHeight}`);

    // Zigzag path
    let path = `M 25 0`;

    this.sections.forEach((section, index) => {
      const rect = section.element.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const x = index % 2 === 0 ? 15 : 35;

      path += ` L ${x} ${top + rect.height / 2}`;
      this.addMarker(section, top + rect.height / 2);
    });

    path += ` L 25 ${this.totalHeight}`;

    this.pathBg.setAttribute('d', path);
    this.pathActive.setAttribute('d', path);

    this.pathLength = this.pathActive.getTotalLength();
    this.pathActive.style.strokeDasharray = this.pathLength;
    this.pathActive.style.strokeDashoffset = this.pathLength;
  }

  addMarker(section, yPos) {
    const marker = document.createElement('div');
    marker.className = 'beam-marker';
    marker.innerHTML = `<span class="marker-icon">${section.icon}</span><span class="marker-label">${section.label}</span>`;
    marker.style.top = `${yPos}px`;
    marker.addEventListener('click', () => section.element.scrollIntoView({ behavior: 'smooth' }));
    this.markers.appendChild(marker);
  }

  setupScrollTrigger() {
    gsap.to(this.pathActive, {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        onUpdate: (self) => this.updateBeam(self.progress)
      }
    });

    this.sections.forEach((section, index) => {
      ScrollTrigger.create({
        trigger: section.element,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => this.activateMarker(index),
        onEnterBack: () => this.activateMarker(index)
      });
    });
  }

  updateBeam(progress) {
    const currentY = progress * this.totalHeight;
    this.gradient.setAttribute('y1', currentY - 150);
    this.gradient.setAttribute('y2', currentY + 150);

    if (this.pathLength > 0) {
      const point = this.pathActive.getPointAtLength(progress * this.pathLength);
      this.dot.style.transform = `translate(${point.x - 10}px, ${point.y - 10}px)`;
    }
  }

  activateMarker(index) {
    this.markers.querySelectorAll('.beam-marker').forEach((m, i) => {
      m.classList.toggle('active', i === index);
    });
  }

  onResize() {
    this.markers.innerHTML = '';
    this.createPath();
    ScrollTrigger.refresh();
  }
}

export { TracingBeam };
