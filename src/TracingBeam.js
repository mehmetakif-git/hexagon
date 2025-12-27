import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

class TracingBeam {
  constructor() {
    this.container = null;
    this.progressLine = null;
    this.progressFill = null;
    this.dot = null;
    this.markerList = null;
    this.sections = [];
    this.currentIndex = 0;

    this.init();
  }

  init() {
    this.collectSections();

    if (this.sections.length === 0) {
      console.warn('TracingBeam: No sections found');
      return;
    }

    this.createElements();
    this.setupScrollTrigger();

    window.addEventListener('resize', () => this.onResize());
  }

  collectSections() {
    this.sections = [];

    const sectionConfig = [
      { id: 'hero', label: 'HOME', icon: '⬡' },
      { id: 'about', label: 'ABOUT', icon: '◆' },
      { id: 'events', label: 'EVENTS', icon: '◆' },
      { id: 'media', label: 'MEDIA', icon: '◆' },
      { id: 'digital', label: 'DIGITAL', icon: '◆' },
      { id: 'consultancy', label: 'CONSULT', icon: '◆' },
      { id: 'contact', label: 'CONTACT', icon: '◇' }
    ];

    sectionConfig.forEach(config => {
      const element = document.getElementById(config.id);
      if (element) {
        this.sections.push({
          element,
          id: config.id,
          label: config.label,
          icon: config.icon
        });
      }
    });
  }

  createElements() {
    this.container = document.createElement('div');
    this.container.id = 'tracing-beam-container';

    // Create the beam structure
    this.container.innerHTML = `
      <div class="beam-line">
        <div class="beam-line-bg"></div>
        <div class="beam-line-fill"></div>
        <div class="beam-dot">
          <div class="beam-dot-inner"></div>
          <div class="beam-dot-pulse"></div>
        </div>
      </div>
      <nav class="beam-markers"></nav>
    `;

    document.body.appendChild(this.container);

    this.progressFill = this.container.querySelector('.beam-line-fill');
    this.dot = this.container.querySelector('.beam-dot');
    this.markerList = this.container.querySelector('.beam-markers');

    // Create markers
    this.sections.forEach((section, index) => {
      const marker = document.createElement('a');
      marker.className = 'beam-marker';
      marker.href = `#${section.id}`;
      marker.dataset.index = index;
      marker.innerHTML = `
        <span class="marker-icon">${section.icon}</span>
        <span class="marker-label">${section.label}</span>
      `;

      marker.addEventListener('click', (e) => {
        e.preventDefault();
        section.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', `#${section.id}`);
      });

      this.markerList.appendChild(marker);
    });

    // Set initial active
    this.setActiveMarker(0);
  }

  setupScrollTrigger() {
    // Overall scroll progress
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        this.updateProgress(self.progress);
      }
    });

    // Section tracking
    this.sections.forEach((section, index) => {
      ScrollTrigger.create({
        trigger: section.element,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => this.setActiveMarker(index),
        onEnterBack: () => this.setActiveMarker(index)
      });
    });

    // Initial active based on scroll position
    this.updateActiveOnLoad();
  }

  updateProgress(progress) {
    // Update fill height
    if (this.progressFill) {
      this.progressFill.style.height = `${progress * 100}%`;
    }

    // Update dot position
    if (this.dot) {
      const lineHeight = this.container.querySelector('.beam-line').offsetHeight;
      const dotY = progress * lineHeight;
      this.dot.style.top = `${dotY}px`;
    }
  }

  setActiveMarker(index) {
    this.currentIndex = index;
    const markers = this.markerList.querySelectorAll('.beam-marker');

    markers.forEach((marker, i) => {
      marker.classList.remove('active', 'passed');
      if (i === index) {
        marker.classList.add('active');
      } else if (i < index) {
        marker.classList.add('passed');
      }
    });
  }

  updateActiveOnLoad() {
    const scrollY = window.scrollY;
    const viewportCenter = scrollY + window.innerHeight / 2;

    let activeIndex = 0;

    this.sections.forEach((section, index) => {
      const rect = section.element.getBoundingClientRect();
      const sectionTop = rect.top + scrollY;
      const sectionBottom = sectionTop + rect.height;

      if (viewportCenter >= sectionTop && viewportCenter <= sectionBottom) {
        activeIndex = index;
      }
    });

    this.setActiveMarker(activeIndex);

    // Update progress
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? scrollY / docHeight : 0;
    this.updateProgress(progress);
  }

  onResize() {
    ScrollTrigger.refresh();
  }
}

export { TracingBeam };
