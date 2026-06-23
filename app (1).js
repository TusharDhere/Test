/* ================================================================
   app.js — Portfolio site + Bloom hero interaction layer
   ================================================================

   ╔══════════════════════════════════════════════════════════════╗
   ║  EMAILJS CONFIGURATION  —  Fill these in before deploying    ║
   ╠══════════════════════════════════════════════════════════════╣
   ║                                                              ║
   ║  1. Sign up free at https://www.emailjs.com                  ║
   ║  2. Create an Email Service (Gmail, Outlook, etc.)           ║
   ║  3. Create an Email Template                                 ║
   ║  4. Copy your IDs into the three constants below            ║
   ║                                                              ║
   ║  See EMAILJS_SETUP.md for a step-by-step click-by-click      ║
   ║  walkthrough of the whole process (free tier — 200/month)   ║
   ║                                                              ║
   ╚══════════════════════════════════════════════════════════════╝ */

const EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID";   // e.g. "service_abc123"
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";  // e.g. "template_xyz789"
const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";   // e.g. "AbCdEfGhIjKlMnOpQ"

/* ----------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ================================================================
   1. BLOOM HERO INTERACTIONS
   ================================================================ */
(function initBloom () {
  /* ── menu toggle ── */
  const menuBtn  = $("#bloomMenuBtn");
  const menuDrop = $("#bloomMenuDropdown");

  if (menuBtn && menuDrop) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menuDrop.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", open);
    });

    document.addEventListener("click", (e) => {
      if (!menuBtn.contains(e.target)) {
        menuDrop.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });

    /* clicking a menu item navigates to that tab in the portfolio */
    $$(".bloom-menu-item", menuDrop).forEach((btn) => {
      btn.addEventListener("click", () => {
        menuDrop.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
        const targetTab = btn.dataset.gotoTab;
        if (targetTab) {
          const portfolioApp = $("#portfolio-app");
          if (portfolioApp) {
            portfolioApp.scrollIntoView({ behavior: "smooth" });
          }
          setTimeout(() => activateTab(targetTab), 320);
        }
      });
    });
  }

  /* ── "Explore Now" scrolls into the portfolio ── */
  const exploreBtn = $("#bloomExploreBtn");
  if (exploreBtn) {
    exploreBtn.addEventListener("click", () => {
      const target = $("#portfolio-app");
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  }

  /* ── scroll-down chevron ── */
  const scrollBtn = $("#bloomScrollDown");
  if (scrollBtn) {
    scrollBtn.addEventListener("click", () => {
      const target = $("#portfolio-app");
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  }
})();


/* ================================================================
   2. PARTICLES (canvas — background of portfolio section)
   ================================================================ */
(function initParticles () {
  const canvas = $("#particles-canvas");
  const app    = $("#portfolio-app");
  if (!canvas || !app) return;

  const ctx = canvas.getContext("2d");
  const isMobile = () => window.innerWidth < 640;
  const COUNT = () => (isMobile() ? 28 : 68);

  let particles = [];
  let W, H;

  function resize () {
    W = canvas.width  = app.offsetWidth;
    H = canvas.height = app.offsetHeight;
  }

  function mkParticle () {
    const gold = Math.random() > 0.45;
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      r:    Math.random() * 1.2 + 0.5,
      vx:   (Math.random() - 0.5) * 0.22,
      vy:  -(Math.random() * 0.28 + 0.08),
      opacity: Math.random() * 0.14 + 0.05,
      color: gold ? "240,192,64" : "255,255,255",
    };
  }

  function reset () {
    resize();
    const n = COUNT();
    particles = Array.from({ length: n }, mkParticle);
  }

  function tick () {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -4) p.y = H + 4;
      if (p.x < -4) p.x = W + 4;
      if (p.x > W + 4) p.x = -4;
    }
    requestAnimationFrame(tick);
  }

  reset();
  tick();

  const ro = new ResizeObserver(reset);
  ro.observe(app);
})();


/* ================================================================
   3. CURSOR GLOW (desktop only)
   ================================================================ */
(function initCursorGlow () {
  const glow = $("#cursor-glow");
  const app  = $("#portfolio-app");
  if (!glow || !app) return;
  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

  let ticking = false;

  app.addEventListener("mousemove", (e) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        glow.classList.add("is-active");
        ticking = false;
      });
      ticking = true;
    }
  });

  app.addEventListener("mouseleave", () => {
    glow.classList.remove("is-active");
  });
})();


