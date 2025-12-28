// src/EventModal.js
import gsap from 'gsap';
import { EventEffects3D } from './EventEffects3D.js';

// Kategori bilgileri
const CATEGORIES = {
  'live-sports': {
    title: 'Live & Sports Events',
    description: 'International tournaments, local leagues, live concerts, and fan engagement activities',
    folder: 'live-sports'
  },
  'public': {
    title: 'Public Events',
    description: 'Large-scale national celebrations, cultural festivals, and community initiatives',
    folder: 'public'
  },
  'exhibitions': {
    title: 'Exhibitions & Trade Shows',
    description: 'Customized booth designs, interactive displays, networking lounges, and live demonstrations',
    folder: 'exhibitions'
  },
  'corporate': {
    title: 'Corporate Events',
    description: 'Conferences, product launches, award ceremonies, and gala dinners',
    folder: 'corporate'
  },
  'festivals': {
    title: 'Festivals & Cultural Events',
    description: 'Large-scale festivals celebrating Qatar\'s traditions, artistry, and diversity',
    folder: 'festivals'
  }
};

export class EventModal {
  constructor() {
    this.modal = null;
    this.track = null;
    this.currentCategory = null;
    this.mediaItems = [];
    this.currentIndex = 0;
    this.isAnimating = false;
    this.isDragging = false;
    this.wasDragging = false; // Flag to prevent click after drag
    this.dragStartX = 0;
    this.dragCurrentX = 0;

    // 3D Effects
    this.effects3D = null;

    // Carousel settings - optimized for overlap effect
    this.itemWidth = 500;
    this.gap = 16;
    this.trackOffset = 280; // Smaller for overlap effect

    this.init();
  }

  init() {
    this.createModal();
    this.bindEvents();
  }

