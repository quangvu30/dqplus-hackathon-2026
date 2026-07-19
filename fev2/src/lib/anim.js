import gsap from 'gsap';

export const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function riseIn(scope, selector = '.rise') {
  if (!scope || prefersReduced()) return;
  const targets = scope.querySelectorAll ? scope.querySelectorAll(selector) : [];
  if (!targets.length) return;
  gsap.from(targets, {
    y: 18,
    autoAlpha: 0,
    duration: 0.5,
    ease: 'power2.out',
    stagger: 0.06,
    clearProps: 'all',
  });
}

// Livelier entrance for the landing page: elements pop/spring into place with a
// bit of overshoot, instead of just fading up. Kept separate from riseIn so the
// rest of the app (dense data screens) keeps the calmer, subtle fade.
export function popIn(scope, selector = '.rise') {
  if (!scope || prefersReduced()) return;
  const targets = scope.querySelectorAll ? scope.querySelectorAll(selector) : [];
  if (!targets.length) return;
  gsap.from(targets, {
    y: 26,
    scale: 0.92,
    autoAlpha: 0,
    duration: 0.7,
    ease: 'back.out(1.8)',
    stagger: 0.08,
    clearProps: 'all',
  });
}
