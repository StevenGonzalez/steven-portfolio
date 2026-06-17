import { type MotionValue, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

// How far (px) beyond a card's edge the glow fully fades out.
const FALLOFF = 240;

type GlowTarget = {
  el: HTMLElement;
  glowX: MotionValue<number>;
  glowY: MotionValue<number>;
  glowOpacity: MotionValue<number>;
};

// A single shared pointer tracker drives every glowing panel. One set of
// window listeners updates a shared cursor position; all panels' rects are
// read together inside one rAF tick, so a page full of glow panels costs at
// most one layout reflow per frame (only when the pointer actually moved)
// instead of one getBoundingClientRect per panel per pointermove.
const targets = new Set<GlowTarget>();
let pointerX = -9999;
let pointerY = -9999;
let rafId = 0;
let dirty = false;
let listening = false;

function flush() {
  rafId = 0;
  if (!dirty) return;
  dirty = false;
  for (const t of targets) {
    const r = t.el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    t.glowX.set(((pointerX - r.left) / r.width) * 100);
    t.glowY.set(((pointerY - r.top) / r.height) * 100);

    // Distance from the card's nearest edge (0 when the cursor is over it),
    // so the fade works regardless of the card's size or position.
    const nearX = Math.max(r.left, Math.min(pointerX, r.right));
    const nearY = Math.max(r.top, Math.min(pointerY, r.bottom));
    const dist = Math.hypot(pointerX - nearX, pointerY - nearY);
    t.glowOpacity.set(Math.max(0, 1 - dist / FALLOFF));
  }
}

function schedule() {
  if (!rafId) rafId = requestAnimationFrame(flush);
}

function onMove(e: PointerEvent) {
  if (e.pointerType !== "mouse") return;
  pointerX = e.clientX;
  pointerY = e.clientY;
  dirty = true;
  schedule();
}

function reset() {
  pointerX = -9999;
  pointerY = -9999;
  dirty = true;
  schedule();
}

function subscribe(target: GlowTarget) {
  targets.add(target);
  if (!listening) {
    listening = true;
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
  }
  return () => {
    targets.delete(target);
  };
}

// Tracks the global cursor and exposes a glow position (relative to the
// element, in %) plus an opacity that fades as the cursor moves away.
export function usePointerGlow(enabled = true) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Position tracks the cursor exactly (no spring, so it never lags or
  // overshoots); only the opacity is eased for a smooth fade in/out.
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const glowOpacity = useSpring(0, { stiffness: 200, damping: 30 });

  useEffect(() => {
    if (!enabled || reduceMotion) return;
    const el = ref.current;
    if (!el) return;
    return subscribe({ el, glowX, glowY, glowOpacity });
  }, [enabled, reduceMotion, glowX, glowY, glowOpacity]);

  return { ref, glowX, glowY, glowOpacity };
}