  createModal() {
    // Modal HTML
    const modalHTML = `
      <div class="event-modal" id="event-modal">
        <div class="event-modal-backdrop"></div>
        <div class="event-modal-content">
          <div class="event-modal-indicator">07</div>
          <button class="event-modal-close" id="close-event-modal">
            <span></span>
            <span></span>
          </button>

          <!-- Carousel Area -->
          <div class="event-carousel-wrapper">
            <div class="event-carousel-container">
              <div class="event-carousel-track" id="event-carousel-track">
                <!-- Items will be injected here -->
              </div>
            </div>

            <!-- Navigation Arrows -->
            <button class="carousel-nav carousel-nav-prev" id="carousel-prev">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <button class="carousel-nav carousel-nav-next" id="carousel-next">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <!-- Info Section -->
          <div class="event-modal-info">
            <div class="event-modal-header">
              <span class="event-category-tag" id="event-category-tag">Category</span>
              <h2 class="event-modal-title" id="event-modal-title">Event Title</h2>
              <p class="event-modal-desc" id="event-modal-desc">Description</p>
            </div>

            <!-- Indicators -->
            <div class="carousel-indicators" id="carousel-indicators">
              <!-- Dots will be injected here -->
            </div>

            <!-- Counter & Back Button -->
            <div class="event-modal-footer">
              <span class="carousel-counter" id="carousel-counter">1 / 12</span>
              <button class="event-back-btn" id="event-back-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span>Back to Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Cache elements
    this.modal = document.getElementById('event-modal');
    this.track = document.getElementById('event-carousel-track');
    this.indicators = document.getElementById('carousel-indicators');
    this.counter = document.getElementById('carousel-counter');
    this.titleEl = document.getElementById('event-modal-title');
    this.descEl = document.getElementById('event-modal-desc');
    this.tagEl = document.getElementById('event-category-tag');
  }

  bindEvents() {
    // Close button
    document.getElementById('close-event-modal')?.addEventListener('click', () => this.close());
    document.getElementById('event-back-btn')?.addEventListener('click', () => this.close());

    // Backdrop click
    this.modal?.querySelector('.event-modal-backdrop')?.addEventListener('click', () => this.close());

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
        this.close();
      }
    });

    // Navigation arrows
    document.getElementById('carousel-prev')?.addEventListener('click', () => this.prev());
    document.getElementById('carousel-next')?.addEventListener('click', () => this.next());

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.modal?.classList.contains('active')) return;
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });

    // Drag events
    this.track?.addEventListener('mousedown', (e) => this.onDragStart(e));
    this.track?.addEventListener('touchstart', (e) => this.onDragStart(e), { passive: true });

    document.addEventListener('mousemove', (e) => this.onDragMove(e));
    document.addEventListener('touchmove', (e) => this.onDragMove(e), { passive: true });

    document.addEventListener('mouseup', () => this.onDragEnd());
    document.addEventListener('touchend', () => this.onDragEnd());

    // Category buttons (from event cards)
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        if (category) {
          this.open(category);
        }
      });
    });
  }

  async open(category) {
    if (!CATEGORIES[category]) {
      console.warn('Unknown category:', category);
      return;
    }

    this.currentCategory = category;
    const catInfo = CATEGORIES[category];

    // Update info
    this.titleEl.textContent = catInfo.title;
    this.descEl.textContent = catInfo.description;
    this.tagEl.textContent = catInfo.title;

    // Load media items
    await this.loadMedia(category);

    // Show modal
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Initialize 3D effects
    const carouselWrapper = this.modal.querySelector('.event-carousel-wrapper');
    if (carouselWrapper && !this.effects3D) {
      this.effects3D = new EventEffects3D(carouselWrapper);
    }

    // Set category-specific effect
    if (this.effects3D) {
      this.effects3D.setCategory(category);
    }

    // Animate in
    gsap.fromTo(this.modal.querySelector('.event-modal-content'),
      { scale: 0.9, opacity: 0, y: 30 },
      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
    );
  }

  close() {
    gsap.to(this.modal.querySelector('.event-modal-content'), {
      scale: 0.9,
      opacity: 0,
      y: 30,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        this.clearMedia();

        // Cleanup 3D effects
        if (this.effects3D) {
          this.effects3D.destroy();
          this.effects3D = null;
        }
      }
    });
  }

  async loadMedia(category) {
    const folder = CATEGORIES[category].folder;

    // Try to load manifest first
    try {
      const response = await fetch(`/assets/events/${folder}/manifest.json`);
      if (response.ok) {
        const manifest = await response.json();
        this.mediaItems = manifest.items.map((item, index) => ({
          id: index + 1,
          src: `/assets/events/${folder}/${item.file}`,
          type: item.type || 'image',
          title: item.title || `${CATEGORIES[category].title} - ${index + 1}`
        }));
      } else {
        throw new Error('No manifest');
      }
    } catch (e) {
      // Fallback: numbered files (1.jpg - 12.jpg)
      this.mediaItems = [];
      for (let i = 1; i <= 12; i++) {
        this.mediaItems.push({
          id: i,
          src: `/assets/events/${folder}/${i}.jpg`,
          type: 'image',
          title: `${CATEGORIES[category].title} - ${i}`
        });
      }
    }

    this.currentIndex = 0;
    this.renderCarousel();
    this.updateIndicators();
    this.updateCounter();
  }

  clearMedia() {
    this.mediaItems = [];
    this.currentIndex = 0;
    if (this.track) {
      this.track.innerHTML = '';
    }
    if (this.indicators) {
      this.indicators.innerHTML = '';
    }
  }

  renderCarousel() {
    if (!this.track) return;

    this.track.innerHTML = '';

    this.mediaItems.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'carousel-item';
      itemEl.dataset.index = index;

      if (item.type === 'video') {
        itemEl.innerHTML = `
          <video src="${item.src}" muted loop playsinline>
            Your browser does not support video.
          </video>
          <div class="carousel-item-overlay">
            <span class="play-icon">▶</span>
          </div>
        `;
      } else {
        itemEl.innerHTML = `
          <img src="${item.src}" alt="${item.title}" loading="lazy"
               onerror="this.parentElement.classList.add('error'); this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%23111%22 width=%22400%22 height=%22300%22/><text x=%22200%22 y=%22150%22 text-anchor=%22middle%22 fill=%22%23ff8106%22 font-size=%2216%22>Image ${index + 1}</text></svg>'" />
          <div class="carousel-item-overlay">
            <span class="item-number">${String(index + 1).padStart(2, '0')}</span>
          </div>
        `;
      }

      // Click to go to this item
      itemEl.addEventListener('click', () => {
        if (!this.isDragging && !this.wasDragging && index !== this.currentIndex) {
          this.goTo(index);
        }
      });

      this.track.appendChild(itemEl);
    });

    // Initial position
    this.updateCarouselPosition(false);
  }

  updateCarouselPosition(animate = true) {
    const items = this.track?.querySelectorAll('.carousel-item');
    if (!items || items.length === 0) return;

    const container = this.track.parentElement;
    if (!container) return;

    // Center point
    const containerWidth = container.offsetWidth;
    const centerX = (containerWidth - this.itemWidth) / 2;

    items.forEach((item, index) => {
      const diff = index - this.currentIndex;

      // X position - offset from center
      const xOffset = diff * this.trackOffset;

      // Rotation - max 25° (less aggressive than 45°)
      const maxRotation = 25;
      const rotateY = Math.max(-maxRotation, Math.min(maxRotation, diff * 18));

      // Scale - active is full size, others much smaller for depth
      const scale = index === this.currentIndex ? 1 : 0.7;

      // Z position - more pronounced depth
      const zOffset = -Math.abs(diff) * 120;

      // Opacity - fade out distant items
      const opacity = Math.abs(diff) > 2 ? 0 : 1 - Math.abs(diff) * 0.2;

      // Z-index - active in front
      const zIndex = 100 - Math.abs(diff) * 10;

      const props = {
        x: centerX + xOffset,
        rotateY: rotateY,
        z: zOffset,
        scale: scale,
        opacity: opacity,
        zIndex: zIndex
      };

      if (animate) {
        gsap.to(item, {
          ...props,
          duration: 0.5,
          ease: 'power2.out'
        });
      } else {
        gsap.set(item, props);
      }

      // Active class
      item.classList.toggle('active', index === this.currentIndex);

      // Play/pause video
      const video = item.querySelector('video');
      if (video) {
        if (index === this.currentIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }

  updateIndicators() {
    if (!this.indicators) return;

    this.indicators.innerHTML = '';

    // Show max 10 dots
    const maxDots = 10;
    const totalItems = this.mediaItems.length;

    const dotsToShow = Math.min(maxDots, totalItems);

    for (let i = 0; i < dotsToShow; i++) {
      const dot = document.createElement('span');
      dot.className = `carousel-dot ${i === this.currentIndex ? 'active' : ''}`;
      dot.addEventListener('click', () => this.goTo(i));
      this.indicators.appendChild(dot);
    }

    // If more items than dots, show ellipsis indicator
    if (totalItems > maxDots) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'carousel-ellipsis';
      ellipsis.textContent = '...';
      this.indicators.appendChild(ellipsis);
    }
  }

  updateCounter() {
    if (this.counter) {
      this.counter.textContent = `${this.currentIndex + 1} / ${this.mediaItems.length}`;
    }
  }

  goTo(index) {
    if (this.isAnimating) return;
    if (index < 0 || index >= this.mediaItems.length) return;

    this.isAnimating = true;
    this.currentIndex = index;

    this.updateCarouselPosition(true);
    this.updateIndicators();
    this.updateCounter();

    setTimeout(() => {
      this.isAnimating = false;
    }, 500);
  }

  prev() {
    const newIndex = this.currentIndex > 0
      ? this.currentIndex - 1
      : this.mediaItems.length - 1; // Loop
    this.goTo(newIndex);
  }

  next() {
    const newIndex = this.currentIndex < this.mediaItems.length - 1
      ? this.currentIndex + 1
      : 0; // Loop
    this.goTo(newIndex);
  }

  // Drag handlers
  onDragStart(e) {
    if (this.isAnimating) return;

    this.isDragging = true;
    this.dragStartX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    this.dragCurrentX = this.dragStartX;

    if (this.track) {
      this.track.style.cursor = 'grabbing';
    }
  }

  onDragMove(e) {
    if (!this.isDragging) return;

    this.dragCurrentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const diff = this.dragCurrentX - this.dragStartX;

    // Visual feedback during drag
    const items = this.track?.querySelectorAll('.carousel-item');
    if (!items) return;

    const container = this.track.parentElement;
    if (!container) return;

    const centerOffset = (container.offsetWidth - this.itemWidth) / 2;

    items.forEach((item, index) => {
      const baseOffset = (index - this.currentIndex) * this.trackOffset;
      gsap.set(item, {
        x: centerOffset + baseOffset + diff * 0.5
      });
    });
  }

  onDragEnd() {
    if (!this.isDragging) return;

    const diff = this.dragCurrentX - this.dragStartX;
    const threshold = 50;

    // Set wasDragging flag if there was significant movement
    this.wasDragging = Math.abs(diff) > 10;
    this.isDragging = false;

    if (this.track) {
      this.track.style.cursor = 'grab';
    }

    // Handle navigation
    if (diff > threshold) {
      this.prev();
    } else if (diff < -threshold) {
      this.next();
    } else {
      // Snap back
      this.updateCarouselPosition(true);
    }

    // Reset wasDragging after short delay
    setTimeout(() => {
      this.wasDragging = false;
    }, 100);
  }

  destroy() {
    // Cleanup 3D effects
    if (this.effects3D) {
      this.effects3D.destroy();
      this.effects3D = null;
    }

    if (this.modal) {
      this.modal.remove();
    }
  }
}

export default EventModal;