/* ================================================================
   4. MOBILE DRAWER
   ================================================================ */
(function initDrawer () {
  const sidebar     = $("#sidebar");
  const overlay     = $("#drawerOverlay");
  const hamburger   = $("#hamburgerBtn");
  const closeBtn    = $("#drawerClose");

  if (!sidebar || !overlay || !hamburger) return;

  function openDrawer () {
    sidebar.classList.add("is-open");
    overlay.classList.add("is-visible");
    hamburger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer () {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.contains("is-open") ? closeDrawer() : openDrawer();
  });

  /* overlay click-catcher — closes drawer WITHOUT blocking sidebar clicks */
  overlay.addEventListener("click", closeDrawer);

  /* close button INSIDE sidebar */
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

  /* Close on Escape */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  /* Tab links inside sidebar do NOT close the drawer automatically —
     only the X button or overlay closes it. */
})();


/* ================================================================
   5. TABS
   ================================================================ */
function activateTab (name) {
  $$(".tab-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
  $$(".tab-panel").forEach((p) => {
    const isTarget = p.dataset.tabPanel === name;
    p.classList.toggle("is-active", isTarget);
  });

  /* sync scroll dots */
  $$(".scroll-dot").forEach((d) => d.classList.toggle("is-active", d.dataset.dot === name));

  /* trigger skill bars when resume tab opens */
  if (name === "resume") animateSkillBars();

  /* trigger stagger animations */
  const panel = $(`[data-tab-panel="${name}"]`);
  if (panel) {
    /* restart reveal animations by re-triggering animation */
    $$(".reveal, .reveal-stagger > *", panel).forEach((el) => {
      el.style.animationName = "none";
      el.offsetHeight; /* reflow */
      el.style.animationName = "";
    });
  }
}

(function initTabs () {
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });
})();


/* ================================================================
   6. SCROLL POSITION DOTS (desktop)
   ================================================================ */
(function initScrollDots () {
  const dots    = $("#scrollDots");
  const appEl   = $("#portfolio-app");
  if (!dots || !appEl) return;

  /* Show dots once the portfolio app is in view */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      dots.classList.toggle("is-visible", entry.isIntersecting);
    });
  }, { threshold: 0.1 });
  io.observe(appEl);

  $$(".scroll-dot", dots).forEach((dot) => {
    dot.addEventListener("click", () => {
      activateTab(dot.dataset.dot);
      /* also scroll to portfolio if not visible yet */
      appEl.scrollIntoView({ behavior: "smooth" });
    });
  });
})();


/* ================================================================
   7. SKILL BARS
   ================================================================ */
function animateSkillBars () {
  $$(".skill-fill").forEach((bar) => {
    const target = bar.dataset.width || "0";
    /* Reset then animate */
    bar.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.width = `${target}%`;
      });
    });
  });
}


/* ================================================================
   8. PROJECT ACCORDION + FILTER
   ================================================================ */
(function initPortfolio () {
  const list = $("#projectsList");
  if (!list) return;

  /* ── Sort cards newest-first ── */
  const cards = $$(".project-card", list);
  cards
    .sort((a, b) => new Date(b.dataset.date) - new Date(a.dataset.date))
    .forEach((c) => list.appendChild(c));

  /* ── Accordion ── */
  let expandedCard = null;

  function collapseCard (card) {
    const body = $(".project-body", card);
    card.classList.remove("is-expanded");
    body.style.maxHeight = "0px";
  }

  function expandCard (card) {
    const body = $(".project-body", card);
    card.classList.add("is-expanded");
    /* measure the inner height so CSS transition works */
    const inner = $(".project-body-inner", card);
    body.style.maxHeight = inner.scrollHeight + 32 + "px";
  }

  cards.forEach((card) => {
    const head = $(".project-head", card);
    head.addEventListener("click", () => {
      const alreadyOpen = card.classList.contains("is-expanded");
      if (expandedCard && expandedCard !== card) collapseCard(expandedCard);
      if (alreadyOpen) {
        collapseCard(card);
        expandedCard = null;
      } else {
        expandCard(card);
        expandedCard = card;
      }
    });
  });

  /* ── Filter buttons ── */
  const filterRow   = $("#filterRow");
  const emptyState  = $("#emptyState");
  if (!filterRow) return;

  filterRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    $$(".filter-btn", filterRow).forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    const filter = btn.dataset.filter;

    /* collapse any open card first */
    if (expandedCard) { collapseCard(expandedCard); expandedCard = null; }

    let anyVisible = false;
    cards.forEach((card) => {
      const categories = (card.dataset.categories || "").split(" ");
      const show = filter === "all" || categories.includes(filter);
      card.classList.toggle("is-filtered-out", !show);
      if (show) anyVisible = true;
    });

    if (emptyState) emptyState.hidden = anyVisible;
  });
})();


