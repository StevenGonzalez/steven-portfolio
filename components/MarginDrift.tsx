"use client";

import { useEffect, useRef } from "react";
import { seasonNow, type Season } from "@/lib/season";
import { isDarkTheme, watchTheme } from "@/lib/theme";
import { LEAVES, mapleLeaf } from "@/lib/world/calendar";

// The column the sections keep to (.sec in globals.css), and the least room either side of it worth drifting in.
const COLUMN = 1120,
  MIN_GUTTER = 60;

type Bit = { x: number; y: number; vy: number; r: number; spin: number; turn: number; size: number; tint: number };

/** A few things falling from the island, down the empty margins either side of the home page's sections, for the
 *  season: maple leaves in autumn, snow in winter, petals in spring and seeds in summer. They fall in front of the page,
 *  like weather seen through a window, so scrolling leaves them be; carried along with the page, they shot up the
 *  screen with every scroll. Only in the margins, and only while the sections are on screen; not at all on a screen too
 *  narrow to have margins, or when the system asks for reduced motion. */
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
      raf = 0,
      last = 0,
      seen = false;

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
      const n = gutter < MIN_GUTTER ? 0 : Math.round(Math.min(12, (H / 900) * 10));
      bits = Array.from({ length: n }, () => spawn(Math.random() * H));
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
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", run);
      unwatch();
    };
  }, []);

  return <canvas ref={ref} className="drift" aria-hidden="true" />;
}
