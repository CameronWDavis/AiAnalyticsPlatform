import { useEffect, useRef } from "react";

/**
 * The landing page's signature element: a field of sampled points drifting
 * through a 3D wave, projected with perspective onto a 2D canvas.
 *
 * It is deliberately not a chart — no axis, no values, nothing to misread. The
 * form is borrowed from the subject instead: usage arrives as a signal, and
 * this is that signal being sampled on a grid.
 *
 * Performance notes: one canvas, no library, no per-frame allocation. The loop
 * stops entirely when the canvas scrolls out of view or the tab is hidden, and
 * `prefers-reduced-motion` renders a single static frame instead of animating.
 */

const COLS = 118;
const ROWS = 42;
const SPACING = 13;
const ROW_DEPTH = 40;
const FOCAL = 720;
/** A low camera, close to the surface, so crests overlap and read edge-on. */
const CAMERA_Y = 44;
const CAMERA_Z = 430;
const POINTS = COLS * ROWS;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const LIGHT_NEAR: Rgb = { r: 5, g: 112, b: 76 };
const LIGHT_FAR: Rgb = { r: 116, g: 204, b: 176 };
const DARK_NEAR: Rgb = { r: 64, g: 233, b: 170 };
const DARK_FAR: Rgb = { r: 14, g: 104, b: 80 };

function mix(a: Rgb, b: Rgb, t: number): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `${r},${g},${bl}`;
}

export function ParticleWave({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const context = el.getContext("2d");
    if (!context) return;
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;
    let visible = true;

    const isDark = () => {
      const stamp = document.documentElement.getAttribute("data-theme");
      if (stamp === "dark") return true;
      if (stamp === "light") return false;
      return matchMedia("(prefers-color-scheme: dark)").matches;
    };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Pre-allocated so the animation loop never allocates.
    const px = new Float32Array(POINTS);
    const py = new Float32Array(POINTS);
    const pr = new Float32Array(POINTS);
    const pa = new Float32Array(POINTS);
    const pd = new Float32Array(POINTS);

    function draw(time: number) {
      const dark = isDark();
      const near = dark ? DARK_NEAR : LIGHT_NEAR;
      const far = dark ? DARK_FAR : LIGHT_FAR;

      ctx.clearRect(0, 0, width, height);

      const t = time / 1000;
      const originX = width / 2;

      let minY = Infinity;
      let maxY = -Infinity;
      let n = 0;

      // Pass 1 — project every point and track the vertical extent.
      for (let row = ROWS - 1; row >= 0; row--) {
        const z = row * ROW_DEPTH + 60;
        const depth = row / (ROWS - 1);
        const scale = FOCAL / (z + CAMERA_Z);

        for (let col = 0; col < COLS; col++) {
          const x = (col - (COLS - 1) / 2) * SPACING;

          // Two travelling waves plus a slow swell, so the surface never
          // visibly repeats while someone is looking at it.
          const y =
            Math.sin(x * 0.0108 + t * 0.62 + row * 0.15) * 48 +
            Math.sin(x * 0.0262 - t * 0.42 + row * 0.075) * 23 +
            Math.sin(row * 0.19 - t * 0.3) * 17;

          // Crests read brighter and larger; distance fades toward the surface.
          const crest = (y + 88) / 176;
          const alpha = (dark ? 0.95 : 0.98) * (1 - depth * 0.6) * (0.42 + crest * 0.62);
          if (alpha <= 0.012) continue;

          const sy = (CAMERA_Y - y) * scale;
          px[n] = originX + x * scale;
          py[n] = sy;
          pr[n] = Math.max(0.32, scale * 1.4 * (0.55 + crest * 0.62));
          pa[n] = alpha;
          pd[n] = depth;
          if (sy < minY) minY = sy;
          if (sy > maxY) maxY = sy;
          n++;
        }
      }

      if (n === 0) return;

      // Fit the projected wave to the canvas: centre it, and shrink only if it
      // would overflow. Keeps the composition right at any card height.
      const span = maxY - minY;
      const pad = height * 0.06;
      const fit = span > height - pad * 2 ? (height - pad * 2) / span : 1;
      const offset = (height - span * fit) / 2 - minY * fit;

      // Pass 2 — paint back to front so nearer points cover farther ones.
      for (let i = 0; i < n; i++) {
        const y = py[i]! * fit + offset;
        if (y < -20 || y > height + 20) continue;
        const x = px[i]!;
        if (x < -20 || x > width + 20) continue;

        ctx.fillStyle = `rgba(${mix(near, far, pd[i]!)},${pa[i]!.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, pr[i]! * fit, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop(time: number) {
      draw(time);
      if (running) frame = requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduceMotion) return;
      running = true;
      frame = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(frame);
    }

    resize();
    draw(0);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (!running) draw(performance.now());
    });
    resizeObserver.observe(canvas);

    // Only burn frames while the wave is actually on screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible && !document.hidden) start();
        else stop();
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Repaint on theme change so the palette follows the page.
    const themeObserver = new MutationObserver(() => {
      if (!running) draw(performance.now());
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const scheme = matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      if (!running) draw(performance.now());
    };
    scheme.addEventListener("change", onScheme);

    return () => {
      stop();
      resizeObserver.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      scheme.removeEventListener("change", onScheme);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label="Animated field of particles forming a flowing wave"
    />
  );
}
