/**
 * app.js — MorningRoutineTracker main bootstrap
 * Handles: loading screen, SPA navigation, dark mode, global events,
 *          and wires up all feature modules including the Task Tracker.
 */

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function initApp() {
  showLoadingScreen();
  populateConfigText();
  initNavigation();
  initDarkMode();
  initAssessment();
  initResults();
  initCharts();
  initMorningRoutine();
  initParentTips();
  initTeacherTips();
  initReferences();
  initRecommendationsSection();
  bindTrackerButtons();   // wire up static tracker buttons once
  bindGlobalEvents();

  window.addEventListener('load', () => {
    hideLoadingScreen();
    if (typeof AOS !== 'undefined') {
      AOS.init({ duration: 800, once: true, offset: 80 });
    }
  });
}

// ── Config text ───────────────────────────────────────────────────────────────
function populateConfigText() {
  document.querySelectorAll('[data-student-name]').forEach((el) => (el.textContent = APP_CONFIG.studentName));
  document.querySelectorAll('[data-student-class]').forEach((el) => (el.textContent = APP_CONFIG.studentClass));
  document.querySelectorAll('[data-school]').forEach((el)        => (el.textContent = APP_CONFIG.school));
  document.querySelectorAll('[data-project]').forEach((el)       => (el.textContent = APP_CONFIG.project));
  document.querySelectorAll('[data-disclaimer]').forEach((el)    => (el.textContent = APP_CONFIG.disclaimer));
}

// ── SPA Navigation ────────────────────────────────────────────────────────────
function initNavigation() {
  const navLinks      = document.querySelectorAll('.nav-link[data-section], .footer-link[data-section]');
  const navbarCollapse = document.getElementById('navbarNav');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      if (!section) return;
      navigateToSection(section);
      setActiveNav(section);
      // Collapse mobile menu
      if (navbarCollapse?.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(navbarCollapse).hide();
      }
    });
  });

  // Hero buttons
  document.getElementById('btn-start-assessment')?.addEventListener('click', () => {
    navigateToSection('assessment'); setActiveNav('assessment');
  });
  document.getElementById('btn-open-tracker')?.addEventListener('click', () => {
    navigateToSection('tracker'); setActiveNav('tracker');
  });
  document.getElementById('btn-learn-adhd')?.addEventListener('click', () => {
    navigateToSection('about'); setActiveNav('about');
  });
  document.getElementById('scroll-indicator')?.addEventListener('click', () => {
    navigateToSection('about'); setActiveNav('about');
  });

  // Navbar brand → home
  document.querySelector('.navbar-brand')?.addEventListener('click', (e) => {
    e.preventDefault(); navigateToSection('home'); setActiveNav('home');
  });

  // Inline link in About section
  document.getElementById('link-to-tracker')?.addEventListener('click', (e) => {
    e.preventDefault(); navigateToSection('tracker'); setActiveNav('tracker');
  });
}

/**
 * Show the target section and hide all others.
 * Runs any section-specific side-effects (charts refresh, tracker init, etc.)
 * @param {string} sectionId
 */
function navigateToSection(sectionId) {
  document.querySelectorAll('.page-section').forEach((sec) => sec.classList.remove('active'));

  const target = document.getElementById(sectionId);
  if (!target) return;

  target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Section-specific side-effects
  if (sectionId === 'results') {
    const results = loadResults();
    if (results) renderResults(results);
  }
  if (sectionId === 'statistics') {
    setTimeout(initCharts, 100);
    initRefSearch();
  }
  if (sectionId === 'tracker') {
    initTracker();   // always re-init so the view reflects current localStorage state
  }

  if (typeof AOS !== 'undefined') AOS.refresh();
}

/**
 * Mark the correct nav link as active.
 * @param {string} sectionId
 */
function setActiveNav(sectionId) {
  document.querySelectorAll('.nav-link[data-section]').forEach((l) => {
    l.classList.toggle('active', l.dataset.section === sectionId);
  });
}

// ── Dark mode ─────────────────────────────────────────────────────────────────
function initDarkMode() {
  applyTheme(loadDarkMode());
  document.getElementById('dark-mode-toggle')?.addEventListener('click', toggleDarkMode);
}

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'dark';
  applyTheme(isDark);
  saveDarkMode(isDark);
  refreshChartsForTheme();
}

function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const icon = document.querySelector('#dark-mode-toggle i');
  if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// ── Loading screen ────────────────────────────────────────────────────────────
function showLoadingScreen() {
  document.getElementById('loading-screen')?.classList.remove('hidden');
}

function hideLoadingScreen() {
  const loader = document.getElementById('loading-screen');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 600);
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
/**
 * Show a Bootstrap toast notification.
 * Also used by tasktracker.js — keep the signature (message) only.
 * @param {string} message
 */
function showToast(message) {
  const toastEl = document.getElementById('app-toast');
  const body    = document.getElementById('toast-message');
  if (!toastEl || !body) return;
  body.textContent = message;
  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 }).show();
}

// ── Global event bindings ─────────────────────────────────────────────────────
function bindGlobalEvents() {
  // Assessment nav buttons
  document.getElementById('btn-prev')?.addEventListener('click', prevQuestion);
  document.getElementById('btn-next')?.addEventListener('click', nextQuestion);
  // Pre-assessment "Begin Assessment" (enters child's age, then starts the questions)
  document.getElementById('btn-begin-assessment')?.addEventListener('click', beginAssessment);

  // Results buttons
  document.getElementById('btn-reset')?.addEventListener('click', resetAssessment);
  document.getElementById('btn-download-pdf')?.addEventListener('click', downloadPDFReport);
  document.getElementById('btn-download-offline')?.addEventListener('click', downloadOfflineAssessmentPDF);
  document.getElementById('btn-go-assessment')?.addEventListener('click', () => {
    navigateToSection('assessment'); setActiveNav('assessment');
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);

// ── Reference search ──────────────────────────────────────────────────────────
/**
 * Initialise live-filter search for the Research References list.
 * Safe to call multiple times — attaches listener only once via a flag.
 */
function initRefSearch() {
  const input = document.getElementById('ref-search');
  if (!input || input.dataset.searchInit) return;
  input.dataset.searchInit = '1';

  // Ensure no-results placeholder exists
  let noResults = document.getElementById('stat-ref-no-results');
  if (!noResults) {
    noResults = document.createElement('p');
    noResults.id        = 'stat-ref-no-results';
    noResults.className = 'stat-ref-no-results';
    noResults.setAttribute('role', 'status');
    noResults.setAttribute('aria-live', 'polite');
    noResults.textContent = 'No references match your search.';
    document.getElementById('stat-ref-list')?.after(noResults);
  }

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    const items = document.querySelectorAll('#stat-ref-list .stat-ref-item');
    let visibleCount = 0;

    items.forEach((item) => {
      // Search across title, meta, and the data-ref-text hint attribute
      const haystack = (
        (item.querySelector('.stat-ref-title')?.textContent  || '') + ' ' +
        (item.querySelector('.stat-ref-meta')?.textContent   || '') + ' ' +
        (item.dataset.refText || '')
      ).toLowerCase();

      const visible = !query || haystack.includes(query);
      item.setAttribute('aria-hidden', visible ? 'false' : 'true');
      visibleCount += visible ? 1 : 0;
    });

    noResults.style.display = (query && visibleCount === 0) ? 'block' : 'none';
  });
}
