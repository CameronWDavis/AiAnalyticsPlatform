import { useEffect } from "react";

const ROOT_CLASS = "js-reveal";
const VISIBLE_CLASS = "is-visible";
/** If the observer has not reported anything by now, stop relying on it. */
const FALLBACK_MS = 1200;

function show(el: HTMLElement, delay: number): void {
  if (delay <= 0) el.classList.add(VISIBLE_CLASS);
  else window.setTimeout(() => el.classList.add(VISIBLE_CLASS), delay);
}

function inViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
}

/**
 * Reveals elements carrying `.reveal` as they scroll into view.
 *
 * Built so it can never hide content it fails to reveal. The hiding styles are
 * scoped to a root class this hook adds, and there are three layers of safety:
 *
 *  1. Anything already on screen is revealed synchronously on setup — the hero
 *     never waits on an async observer callback.
 *  2. IntersectionObserver handles the rest (not a scroll listener, which
 *     reflows continuously and wrecks frame rate on mobile).
 *  3. If the observer has reported nothing at all after a short grace period,
 *     the hiding styles are dropped wholesale. Losing the animation is fine;
 *     losing the page is not — and the observer does get throttled or stubbed
 *     in embedded webviews, extensions, and some automation contexts.
 *
 * Pass a value that changes when new `.reveal` nodes mount to trigger a rescan.
 */
export function useReveal(rescanKey?: unknown): void {
  useEffect(() => {
    const root = document.documentElement;

    // Reduced motion: never hide anything, never animate.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove(ROOT_CLASS);
      return;
    }

    const pending = Array.from(document.querySelectorAll<HTMLElement>(`.reveal:not(.${VISIBLE_CLASS})`));
    if (pending.length === 0) return;

    root.classList.add(ROOT_CLASS);

    const reveal = (el: HTMLElement) => show(el, Number(el.dataset.revealDelay ?? 0));

    // Layer 1 — whatever is already on screen, straight away.
    const offscreen: HTMLElement[] = [];
    for (const el of pending) {
      if (inViewport(el)) reveal(el);
      else offscreen.push(el);
    }

    if (typeof IntersectionObserver !== "function") {
      root.classList.remove(ROOT_CLASS);
      return;
    }

    // Layer 2 — the rest, as they arrive.
    let observerReported = false;
    const observer = new IntersectionObserver(
      (entries) => {
        observerReported = true;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );

    for (const el of offscreen) observer.observe(el);

    // Layer 3 — the observer is silent, so stop depending on it.
    const fallback = window.setTimeout(() => {
      if (observerReported) return;
      observer.disconnect();
      root.classList.remove(ROOT_CLASS);
    }, FALLBACK_MS);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, [rescanKey]);
}
