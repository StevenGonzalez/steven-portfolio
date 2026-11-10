"use client";

import { useEffect, useRef } from "react";
import { seasonNow, type Season } from "@/lib/season";
import { isDarkTheme, watchTheme } from "@/lib/theme";
import { LEAVES, mapleLeaf } from "@/lib/world/calendar";

// The column the sections keep to (.sec in globals.css), and the least room either side of it worth drifting in.
const COLUMN = 1120,
  MIN_GUTTER = 60;

type Bit = { x: number; y: number; vy: number; r: number; spin: number; turn: number; size: number; tint: number };
type Fly = {
  left: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  next: number;
  ph: number;
};

/** A few things falling from the island, down the empty margins either side of the home page's sections, for the
 *  season: maple leaves in autumn, snow in winter, petals in spring and seeds in summer. They fall in front of the page,
 *  like weather seen through a window, so scrolling leaves them be; carried along with the page, they shot up the
 *  screen with every scroll. Only in the margins, and only while the sections are on screen; not at all on a screen too
 *  narrow to have margins, or when the system asks for reduced motion. In the dark theme a few fireflies wander the
 *  margins too, and gather beside the pointer when it comes near. */
export default function MarginDrift() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current!,
      ctx = cv.getContext("2d")!,
      site = cv.parentElement!,
      { season } = seasonNow();
    let W = 0,
      H = 0,
      gutter = 0,
      dark = isDarkTheme(),
      bits: Bit[] = [],
      flies: Fly[] = [],
      ptr: { x: number; y: number } | null = null,
      raf = 0,
      last = 0,
      seen = false;

    // A firefly keeps to its own margin: a point across it, from 0 at the outer edge to 1 at the column.
    const across = (left: boolean, u: number) => (left ? gutter * (0.1 + u * 0.8) : W - gutter * (0.1 + u * 0.8));
    const newFly = (): Fly => {
      const left = Math.random() < 0.5,
        x = across(left, Math.random()),
        y = H * (0.1 + Math.random() * 0.8);
      return { left, x, y, vx: 0, vy: 0, tx: x, ty: y, next: 0, ph: Math.random() * 6.3 };
    };
    // Its glow, drawn once.
    const glow = document.createElement("canvas");
    glow.width = glow.height = 48;
    const g = glow.getContext("2d")!,
      grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, "rgb(250 255 210 / 1)");
    grad.addColorStop(0.08, "rgb(240 252 170 / 1)");
    grad.addColorStop(0.25, "rgb(214 240 120 / 0.45)");
    grad.addColorStop(1, "rgb(214 240 120 / 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 48, 48);

    const spawn = (y: number): Bit => {
      const left = Math.random() < 0.5,
        u = 0.15 + Math.random() * 0.7;
      return {
        x: left ? gutter * u : W - gutter * u,
        y,
        vy: 18 + Math.random() * 22,
        r: Math.random() * 6.3,
        spin: (Math.random() - 0.5) * 1.6,
        turn: Math.random() * 6.3,
        size: 7 + Math.random() * 6,
        tint: Math.floor(Math.random() * 4),
      };
    };
    const size = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      W = innerWidth;
      H = innerHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gutter = (W - Math.min(COLUMN, site.clientWidth)) / 2;
      const n = gutter < MIN_GUTTER ? 0 : Math.round(Math.min(6, (H / 900) * 5));
      bits = Array.from({ length: n }, () => spawn(Math.random() * H));
      flies = Array.from({ length: Math.round(n * 0.8) }, newFly);
    };

    const fly = (f: Fly, dt: number, t: number) => {
      // It wanders to a new spot in its margin every few seconds. When the pointer comes within reach of its margin,
      // it heads for the pointer instead, kept to the margin's side of it, and circles there.
      if (t > f.next) {
        f.tx = across(f.left, Math.random());
        f.ty = Math.min(H - 40, Math.max(40, f.y + (Math.random() - 0.5) * 260));
        f.next = t + 2 + Math.random() * 3;
      }
      let gx = f.tx,
        gy = f.ty;
      if (ptr) {
        const lo = f.left ? 0 : W - gutter,
          hi = f.left ? gutter : W,
          reach = ptr.x < lo ? lo - ptr.x : ptr.x > hi ? ptr.x - hi : 0;
        if (reach < 220 && Math.abs(ptr.y - f.y) < 400) {
          gx = Math.min(hi - 10, Math.max(lo + 10, ptr.x)) + Math.cos(t * 0.9 + f.ph) * 26;
          gy = ptr.y + Math.sin(t * 1.1 + f.ph) * 22;
        }
      }
      f.vx = (f.vx + (gx - f.x) * 0.9 * dt) * Math.pow(0.35, dt);
      f.vy = (f.vy + (gy - f.y) * 0.9 * dt) * Math.pow(0.35, dt);
      const speed = Math.hypot(f.vx, f.vy);
      if (speed > 70) {
        f.vx *= 70 / speed;
        f.vy *= 70 / speed;
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      // It glows and fades in slow pulses.
      const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 1.4 + f.ph)) ** 2;
      ctx.globalAlpha = a;
      ctx.drawImage(glow, f.x - 20, f.y - 20, 40, 40);
    };

    const draw = (b: Bit, t: number) => {
      ctx.save();
      ctx.translate(b.x + Math.sin(t * 0.8 + b.turn) * 14, b.y);
      ctx.rotate(b.r);
      // A tumble: a leaf or a petal turns over as it falls, so it narrows and widens. Snow is round all the way down.
      if (season !== "winter") ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(t * 0.9 + b.turn)));
      paint[season](b);
      ctx.restore();
    };
    const paint: Record<Season, (b: Bit) => void> = {
      autumn(b) {
        ctx.scale(b.size * 0.8, b.size * 0.8);
        ctx.fillStyle = `rgb(${LEAVES[b.tint % LEAVES.length].join(" ")} / 0.8)`;
        ctx.fill(mapleLeaf());
      },
      winter(b) {
        // A flake with a soft edge, so it reads as snow and not as a star.
        ctx.fillStyle = dark ? "rgb(236 242 250 / 0.25)" : "rgb(150 168 188 / 0.25)";
        ctx.beginPath();
        ctx.arc(0, 0, b.size * 0.42, 0, 6.3);
        ctx.fill();
        ctx.fillStyle = dark ? "rgb(236 242 250 / 0.8)" : "rgb(150 168 188 / 0.7)";
        ctx.beginPath();
        ctx.arc(0, 0, b.size * 0.26, 0, 6.3);
        ctx.fill();
      },
      spring(b) {
        ctx.fillStyle = ["rgb(240 178 196 / 0.8)", "rgb(250 214 224 / 0.85)", "rgb(232 160 184 / 0.75)"][b.tint % 3];
        ctx.beginPath();
        ctx.ellipse(0, 0, b.size * 0.5, b.size * 0.32, 0, 0, 6.3);
        ctx.fill();
      },
      summer(b) {
        ctx.strokeStyle = dark ? "rgb(236 232 220 / 0.6)" : "rgb(140 130 110 / 0.5)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * 6.3;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * b.size * 0.6, Math.sin(a) * b.size * 0.6);
        }
        ctx.moveTo(0, 0);
        ctx.lineTo(0, b.size * 0.9);
        ctx.stroke();
      },
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // Thirty frames a second is plenty for things this slow.
      if (now - last < 32) return;
      const dt = Math.min(0.1, (now - last) / 1000),
        t = now / 1000;
      last = now;
      ctx.clearRect(0, 0, W, H);
      // Nothing falls over the world above the sections or the footer below them.
      const box = site.getBoundingClientRect();
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, box.top, W, box.height);
      ctx.clip();
      for (const b of bits) {
        b.y += b.vy * dt;
        b.r += b.spin * dt;
        if (b.y > H + 30) Object.assign(b, spawn(-30 - Math.random() * H * 0.3));
        draw(b, t);
      }
      if (dark) {
        ctx.globalCompositeOperation = "lighter";
        for (const f of flies) fly(f, dt, t);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (seen && !document.hidden && bits.length) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else ctx.clearRect(0, 0, W, H);
    };

    size();
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      run();
    });
    io.observe(site);
    const onResize = () => {
      size();
      run();
    };
    addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", run);
    const unwatch = watchTheme(() => (dark = isDarkTheme()));
    // Only a mouse or a pen draws the fireflies; a finger lifts off, and they would gather where it last touched.
    const onPointer = (e: PointerEvent) => {
      ptr = e.pointerType === "touch" ? null : { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => (ptr = null);
    addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", run);
      removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      unwatch();
    };
  }, []);

  return <canvas ref={ref} className="drift" aria-hidden="true" />;
}
