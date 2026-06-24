/* ============================================================
   TUSHAR DHERE — PORTFOLIO  |  app.js
   ============================================================
   Architecture: ES6 classes for canvas animations, IIFE for
   all UI logic. Deferred load (no render-blocking).
   ============================================================ */

/* ============================================================
   EMAILJS CONFIGURATION
   ────────────────────────────────────────────────────────────
   Step 1: Sign up free at https://www.emailjs.com/
   Step 2: Add a Gmail service → copy the Service ID
   Step 3: Create a template (vars: {{from_name}},
           {{from_email}}, {{subject}}, {{message}}) → copy Template ID
   Step 4: Account → API Keys → copy your Public Key
   Step 5: Paste all three values below, replacing 'YOUR_...'
   ────────────────────────────────────────────────────────────
   FALLBACK: if any value still starts with 'YOUR_', the
   contact form gracefully falls back to a mailto: link.
   ============================================================ */
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';

/* ============================================================
   FLOWER ANIMATION CLASS
   Canvas-drawn multi-ring lotus/peony centered on page.
   Petals bloom open when mouse moves, close when idle 1.5s.
   Flower leans (tilts) in the direction of mouse velocity.
   ============================================================ */
class FlowerAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    /* Bloom state */
    this.bloom       = 0;           // current (lerped)
    this.bloomTarget = 0;           // goal

    /* Rotation */
    this.rotation    = 0;           // base slow spin angle

    /* Tilt (lean toward mouse direction) */
    this.tiltX   = 0;
    this.tiltY   = 0;
    this.tiltStr = 0;               // 0–1 tilt strength

    /* Mouse velocity tracking */
    this.smVX  = 0;   this.smVY  = 0;  // smoothed velocity
    this.lastMX = 0;  this.lastMY = 0;

    /* Idle close timer */
    this._idleTimer = null;

    /* Canvas dimensions in CSS pixels */
    this.w = 0; this.h = 0;

    this._resize();
    this._bindEvents();
    this._loop();
  }

  /* ── Resize handling ── */
  _resize() {
    const dpr   = Math.min(window.devicePixelRatio || 1, 2);
    this.w      = window.innerWidth;
    this.h      = window.innerHeight;
    this.canvas.width  = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width  = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    /* Apply DPR scale once — draw in CSS px coordinates */
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── Mouse events ── */
  _bindEvents() {
    window.addEventListener('resize', () => this._resize());

    document.addEventListener('mousemove', (e) => {
      const dx = e.clientX - this.lastMX;
      const dy = e.clientY - this.lastMY;
      this.lastMX = e.clientX;
      this.lastMY = e.clientY;

      /* Exponential moving average for smooth velocity */
      this.smVX = this.smVX * 0.65 + dx * 0.35;
      this.smVY = this.smVY * 0.65 + dy * 0.35;

      const speed = Math.sqrt(this.smVX ** 2 + this.smVY ** 2);
      if (speed > 0.5) {
        this.tiltX   = this.smVX;
        this.tiltY   = this.smVY;
        this.tiltStr = Math.min(speed / 18, 1);
      }

      /* Open flower */
      this.bloomTarget = 1;

      /* Reset idle close timer */
      clearTimeout(this._idleTimer);
      this._idleTimer = setTimeout(() => {
        this.bloomTarget = 0;
        this.tiltStr     = 0;
      }, 1500);
    });
  }

  /* ── Draw one ring of petals ── */
  _petalRing(count, len, wid, baseRot, r, g, b, alpha) {
    const step = (Math.PI * 2) / count;
    const ctx  = this.ctx;
    for (let i = 0; i < count; i++) {
      ctx.save();
      ctx.rotate(baseRot + i * step);

      /* Linear gradient from root (bright) → tip (transparent) */
      const grad = ctx.createLinearGradient(0, 2, 0, len);
      grad.addColorStop(0,    `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.5,  `rgba(${r},${g},${b},${alpha * 0.72})`);
      grad.addColorStop(1,    `rgba(${r},${g},${b},${alpha * 0.15})`);

      /* Petal bezier — symmetric teardrop */
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.bezierCurveTo(-wid * 0.85, len * 0.22, -wid * 0.8, len * 0.62, 0, len);
      ctx.bezierCurveTo( wid * 0.8,  len * 0.62,  wid * 0.85, len * 0.22, 0, 2);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  /* ── Main draw loop ── */
  _loop() {
    const ctx = this.ctx;

    /* Smooth bloom lerp */
    this.bloom += (this.bloomTarget - this.bloom) * 0.038;

    /* Slow base rotation — speeds up when open */
    this.rotation += 0.004 * (0.2 + this.bloom * 0.8);

    /* Tilt decay */
    this.tiltStr *= 0.94;

    const b  = this.bloom;
    const r  = this.rotation;
    const cx = this.w / 2;
    const cy = this.h / 2;

    ctx.clearRect(0, 0, this.w, this.h);

    /* Lean offset — translates center toward mouse direction */
    const tAngle = Math.atan2(this.tiltY, this.tiltX);
    const leanX  = Math.cos(tAngle) * this.tiltStr * 28 * b;
    const leanY  = Math.sin(tAngle) * this.tiltStr * 18 * b;

    ctx.save();
    ctx.translate(cx + leanX, cy + leanY);
    /* Slight rotation toward lean direction */
    ctx.rotate(tAngle * this.tiltStr * 0.12 * b);

    /* ─ Stem ─ */
    const stemLen = 120 + 80 * b;
    ctx.save();
    ctx.strokeStyle = `rgba(60,95,65,${0.2 + 0.25 * b})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(12 * b, stemLen * 0.5, 2 * b, stemLen);
    ctx.stroke();
    ctx.restore();

    /* ─ Petal rings (outer → inner for correct overlap) ─
       Args: count, maxLen, maxWid, rotOffset, R, G, B, maxAlpha
       Length/width scale with bloom: min + (max-min)*bloom              */

    // Ring 1 — outermost, 14 petals, dark navy blue
    this._petalRing(14,  30 + 155*b,  6 + 28*b, r * 0.70,         55,  95, 170, 0.17 + 0.13*b);
    // Ring 2 — 12 petals, slate blue
    this._petalRing(12,  24 + 125*b,  5 + 23*b, r * 0.85 + 0.26,  90, 135, 205, 0.22 + 0.14*b);
    // Ring 3 — 10 petals, soft blue-white
    this._petalRing(10,  18 + 100*b,  4 + 19*b, r       + 0.55,  130, 168, 225, 0.28 + 0.14*b);
    // Ring 4 — 8 petals, pale blue
    this._petalRing( 8,  14 +  72*b,  4 + 15*b, r * 1.10 + 0.90, 175, 200, 238, 0.35 + 0.12*b);
    // Ring 5 — 6 petals, cream-white
    this._petalRing( 6,  10 +  46*b,  3 + 11*b, r * 1.20 + 1.30, 230, 230, 252, 0.55 + 0.12*b);
    // Ring 6 — innermost, 5 petals, blush-white
    this._petalRing( 5,   7 +  28*b,  2 +  7*b, r * 1.40 + 2.00, 255, 242, 252, 0.70 + 0.10*b);

    /* ─ Centre amber glow ─ */
    const glowR = 8 + 14 * b;
    const cg    = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
    cg.addColorStop(0,    `rgba(255,230,200,${0.55 + 0.30*b})`);
    cg.addColorStop(0.45, `rgba(220,170,130,${0.25 * b})`);
    cg.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.fill();

    ctx.restore();
    requestAnimationFrame(() => this._loop());
  }
}

/* ============================================================
   PARTICLE SYSTEM CLASS
   Ambient floating white dots — ported from Veldara reference.
   ============================================================ */
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.pool   = [];
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._loop();
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._spawn();
  }

  _spawn() {
    this.pool = [];
    const n = Math.floor((this.canvas.width * this.canvas.height) / 11000);
    for (let i = 0; i < n; i++) {
      this.pool.push({
        x:  Math.random() * this.canvas.width,
        y:  Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r:   Math.random() * 1.4  + 0.4,
        o:   Math.random() * 0.55 + 0.15,
      });
    }
  }

  _loop() {
    const { ctx, canvas, pool } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pool) {
      p.x += p.vx; p.y += p.vy;
      /* Wrap edges */
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.o})`;
      ctx.fill();
    }
    requestAnimationFrame(() => this._loop());
  }
}

/* ============================================================
   CURSOR GLOW
   ============================================================ */
class CursorGlow {
  constructor(el) {
    this.el = el;
    document.addEventListener('mousemove', (e) => {
      this.el.style.left    = e.clientX + 'px';
      this.el.style.top     = e.clientY + 'px';
      this.el.style.opacity = '1';
    });
    /* Use mouseout on document.documentElement for reliable viewport-leave detection */
    document.documentElement.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget && !e.toElement) {
        this.el.style.opacity = '0';
      }
    });
  }
}

/* ============================================================
   MAIN UI — IIFE
   All DOM-dependent code lives here, runs after DOMContentLoaded
   ============================================================ */
(function () {
  'use strict';

  /* ── EmailJS init ── */
  const EJS_OK = ![EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY]
    .some(v => v.startsWith('YOUR_'));
  if (EJS_OK && typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  /* ── Boot canvas animations ── */
  new FlowerAnimation(document.getElementById('flower-canvas'));
  new ParticleSystem(document.getElementById('particles-canvas'));
  new CursorGlow(document.getElementById('cursor-glow'));

  /* ================================================================
     TAB SYSTEM
  ================================================================ */
  const tabBtns      = document.querySelectorAll('.tab-btn');
  const tabPanels    = document.querySelectorAll('.tab-panel');
  const progDots     = document.querySelectorAll('.progress-dot');
  const mobTabLabel  = document.getElementById('mobTabLabel');

  function switchTab(target) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === target));
    tabPanels.forEach(p => p.classList.toggle('active', p.id === target));
    progDots.forEach(d => d.classList.toggle('active', d.dataset.tab === target));

    /* Update mobile active-tab label */
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${target}"]`);
    if (activeBtn && mobTabLabel) mobTabLabel.textContent = activeBtn.textContent;

    /* Trigger skill bars if navigating to resume */
    if (target === 'resume') triggerSkills();

    /* Scroll content area back to top */
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  tabBtns.forEach(b  => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  progDots.forEach(d => d.addEventListener('click', () => switchTab(d.dataset.tab)));

  /* ================================================================
     PORTFOLIO — ACCORDION + FILTERS
  ================================================================ */

  /* Toggle card expand/collapse — only one open at a time */
  window.toggleCard = function (thumb) {
    const card   = thumb.closest('.project-card');
    const body   = card.querySelector('.project-body');
    const isOpen = card.classList.contains('expanded');

    /* Close all open cards first */
    document.querySelectorAll('.project-card.expanded').forEach(c => {
      c.classList.remove('expanded');
      c.querySelector('.project-body').style.maxHeight = '0';
    });

    /* Open clicked card (if it was closed) */
    if (!isOpen) {
      card.classList.add('expanded');
      body.style.maxHeight = (body.scrollHeight + 80) + 'px';
    }
  };

  /* Keyboard support: Enter/Space on project-thumb triggers accordion */
  document.querySelectorAll('.project-thumb').forEach(thumb => {
    thumb.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.toggleCard(thumb);
      }
    });
  });

  /* Filter buttons */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const f = this.dataset.filter;
      document.querySelectorAll('.project-card').forEach(card => {
        const visible = f === 'all' || card.dataset.category === f;
        card.classList.toggle('hidden', !visible);
        /* Close expanded card if it becomes hidden */
        if (!visible && card.classList.contains('expanded')) {
          card.classList.remove('expanded');
          card.querySelector('.project-body').style.maxHeight = '0';
        }
      });
    });
  });

  /* ================================================================
     SKILL BARS ANIMATION
     Triggers every time Resume tab is visited for visual delight.
     IntersectionObserver also catches direct viewport entry.
  ================================================================ */
  function triggerSkills() {
    /* Reset first so transition replays */
    document.querySelectorAll('.skill-fill').forEach(el => {
      el.style.transition = 'none';
      el.style.width = '0%';
    });
    /* Force reflow so the reset registers before we animate */
    void document.getElementById('skillsGrid').offsetWidth;
    /* Now animate */
    document.querySelectorAll('.skill-fill').forEach(el => {
      el.style.transition = '';
      el.style.width = (el.dataset.width || 0) + '%';
    });
  }

  const skillsGrid = document.getElementById('skillsGrid');
  if (skillsGrid && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) triggerSkills();
    }, { threshold: 0.1 }).observe(skillsGrid);
  }

  /* ================================================================
     COPY EMAIL TO CLIPBOARD
  ================================================================ */
  const copyRow  = document.getElementById('copyRow');
  const copyBtn  = document.getElementById('copyBtn');
  const copyConf = document.getElementById('copyConfirm');

  function doCopy() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText('work.tushardhere@gmail.com').then(() => {
      copyConf.classList.add('show');
      const icon = copyBtn.querySelector('i');
      if (icon) { icon.className = 'fa fa-check'; }
      setTimeout(() => {
        copyConf.classList.remove('show');
        if (icon) icon.className = 'fa fa-copy';
      }, 2200);
    }).catch(() => {
      /* Silent fail — clipboard access denied */
    });
  }

  if (copyRow) copyRow.addEventListener('click', doCopy);
  if (copyBtn) copyBtn.addEventListener('click', e => { e.stopPropagation(); doCopy(); });

  /* ================================================================
     MOBILE DRAWER
     z-index hierarchy: overlay (299) < sidebar (300)
     Overlay is a DOM sibling of sidebar — never its parent.
     This ensures overlay can't intercept clicks on sidebar children.
  ================================================================ */
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburger');
  const closeBtn  = document.getElementById('sidebarClose');

  function openDrawer() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
  }

  if (hamburger) hamburger.addEventListener('click', openDrawer);
  if (closeBtn)  closeBtn.addEventListener('click',  closeDrawer);
  if (overlay)   overlay.addEventListener('click',   closeDrawer);

  /* Close drawer on Escape key */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });

  /* ================================================================
     CONTACT FORM — EmailJS with validation + spinner + fallback
  ================================================================ */
  window.sendEmail = function (e) {
    e.preventDefault();

    const nm  = document.getElementById('from_name');
    const em  = document.getElementById('from_email');
    const sb  = document.getElementById('subject');
    const ms  = document.getElementById('message');
    const btn = document.getElementById('sendBtn');
    const suc = document.getElementById('form-success');
    const err = document.getElementById('form-error');

    /* ── Inline validation ── */
    let valid = true;

    function validate(el, errId, testFn) {
      const fail = !testFn(el.value.trim());
      el.classList.toggle('invalid', fail);
      document.getElementById(errId).classList.toggle('show', fail);
      if (fail) valid = false;
    }

    validate(nm, 'err_name',    v => v.length > 0);
    validate(em, 'err_email',   v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
    validate(sb, 'err_subject', v => v.length > 0);
    validate(ms, 'err_message', v => v.length > 10);

    if (!valid) return;

    /* Hide previous toasts */
    suc.classList.add('hidden');
    err.classList.add('hidden');

    /* Show loading state */
    btn.disabled = true;
    btn.classList.add('loading');

    if (EJS_OK && typeof emailjs !== 'undefined') {
      /* ── EmailJS send ── */
      emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, '#contactForm')
        .then(() => {
          suc.classList.remove('hidden');
          document.getElementById('contactForm').reset();
          /* Clear validation classes on reset */
          [nm, em, sb, ms].forEach(el => el.classList.remove('invalid'));
        })
        .catch(() => err.classList.remove('hidden'))
        .finally(() => {
          btn.disabled = false;
          btn.classList.remove('loading');
        });
    } else {
      /* ── mailto: fallback ── */
      const subject = encodeURIComponent(sb.value.trim());
      const body    = encodeURIComponent(
        `Name: ${nm.value.trim()}\nEmail: ${em.value.trim()}\n\n${ms.value.trim()}`
      );
      window.location.href =
        `mailto:work.tushardhere@gmail.com?subject=${subject}&body=${body}`;
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  };

  /* Clear validation state on input change */
  ['from_name','from_email','subject','message'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        el.classList.remove('invalid');
        const errEl = document.getElementById('err_' + id.replace('from_', ''));
        if (errEl) errEl.classList.remove('show');
      });
    }
  });

  /* ================================================================
     BACK TO TOP BUTTON
  ================================================================ */
  const btt = document.getElementById('back-to-top');
  if (btt) {
    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

})(); /* end IIFE */
