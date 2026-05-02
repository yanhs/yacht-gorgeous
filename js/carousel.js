// Carousel
  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  const slides = track.querySelectorAll('.carousel-slide');
  const totalSlides = slides.length;
  let currentDot = 0;

  // Create dots
  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => {
      slides[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    };
    dotsContainer.appendChild(dot);
  }

  // Update dots on scroll
  track.addEventListener('scroll', () => {
    const scrollLeft = track.scrollLeft;
    const slideWidth = slides[0].offsetWidth + 20;
    const idx = Math.round(scrollLeft / slideWidth);
    if (idx !== currentDot && idx >= 0 && idx < totalSlides) {
      currentDot = idx;
      dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => {
        d.classList.toggle('active', i === idx);
      });
    }
  });

  function carouselScroll(dir) {
    const slideWidth = slides[0].offsetWidth + 20;
    track.scrollBy({ left: dir * slideWidth, behavior: 'smooth' });
  }

  // Lightbox
  function openLightbox(slide) {
    const img = slide.querySelector('img');
    document.getElementById('lightboxImg').src = img.src;
    document.getElementById('lightbox').classList.add('active');
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
  }


  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
// ===== SUNSET TIME =====
  // Detect LA timezone name (PST or PDT depending on DST)
  const laTzName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short'
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || 'PT';
  document.getElementById('tzIndicator').textContent = laTzName + ' \u2022 auto-adjusted for daylight saving';
