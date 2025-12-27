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
    this.isRevealed = false;

    this.init();
  }

  init() {
    this.collectSections();

    if (this.sections.length === 0) {
      console.warn('TracingBeam: No sections found');
      return;
    }

    this.createElements();
    // Don't setup scroll trigger until revealed
    // this.setupScrollTrigger();

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
    this.beamLine = this.container.querySelector('.beam-line');

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

    // Hide everything initially for reveal animation
    this.hideForReveal();
  }

  hideForReveal() {
    // Hide container initially
    gsap.set(this.container, { opacity: 0 });

    // Hide beam line
    gsap.set(this.beamLine, {
      opacity: 0,
      scaleY: 0,
      transformOrigin: 'top center'
    });

    // Hide all markers - positioned below their final position
    const markers = this.markerList.querySelectorAll('.beam-marker');
    markers.forEach((marker, i) => {
      gsap.set(marker, {
        opacity: 0,
        y: 30,
        x: -20,
        scale: 0.8
      });
    });

    // Hide dot
    gsap.set(this.dot, {
      opacity: 0,
      scale: 0
    });
  }

  reveal() {
    if (this.isRevealed) return;
    this.isRevealed = true;

    const tl = gsap.timeline({
      onComplete: () => {
        this.setupScrollTrigger();
        this.setActiveMarker(0);
      }
    });

    // First, make container visible
    tl.to(this.container, {
      opacity: 1,
      duration: 0.1
    }, 0);

    // Markers reveal from BOTTOM to TOP with tech stagger effect
    const markers = this.markerList.querySelectorAll('.beam-marker');
    const markersArray = Array.from(markers).reverse(); // Reverse for bottom-to-top

    markersArray.forEach((marker, i) => {
      // Each marker appears with tech glitch effect
      tl.to(marker, {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        duration: 0.3,
        ease: "back.out(1.7)"
      }, 0.1 + (i * 0.08));

      // Add a brief "glitch" flash effect
      tl.fromTo(marker,
        { filter: 'brightness(3) blur(2px)' },
        { filter: 'brightness(1) blur(0px)', duration: 0.2 },
        0.1 + (i * 0.08)
      );
    });

    // After markers, reveal the beam line (growing from top)
    const markersDelay = 0.1 + (markersArray.length * 0.08) + 0.2;

    tl.to(this.beamLine, {
      opacity: 1,
      scaleY: 1,
      duration: 0.6,
      ease: "power2.out"
    }, markersDelay);

    // Dot appears with pulse
    tl.to(this.dot, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: "elastic.out(1, 0.5)"
    }, markersDelay + 0.3);

    // Add glow pulse to dot on reveal
    tl.fromTo(this.dot,
      { filter: 'drop-shadow(0 0 10px #FF8106) drop-shadow(0 0 20px #FF8106)' },
      { filter: 'drop-shadow(0 0 3px #FF8106) drop-shadow(0 0 6px #FF8106)', duration: 0.5 },
      markersDelay + 0.3
    );

    return tl;
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
    if (this.dot && this.beamLine) {
      const lineHeight = this.beamLine.offsetHeight;
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
