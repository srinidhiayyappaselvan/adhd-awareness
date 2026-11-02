/**
 * confetti.js — MorningRoutineTracker celebration engine
 *
 * Two modes:
 *  • launchTaskConfetti()  — short burst (stars + candy shapes) fired after each task
 *  • launchAllDoneConfetti() — big full-screen cracker burst when all tasks complete
 *
 * Pure canvas — no external libraries.
 */

(function () {
  // ── Config ────────────────────────────────────────────────────────────────

  const TASK_PARTICLE_COUNT    = 80;
  const ALLDONE_PARTICLE_COUNT = 140;

  // Emoji shapes rendered as text particles for the "candy / star" feel
  const EMOJIS = ['⭐', '🍬', '🍭', '🎉', '✨', '🌟', '💫', '🎊', '🍫', '🎈'];

  // Fallback geometric colors when drawing plain confetti squares
  const COLORS = [
    '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
    '#ff922b', '#cc5de8', '#f06595', '#74c0fc',
    '#a9e34b', '#ff8787',
  ];

  // ── Canvas management ─────────────────────────────────────────────────────

  /** Get or create the shared full-screen canvas */
  function getCanvas() {
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      Object.assign(canvas.style, {
        position: 'fixed',
        top: '0', left: '0',
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: '99999',
      });
      document.body.appendChild(canvas);
    }
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    return canvas;
  }

  // ── Particle class ────────────────────────────────────────────────────────

  class Particle {
    /**
     * @param {number} x       - spawn x (0-1 relative to canvas width)
     * @param {number} y       - spawn y (0-1 relative to canvas height)
     * @param {string} type    - 'emoji' | 'rect' | 'circle'
     * @param {boolean} burst  - true = explosive upward burst (cracker), false = cascade from top
     */
    constructor(x, y, type, burst) {
      this.x    = x;
      this.y    = y;
      this.type = type;

      if (burst) {
        // Cracker — eject in all directions from a point
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 10;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - (Math.random() * 6); // bias upward
      } else {
        // Cascade — fall from top with slight horizontal drift
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = 2 + Math.random() * 4;
      }

      this.gravity   = 0.25;
      this.drag      = 0.97;
      this.rotation  = Math.random() * 360;
      this.rotSpeed  = (Math.random() - 0.5) * 8;
      this.size      = type === 'emoji' ? 20 + Math.random() * 16 : 8 + Math.random() * 8;
      this.color     = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.emoji     = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      this.alpha     = 1;
      // Burst particles (crackers) fade faster so the all-done celebration is snappy
      this.alphaDecay= burst
        ? 0.025 + Math.random() * 0.015   // ~1.2 s lifetime for cracker burst
        : 0.012 + Math.random() * 0.008;  // ~2.0 s lifetime for candy shower
      this.alive     = true;
    }

    update() {
      this.vy       += this.gravity;
      this.vx       *= this.drag;
      this.vy       *= this.drag;
      this.x        += this.vx;
      this.y        += this.vy;
      this.rotation += this.rotSpeed;
      this.alpha    -= this.alphaDecay;
      if (this.alpha <= 0) this.alive = false;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);

      if (this.type === 'emoji') {
        ctx.font       = `${this.size}px serif`;
        ctx.textAlign  = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, 0, 0);
      } else if (this.type === 'rect') {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
      } else {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── Animation loop ────────────────────────────────────────────────────────

  let _particles  = [];
  let _rafId      = null;
  let _canvas     = null;
  let _ctx        = null;

  function tick() {
    if (!_canvas) return;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
    _particles = _particles.filter((p) => p.alive);
    _particles.forEach((p) => { p.update(); p.draw(_ctx); });

    if (_particles.length > 0) {
      _rafId = requestAnimationFrame(tick);
    } else {
      _rafId = null;
      // Remove canvas when animation is done so it doesn't block anything
      _canvas.remove();
      _canvas = null;
      _ctx    = null;
    }
  }

  function startLoop() {
    if (_rafId) return;           // already running
    _rafId = requestAnimationFrame(tick);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Short celebration burst after a single task is ticked off.
   * Stars and candy rain down from the top of the viewport.
   */
  window.launchTaskConfetti = function () {
    _canvas = getCanvas();
    _ctx    = _canvas.getContext('2d');

    const w = _canvas.width;

    for (let i = 0; i < TASK_PARTICLE_COUNT; i++) {
      const type = Math.random() < 0.55 ? 'emoji' : (Math.random() < 0.5 ? 'rect' : 'circle');
      // Spawn randomly across the top 10% of the screen
      _particles.push(new Particle(
        Math.random() * w,
        -20 + Math.random() * (_canvas.height * 0.1),
        type,
        false   // cascade
      ));
    }
    startLoop();
  };

  /**
   * Big full-screen cracker burst when all tasks are complete.
   * Particles explode from multiple launch points.
   */
  window.launchAllDoneConfetti = function () {
    _canvas = getCanvas();
    _ctx    = _canvas.getContext('2d');

    const w = _canvas.width;
    const h = _canvas.height;

    // Three cracker launch points: bottom-left, centre, bottom-right
    const origins = [
      { x: w * 0.15, y: h * 0.85 },
      { x: w * 0.5,  y: h * 0.7  },
      { x: w * 0.85, y: h * 0.85 },
    ];

    for (let i = 0; i < ALLDONE_PARTICLE_COUNT; i++) {
      const origin = origins[i % origins.length];
      const type   = Math.random() < 0.45 ? 'emoji' : (Math.random() < 0.5 ? 'rect' : 'circle');
      _particles.push(new Particle(origin.x, origin.y, type, true));  // burst
    }

    startLoop();
  };

})();
