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
   ────────────────────────────────────────────────────────────
   Large canvas lotus/peony centered on page.
   Mouse still (1.5s) → petals close into tight bud.
   Mouse moves       → petals bloom open + flower leans
                        dramatically toward mouse direction.
   Reference: the Veldara flower screenshot provided by user.
   ============================================================ */
class FlowerAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    this.bloom       = 0;      // 0 = closed bud, 1 = fully open (lerped)
    this.bloomTarget = 0;
    this.rotation    = 0;      // slow continuous spin angle

    this.tiltX = 0; this.tiltY = 0;  // mouse direction vector
    this.tiltStr = 0;                 // lean strength 0–1

    this.smVX = 0; this.smVY = 0;    // smoothed mouse velocity (EMA)
    this.lastMX = 0; this.lastMY = 0;
    this._idleTimer = null;

    this.w = 0; this.h = 0;

    /* Pre-compute per-petal length variation (60 values).
       Each petal gets a unique multiplier → organic, natural look.
       Fixed at construction so variation is consistent each frame. */
    this._var = Array.from({ length: 60 },
      () => 0.78 + Math.random() * 0.44);

    this._resize();
    this._bindEvents();
    this._loop();
  }

  /* ── Canvas resize / DPR ── */
  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width  = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.canvas.style.width  = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    /* Scale once — all drawing uses CSS px coordinates */
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

      /* EMA smoothing for jitter-free velocity */
      this.smVX = this.smVX * 0.58 + dx * 0.42;
      this.smVY = this.smVY * 0.58 + dy * 0.42;

      const speed = Math.sqrt(this.smVX ** 2 + this.smVY ** 2);
      if (speed > 0.25) {
        this.tiltX   = this.smVX;
        this.tiltY   = this.smVY;
        this.tiltStr = Math.min(speed / 11, 1);
      }

      /* Open flower */
      this.bloomTarget = 1;

      /* Idle → close after 1.5 s of no mouse movement */
      clearTimeout(this._idleTimer);
      this._idleTimer = setTimeout(() => {
        this.bloomTarget = 0;
        this.tiltStr     = 0;
      }, 1500);
    });
  }

  /* ── Draw one ring of petals ──
     count   : number of petals in this ring
     minL/maxL: petal length range (CSS px) — scales with bloom
     minW/maxW: petal half-width range
     baseRot  : ring rotation offset (radians)
     r,g,b    : base petal colour
     alpha    : max opacity for this ring
     varOff   : offset into this._var for petal-size variation    */
  _ring(count, minL, maxL, minW, maxW, baseRot, r, g, b, alpha, varOff) {
    const ctx  = this.ctx;
    const bl   = this.bloom;
    const L0   = minL + (maxL - minL) * bl;   // current base length
    const W0   = minW + (maxW - minW) * bl;   // current base width
    const step = (Math.PI * 2) / count;

    /* Fade in faster than bloom so petals appear vividly */
    const a = alpha * Math.min(1, bl * 1.9);

    for (let i = 0; i < count; i++) {
      const v  = this._var[(varOff + i) % this._var.length];
      const L  = L0 * v;
      const W  = W0 * (0.82 + v * 0.18);

      if (L < 2) continue;  // skip when nearly invisible (closed bud)

      ctx.save();
      ctx.rotate(baseRot + i * step);

      /* 4-stop gradient: luminous at root, bright ridge, fade at tip */
      const gr = ctx.createLinearGradient(0, 1, 0, L);
      gr.addColorStop(0,    `rgba(${r},${g},${b},${a})`);
      gr.addColorStop(0.25, `rgba(${Math.min(r+20,255)},${Math.min(g+16,255)},${Math.min(b+12,255)},${a*0.93})`);
      gr.addColorStop(0.60, `rgba(${r},${g},${b},${a * 0.55})`);
      gr.addColorStop(1,    `rgba(${r},${g},${b},${a * 0.03})`);

      /* Organic elongated teardrop bezier */
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.bezierCurveTo(-W * 0.58, L * 0.13, -W * 0.96, L * 0.58, 0, L);
      ctx.bezierCurveTo( W * 0.96, L * 0.58,  W * 0.58, L * 0.13, 0, 1);
      ctx.closePath();
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.restore();
    }
  }

  /* ── Main RAF draw loop ── */
  _loop() {
    const ctx = this.ctx;

    /* Smooth bloom transition */
    this.bloom += (this.bloomTarget - this.bloom) * 0.042;

    /* Slow continuous rotation, accelerates when open */
    this.rotation += 0.0026 * (0.16 + this.bloom * 0.84);

    /* Tilt strength decays each frame */
    this.tiltStr *= 0.905;

    const b  = this.bloom;
    const ro = this.rotation;
    const cx = this.w / 2;
    const cy = this.h / 2;

    ctx.clearRect(0, 0, this.w, this.h);

    /* ── Lean toward mouse direction ──
       Translation moves centre off-axis; rotation tilts whole flower.
       Combined effect matches the "blown in the wind" look in reference. */
    const tA    = Math.atan2(this.tiltY, this.tiltX);
    const ts    = this.tiltStr;
    const leanX = Math.cos(tA) * ts * 75 * b;
    const leanY = Math.sin(tA) * ts * 55 * b;

    ctx.save();
    ctx.translate(cx + leanX, cy + leanY);
    ctx.rotate(tA * ts * 0.30 * b);   // up to ~17° rotation at full tilt

    /* ── Outer ambient halo (visible when bloom > 20%) ── */
    if (b > 0.18) {
      const hR  = 185 + 75 * b;
      const hal = ctx.createRadialGradient(0, 0, hR * 0.32, 0, 0, hR);
      hal.addColorStop(0,   `rgba(75, 112, 182, ${0.06 * b})`);
      hal.addColorStop(0.6, `rgba(50,  80, 150, ${0.025 * b})`);
      hal.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(0, 0, hR, 0, Math.PI * 2);
      ctx.fillStyle = hal;
      ctx.fill();
    }

    /* ── Curved stem ── */
    const sL = 88 + 125 * b;
    ctx.save();
    ctx.strokeStyle = `rgba(50, 85, 54, ${0.10 + 0.35 * b})`;
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(22 * b, sL * 0.50, 5 * b, sL);
    ctx.stroke();
    ctx.restore();

    /* ── Petal rings — drawn outer → inner for natural overlap ──
       _ring(count, minLen, maxLen, minWid, maxWid,
             baseRot, R, G, B, alpha, varOff)               */

    // Ring 1 — 14 petals, dark navy-blue, long outer fringe
    this._ring(14, 16, 258, 4, 45, ro * 0.66,           48,  75, 148,  0.23,  0);
    // Ring 2 — 12 petals, slate blue
    this._ring(12, 13, 202, 3, 37, ro * 0.80 + 0.23,    76, 116, 184,  0.29, 14);
    // Ring 3 — 10 petals, medium blue-white
    this._ring(10, 10, 158, 3, 29, ro       + 0.50,    112, 152, 215,  0.37, 26);
    // Ring 4 — 8 petals, pale ice-blue
    this._ring( 8,  7, 114, 2, 23, ro * 1.14 + 0.86,  155, 188, 236,  0.48, 36);
    // Ring 5 — 6 petals, lavender-cream
    this._ring( 6,  5,  76, 2, 17, ro * 1.26 + 1.24,  208, 216, 248,  0.66, 44);
    // Ring 6 — 5 petals, blush white (innermost, brightest)
    this._ring( 5,  3,  47, 1, 11, ro * 1.46 + 1.92,  248, 242, 255,  0.84, 50);

    /* ── Centre amber / gold glow ── */
    const gR = 4 + 22 * b;
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, gR);
    cg.addColorStop(0,    `rgba(255, 238, 195, ${0.60 + 0.35 * b})`);
    cg.addColorStop(0.30, `rgba(242, 202, 148, ${0.40 * b})`);
    cg.addColorStop(0.68, `rgba(205, 158, 102, ${0.16 * b})`);
    cg.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, gR, 0, Math.PI * 2);
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