/* ================================================================
   9. CONTACT FORM — EmailJS + mailto fallback
   ================================================================ */
(function initContactForm () {
  const form       = $("#contactForm");
  const submitBtn  = $("#submitBtn");
  const statusEl   = $("#formStatus");
  if (!form || !submitBtn || !statusEl) return;

  const PLACEHOLDERS = ["YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", "YOUR_PUBLIC_KEY"];
  const emailJsReady = !PLACEHOLDERS.some((p) =>
    [EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY].includes(p)
  );

  /* Initialise EmailJS only if keys are filled in */
  if (emailJsReady && typeof emailjs !== "undefined") {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  function setLoading (isLoading) {
    submitBtn.disabled = isLoading;
    $(".submit-btn-text", submitBtn).hidden = isLoading;
    $(".submit-btn-spinner", submitBtn).hidden = !isLoading;
  }

  function showStatus (msg, isSuccess) {
    statusEl.hidden = false;
    statusEl.className = "form-status " + (isSuccess ? "is-success" : "is-error");
    statusEl.textContent = msg;
  }

  function hideStatus () {
    statusEl.hidden = true;
    statusEl.className = "form-status";
    statusEl.textContent = "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideStatus();

    /* Basic HTML5 validation */
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setLoading(true);

    if (!emailJsReady) {
      /* ── mailto fallback ── */
      const name    = form.from_name.value.trim();
      const email   = form.from_email.value.trim();
      const subject = form.subject.value.trim();
      const message = form.message.value.trim();
      const body    = encodeURIComponent(`From: ${name} <${email}>\n\n${message}`);
      window.location.href = `mailto:alex.morgan@example.com?subject=${encodeURIComponent(subject)}&body=${body}`;
      setLoading(false);
      showStatus("📬 Opening your mail client… (Configure EmailJS to send without leaving this page.)", false);
      return;
    }

    /* ── EmailJS send ── */
    try {
      await emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form);
      showStatus("✅ Message sent! I'll get back to you shortly.", true);
      form.reset();
    } catch (err) {
      console.error("EmailJS error:", err);
      showStatus("❌ Something went wrong. Please try emailing directly at alex.morgan@example.com", false);
    } finally {
      setLoading(false);
    }
  });

  /* Clear status on any input change */
  form.addEventListener("input", hideStatus);
})();


/* ================================================================
   10. SPIN-BORDER — contact form uses same spin-border class;
       we also ensure the border animates while the form is focused
   ================================================================ */
(function initSpinBorderFocus () {
  const contactForm = $(".contact-form.spin-border");
  if (!contactForm) return;
  contactForm.addEventListener("focusin", () => contactForm.classList.add("is-focused"));
  contactForm.addEventListener("focusout", (e) => {
    if (!contactForm.contains(e.relatedTarget)) contactForm.classList.remove("is-focused");
  });
})();


/* ================================================================
   11. INTERSECTION OBSERVER — animate skill bars when resume tab
       first becomes visible (handles initial tab=resume deep-links)
   ================================================================ */
(function initSkillObserver () {
  const resumePanel = $("#tab-resume");
  if (!resumePanel) return;

  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateSkillBars();
      io.disconnect();
    }
  }, { threshold: 0.2 });

  io.observe(resumePanel);
})();


/* ================================================================
   12. HASH ROUTING — support ?tab=resume deep-links
   ================================================================ */
(function initHashRouting () {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  const validTabs = ["about", "resume", "portfolio", "contact"];
  if (tab && validTabs.includes(tab)) {
    activateTab(tab);
    const app = $("#portfolio-app");
    if (app) {
      setTimeout(() => app.scrollIntoView({ behavior: "smooth" }), 200);
    }
  }
})();


/* ================================================================
   13. REDUCE MOTION — honour user preference for all scroll
       and animation triggers
   ================================================================ */
(function initReducedMotion () {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  /* Kill the avatar ring spin */
  const ring = $(".avatar-ring");
  if (ring) ring.style.animation = "none";
  /* Kill icon floats */
  $$(".service-icon, .cert-icon, .bloom-logo-mark, .bloom-icon-circle").forEach((el) => {
    el.style.animation = "none";
  });
})();
