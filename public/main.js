/* ==========================================================================
   CEWÁMICA — v2 interaction layer
   - Hero: 7 slides + 7 typewriter fragments rotate in sync. Slow, calm.
     Each slide cross-fades over 1.8s and plays a 12s slow Ken Burns drift.
     Fragment text appears 0.35s into the new slide; lingers; fades.
   - Nav: gains a frosted backdrop after the hero. Current section underlined.
   - Mobile drawer toggles via hamburger.
   - Reveal observer: gentle vertical drift into place.
   ========================================================================== */

(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------------
     1. HERO — slide + fragment sync (photo mode OR video mode)
     -------------------------------------------------------------- */
  const slides = $$('#heroSlides .slide');
  const frags  = $$('#fragStack .frag');
  const dots   = $$('#heroDots .dot');
  const slideIndex = $('#slideIndex');
  const hero = $('.hero');
  const isVideoMode = hero && hero.getAttribute('data-mode') === 'video';

  let active = 0;
  let timer = null;
  // Video mode: 3.5s — matches placeholder clip length, feels breathy
  // Photo mode: 6.2s — readable + Ken Burns has time to breathe
  const INTERVAL = isVideoMode ? 3500 : 6200;
  const pad = (n) => String(n + 1).padStart(2, '0');

  // Helper: kick the active video into playback from the start.
  // Also pre-warm the NEXT slide's video so when its turn arrives it's already
  // buffered — that's the trick to a pixel-clean cross-fade.
  const playActiveVideo = () => {
    if (!isVideoMode) return;
    slides.forEach((s, i) => {
      const v = s.querySelector('video.slide__video');
      if (!v) return;
      if (i === active) {
        try {
          v.currentTime = 0;
          const p = v.play();
          if (p && typeof p.catch === 'function') p.catch(() => {/* ignore autoplay rejections */});
        } catch (_) { /* noop */ }
      } else {
        try { v.pause(); } catch (_) { /* noop */ }
      }
    });
    // Pre-warm next + next+1 so the upcoming cross-fades have fully-buffered video.
    const ahead = [(active + 1) % slides.length, (active + 2) % slides.length];
    ahead.forEach((idx) => {
      const v = slides[idx]?.querySelector('video.slide__video');
      if (v && v.readyState < 3) { try { v.load(); } catch (_) { /* noop */ } }
    });
  };

  // On first paint, force every video to start buffering. Modern browsers usually
  // honour preload="auto" but kick them explicitly to be safe.
  if (isVideoMode) {
    slides.forEach((s) => {
      const v = s.querySelector('video.slide__video');
      if (!v) return;
      try { v.load(); } catch (_) { /* noop */ }
    });
  }

  const goTo = (next) => {
    if (next === active || !slides.length) return;
    slides[active]?.classList.remove('is-active');
    frags[active]?.classList.remove('is-active');
    dots[active]?.classList.remove('is-active');

    active = ((next % slides.length) + slides.length) % slides.length;

    // Re-trigger ken burns on the new active slide (photo mode only)
    if (!isVideoMode) {
      const img = slides[active].querySelector('.slide__image');
      if (img) {
        img.style.animation = 'none';
        // eslint-disable-next-line no-unused-expressions
        img.offsetHeight;
        img.style.animation = '';
      }
    }

    slides[active].classList.add('is-active');
    frags[active]?.classList.add('is-active');
    dots[active]?.classList.add('is-active');
    if (slideIndex) slideIndex.textContent = pad(active);

    playActiveVideo();
  };

  // Initial: make sure the first video plays
  playActiveVideo();

  const next = () => goTo(active + 1);
  const start = () => {
    stop();
    if (reduceMotion) return;
    timer = setInterval(next, INTERVAL);
  };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

  dots.forEach((d) => {
    d.addEventListener('click', () => {
      goTo(Number(d.dataset.go));
      start();
    });
  });

  if (hero) {
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { next(); start(); }
    if (e.key === 'ArrowLeft')  { goTo(active - 1); start(); }
  });

  start();

  /* --------------------------------------------------------------
     2. NAV — scrolled state + section underline + progress bar
     -------------------------------------------------------------- */
  const nav = $('#nav');
  const sections = ['experiences', 'collections', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const links = $$('.nav__link[data-section]');

  const onScroll = () => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('is-scrolled', y > window.innerHeight * 0.7);

    const bar = $('#scrollProgressBar');
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (y / max) * 100 : 0;
      bar.style.width = `${pct}%`;
    }

    let current = '';
    const probe = y + window.innerHeight * 0.35;
    for (const s of sections) {
      if (probe >= s.offsetTop) current = s.id;
    }
    links.forEach((l) => l.classList.toggle('is-current', l.dataset.section === current));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --------------------------------------------------------------
     3. MOBILE DRAWER
     -------------------------------------------------------------- */
  const toggle = $('#menuToggle');
  const drawer = $('#mobileDrawer');
  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      const open = drawer.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]') || e.target === drawer) {
        drawer.classList.remove('is-open');
        toggle.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    });
  }

  /* --------------------------------------------------------------
     4. REVEAL ON SCROLL
     -------------------------------------------------------------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-visible'));
  }

  /* --------------------------------------------------------------
     4b. GIANT FOOTER WORDMARK — letters stagger up when in view
     -------------------------------------------------------------- */
  const giant = $('.foot__giant');
  if (giant) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      const gio = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            giant.classList.add('is-in');
            gio.unobserve(e.target);
          }
        }
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
      gio.observe(giant);
    } else {
      giant.classList.add('is-in');
    }
  }

  /* --------------------------------------------------------------
     4c. OFFER DISCLOSURE — click title to reveal media + quotes
         Hooked-UX loop: trigger (visible explore →) · action (click) ·
         variable reward (gallery + testimonials) · investment (WhatsApp CTA).
         Heuristics: aria-expanded reflects state, Esc closes any open,
         videos lazy-load only when opened (preload="none" until then),
         videos pause when closed to save bandwidth.
     -------------------------------------------------------------- */
  const offers = $$('.offer[data-offer]');
  offers.forEach((article) => {
    const btn = article.querySelector('.offer__title-btn');
    const panel = article.querySelector('.offer__expand');
    const closeBtn = article.querySelector('.offer__expand-close');
    if (!btn || !panel) return;

    const openOffer = () => {
      // Close any other open offer first (one at a time keeps focus calm)
      offers.forEach((o) => {
        if (o !== article && o.classList.contains('is-open')) {
          o.classList.remove('is-open');
          const ob = o.querySelector('.offer__title-btn');
          const op = o.querySelector('.offer__expand');
          if (ob) ob.setAttribute('aria-expanded', 'false');
          if (op) op.setAttribute('aria-hidden', 'true');
          if (op) op.querySelectorAll('video').forEach((v) => { try { v.pause(); } catch (_) {} });
        }
      });

      article.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      panel.setAttribute('aria-hidden', 'false');

      // Lazy-load + autoplay every video inside this panel
      panel.querySelectorAll('video.offer__media-video').forEach((v) => {
        if (!v.src && v.dataset.src) {
          v.src = v.dataset.src;
          v.load();
        }
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => {/* ignore autoplay rejection */});
      });
    };

    const closeOffer = () => {
      article.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
      panel.querySelectorAll('video').forEach((v) => { try { v.pause(); } catch (_) {} });
    };

    btn.addEventListener('click', () => {
      if (article.classList.contains('is-open')) closeOffer(); else openOffer();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeOffer);
  });

  // Esc closes any open disclosure (a11y / user-control heuristic)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openOne = document.querySelector('.offer.is-open');
    if (openOne) {
      openOne.querySelector('.offer__expand-close')?.click();
      openOne.querySelector('.offer__title-btn')?.focus();
    }
  });

  /* --------------------------------------------------------------
     5. SMOOTH ANCHOR SCROLL
     -------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

})();
