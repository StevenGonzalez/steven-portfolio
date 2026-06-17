"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  r: number;
  maxSpeed: number;
  phase: number;
  twinkle: number;
};

const REPEL_RADIUS = 170;

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasNode = canvasRef.current;
    const context = canvasNode?.getContext("2d");
    if (!canvasNode || !context) return;
    const canvas: HTMLCanvasElement = canvasNode;
    const ctx: CanvasRenderingContext2D = context;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let accent: [number, number, number] = [99, 102, 241];
    let frame = 0;
    let raf = 0;
    const pointer = { x: -9999, y: -9999 };

    function readAccent() {
      const raw = getComputedStyle(document.body).getPropertyValue("--accent-rgb").trim();
      const parts = raw.split(/\s+/).map(Number);
      if (parts.length === 3 && parts.every(Number.isFinite)) {
        accent = [parts[0], parts[1], parts[2]];
      }
    }

    // Resize the canvas and reposition existing motes proportionally, so a
    // resize never teleports the field. (Mobile fires resize on scroll when
    // the address bar shows/hides, so rebuilding here would reset constantly.)
    function resizeCanvas() {
      const prevW = width || window.innerWidth;
      const prevH = height || window.innerHeight;
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (particles.length && (prevW !== width || prevH !== height)) {
        const sx = width / prevW;
        const sy = height / prevH;
        for (const p of particles) {
          p.x *= sx;
          p.y *= sy;
        }
      }
    }

    function createParticles() {
      const count = Math.max(36, Math.min(110, Math.round((width * height) / 17000)));
      particles = Array.from({ length: count }, () => {
        // Each mote gets its own top speed and a random heading, so the field
        // has slow floaters mixed with quicker ones, like drifting dust.
        const maxSpeed = Math.random() * 1.2 + 0.7;
        const angle = Math.random() * Math.PI * 2;
        const baseVx = Math.cos(angle) * maxSpeed;
        const baseVy = Math.sin(angle) * maxSpeed;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: baseVx,
          vy: baseVy,
          baseVx,
          baseVy,
          // Squared so most motes are tiny specks with a few larger ones.
          r: Math.random() ** 2 * 1.7 + 0.35,
          maxSpeed,
          phase: Math.random() * Math.PI * 2,
          twinkle: Math.random() * 0.04 + 0.012,
        };
      });
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      frame += 1;
      const [cr, cg, cb] = accent;

      for (const p of particles) {
        // Wander: nudge the heading randomly, then renormalize so the mote
        // keeps a real travel speed (between 60% and 100% of its max) instead
        // of a random walk that averages out to barely moving.
        p.baseVx += (Math.random() - 0.5) * 0.18;
        p.baseVy += (Math.random() - 0.5) * 0.18;
        const baseSpeed = Math.hypot(p.baseVx, p.baseVy) || 1;
        const target = Math.max(p.maxSpeed * 0.6, Math.min(p.maxSpeed, baseSpeed));
        p.baseVx = (p.baseVx / baseSpeed) * target;
        p.baseVy = (p.baseVy / baseSpeed) * target;

        // Ease velocity back toward that wandering drift.
        p.vx += (p.baseVx - p.vx) * 0.06;
        p.vy += (p.baseVy - p.vy) * 0.06;

        // Each mote animates its own brightness on a sine wave (a twinkle),
        // so the field shimmers like dust catching the light.
        const twinkleVal = 0.5 + 0.5 * Math.sin(p.phase + frame * p.twinkle);
        let alpha = 0.18 + twinkleVal * 0.5;

        // Shove away from the cursor, then let them drift back.
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < REPEL_RADIUS) {
          const force = (1 - dist / REPEL_RADIUS) * 0.9;
          p.vx += (dx / (dist || 1)) * force;
          p.vy += (dy / (dist || 1)) * force;
          alpha = Math.min(1, alpha + (1 - dist / REPEL_RADIUS) * 0.4);
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around the edges so the field stays full.
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }

    function onLeave() {
      pointer.x = -9999;
      pointer.y = -9999;
    }

    function onVisibility() {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduceMotion) raf = requestAnimationFrame(draw);
    }

    function drawStatic() {
      ctx.clearRect(0, 0, width, height);
      const [cr, cg, cb] = accent;
      for (const p of particles) {
        const alpha = 0.25 + (0.5 + 0.5 * Math.sin(p.phase)) * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.fill();
      }
    }

    readAccent();
    resizeCanvas();
    createParticles();

    // Re-read the accent the moment RouteTheme swaps the route on <body>,
    // so the dust recolors instantly when navigating between sections.
    const accentObserver = new MutationObserver(() => {
      readAccent();
      if (reduceMotion) drawStatic();
    });
    accentObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-route"],
    });

    if (reduceMotion) {
      // Render a single static frame, no animation or pointer reaction, but
      // still keep the canvas sized to the viewport on resize.
      drawStatic();
      const onStaticResize = () => {
        resizeCanvas();
        drawStatic();
      };
      window.addEventListener("resize", onStaticResize);
      return () => {
        accentObserver.disconnect();
        window.removeEventListener("resize", onStaticResize);
      };
    }

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      accentObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-0"
      style={{ opacity: 0.9 }}
    />
  );
}
