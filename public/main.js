/* ==========================================================================
   CEWÁMICA — interaction layer
   --------------------------------------------------------------------------
   - Hero: 4-slide carousel. Each slide fades in/out (1.4s) and plays a slow
     Ken Burns from a per-slide origin (bottom-left, bottom-right, top-left,
     top-right). The dots reflect the active slide and can be clicked.
     Pauses on hover; resumes on leave; respects prefers-reduced-motion.
   - Nav: gains a frosted backdrop after scrolling past the hero, and the
     current section's link gets underlined while you read it.
   - Mobile: drawer toggles with the hamburger.
   - Reveal: IntersectionObserver to fade content in as it enters the viewport.
   - Scroll progress: top bar fills based on document scroll.
   ========================================================================== */

(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------------
     1. HERO CAROUSEL
     -------------------------------------------------------------- */
  const slides = $$('#heroSlides .slide');
  const dots   = $$('#heroDots .dot');
  const meta   = $('#slideMeta');

  const META = ['i. wild clay', 'ii. pit fired', 'iii. pieces', 'iv. intuitive'];

  let active = 0;
  let timer = null;
  const INTERVAL = 5200; // 3s readable + 1.4s fade margin + 0.8s breath

  const goTo = (next) => {
    if (next === active) return;
    slides[active].classList.remove('is-active');
    dots[active].classList.remove('is-active');

    active = (next + slides.length) % slides.length;

    // Force a reflow so animation re-triggers on the new active slide image
    const img = slides[active].querySelector('.slide__image');
    if (img) {
      img.style.animation = 'none';
      // eslint-disable-next-line no-unused-expressions
      img.offsetHeight;
      img.style.animation = '';
    }

    slides[active].classList.add('is-active');
    dots[active].classList.add('is-active');
    if (meta) meta.textContent = META[active] || '';
  };

  const next = () => goTo(active + 1);

  const start = () => {
    stop();
    if (reduceMotion) return;
    timer = setInterval(next, INTERVAL);
  };
  const stop = () => {
    if (timer) { clearInterval(timer); timer = null; }
  };

  // Dot interactions
  dots.forEach((d) => {
    d.addEventListener('click', () => {
      const i = Number(d.dataset.go);
      goTo(i);
      start(); // restart timer from now
    });
  });

  // Pause on hero hover
  const hero = $('.hero');
  if (hero) {
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    // Pause when tab not visible to save cycles
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { next(); start(); }
    if (e.key === 'ArrowLeft')  { goTo(active - 1); start(); }
  });

  start();

  /* --------------------------------------------------------------
     1b. SPOTLIGHT — a radial gradient circle inside the text clip-path
         tracks the cursor. Easing is delegated to CSS transitions on
         cx/cy, so we just write the latest target every pointer event.
     -------------------------------------------------------------- */
  const spotlights = $$('.spotlight');
  const VB_W = 1600;       // matches the SVG viewBox
  const VB_H = 720;
  const CENTER_X = VB_W / 2;
  const CENTER_Y = VB_H / 2;

  const setSpotlight = (x, y) => {
    const cx = Math.max(-150, Math.min(VB_W + 150, x)).toFixed(1);
    const cy = Math.max(-150, Math.min(VB_H + 150, y)).toFixed(1);
    for (const s of spotlights) {
      s.setAttribute('cx', cx);
      s.setAttribute('cy', cy);
    }
  };

  const setSpotFromPointer = (clientX, clientY) => {
    const svg = document.querySelector('.slide.is-active .glass-text');
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    // Map pointer → viewBox coords, accounting for preserveAspectRatio="xMidYMid meet"
    const ratioSvg = VB_W / VB_H;
    const ratioBox = r.width / r.height;
    let scale, offsetX = 0, offsetY = 0;
    if (ratioBox > ratioSvg) {
      scale = r.height / VB_H;
      offsetX = (r.width - VB_W * scale) / 2;
    } else {
      scale = r.width / VB_W;
      offsetY = (r.height - VB_H * scale) / 2;
    }
    setSpotlight(
      (clientX - r.left - offsetX) / scale,
      (clientY - r.top  - offsetY) / scale
    );
  };

  if (hero && !reduceMotion) {
    let resetTimer = 0;
    hero.addEventListener('mousemove', (e) => {
      hero.classList.add('is-cursor-active');
      setSpotFromPointer(e.clientX, e.clientY);
    }, { passive: true });
    hero.addEventListener('mouseleave', () => {
      hero.classList.remove('is-cursor-active');
      setSpotlight(CENTER_X, CENTER_Y);
    });
    hero.addEventListener('touchmove', (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      hero.classList.add('is-cursor-active');
      setSpotFromPointer(t.clientX, t.clientY);
    }, { passive: true });
    hero.addEventListener('touchend', () => {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        hero.classList.remove('is-cursor-active');
        setSpotlight(CENTER_X, CENTER_Y);
      }, 1200);
    });
  }

  /* --------------------------------------------------------------
     2. NAV — frosted state + active section underline
     -------------------------------------------------------------- */
  const nav = $('#nav');
  const sections = ['about', 'pieces', 'barro', 'medium', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const links = $$('.nav__link[data-section]');

  const onScroll = () => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('is-scrolled', y > window.innerHeight * 0.6);

    // Scroll progress
    const bar = $('#scrollProgressBar');
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (y / max) * 100 : 0;
      bar.style.width = `${pct}%`;
    }

    // Active section
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
     5. SMOOTH ANCHOR SCROLL with header offset
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
