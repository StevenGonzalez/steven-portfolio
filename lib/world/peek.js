// The world taken apart, for the article on how it works. It runs the home page's renderer, unchanged, in a box of its
// own, and a button tilts its eleven canvases apart into a labelled stack while it keeps drawing, beside the time each
// frame takes to draw. Returns a teardown.

import { LAYERS, shift } from "./layers";
import { onPixelRatio } from "./screen";
import { occasionOf, seasonOf, turnOf } from "./calendar";
import { isDarkTheme, watchTheme } from "../theme";

// The world is laid out for a desktop hero this size, whatever the box, and scaled to fit, so a phone sees the same
// picture. Its pixel ratio is scaled down with it, so no canvas holds more pixels than the box shows.
const SW = 1280,
  SH = 800;
// What each layer holds, back to front.
const NAMES = [
  "Sky",
  "Far mountains",
  "Wooded ridge",
  "Far life",
  "Hills",
  "Near slopes",
  "Island",
  "Island life",
  "Cloud sea",
  "Near life",
  "Ferns",
];
const SVG = "http://www.w3.org/2000/svg";

/**
 * Mounts the world taken apart in `box`, with its labels beside the box, in its parent.
 * @param {HTMLElement} box
 * @param {HTMLButtonElement} btn Takes the world apart and puts it back. Enabled once the first frame is drawn.
 * @param {HTMLElement} readout Where the time each frame takes to draw is written.
 * @returns {() => void} The teardown.
 */
export function mountPeek(box, btn, readout) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const life = new AbortController(),
    { signal } = life,
    now = new Date();
  const make = (parent, cls, tag = "div") => {
    const e = parent.appendChild(
      tag === "svg" || tag === "line" ? document.createElementNS(SVG, tag) : document.createElement(tag),
    );
    if (cls) e.setAttribute("class", cls);
    return e;
  };

  // The stage is the world at its own size, scaled into the box. Each layer's canvas lies on a plane of its own, for
  // the planes to be pulled apart, with a pin on the plane's edge for its label to point at. The labels and their
  // lines sit over the box, at the box's own scale, so they stay readable however small the world is drawn, and
  // beside it rather than in it, for the labels to be buttons the box's description doesn't swallow.
  const stage = make(box, "peek-stage"),
    stack = make(stage, "peek-stack");
  const planes = LAYERS.map((l, i) => {
    const p = make(stack, l.draw ? "peek-plane live" : "peek-plane");
    p.style.setProperty("--i", i);
    return p;
  });
  const pins = planes.map((p) => make(p, "peek-pin"));
  const names = make(box.parentElement, "peek-names"),
    wires = make(names, "", "svg");
  names.inert = true;
  const labels = LAYERS.map((l, i) => {
    const s = make(names, l.draw ? "live" : "", "button");
    s.type = "button";
    s.textContent = NAMES[i];
    return s;
  });
  const lines = LAYERS.map(() => make(wires, "", "line"));

  // The renderer runs in a worker where the browser can hand it canvases, or on this thread otherwise, or if the
  // worker fails, on fresh canvases, as on the home page. The canvases are handed over before the worker is made, so a
  // browser that refuses them leaves no worker behind. This thread fetches the renderer only when it has to run it, and
  // what the renderer is told before it arrives waits for it.
  let cvs = [],
    worker = null,
    post = null,
    laid = false,
    busy = false;
  function start(off) {
    for (const cv of cvs) cv.remove();
    cvs = planes.map((p) => p.insertBefore(document.createElement("canvas"), p.firstChild));
    laid = busy = false;
    if (off && typeof OffscreenCanvas !== "undefined" && "transferControlToOffscreen" in HTMLCanvasElement.prototype) {
      try {
        const handed = cvs.map((cv) => cv.transferControlToOffscreen());
        const w = new Worker(new URL("./render.worker.js", import.meta.url), { type: "module" });
        w.onmessage = ({ data }) => receive(data);
        w.onerror = (e) => {
          e.preventDefault();
          w.terminate();
          if (worker !== w || signal.aborted) return;
          start(false);
          size(true);
        };
        w.postMessage({ canvases: handed, reduce }, handed);
        worker = w;
        post = (m) => w.postMessage(m);
        return;
      } catch {
        return start(false);
      }
    }
    worker = null;
    const waiting = [];
    post = (m) => waiting.push(m);
    import("./render").then(({ makeRenderer }) => {
      if (signal.aborted) return;
      post = makeRenderer(cvs, reduce, receive);
      for (const m of waiting) post(m);
    });
  }

  // Everything else the renderer says is for the home page: sounds, the field guide, the firefly jar.
  const costs = [];
  function receive(m) {
    if (m.type === "layout") {
      cvs.forEach((cv, i) => {
        const { w, h, top } = m.css[i];
        cv.style.width = w + "px";
        cv.style.height = h + "px";
        cv.style.top = top + "px";
      });
      laid = true;
      btn.disabled = false;
      place();
      return apart && name();
    }
    if (m.type === "frame") {
      busy = false;
      costs.push(m.ms);
    }
  }

  // A new layout only when the box has grown or shrunk enough to need sharper or softer canvases.
  let k = 1,
    sent = 0;
  function size(force) {
    k = box.clientWidth / SW;
    stage.style.transform = `scale(${k})`;
    const dpr = (devicePixelRatio || 1) * k;
    if (!k || (!force && Math.abs(dpr - sent) < sent * 0.15)) return;
    sent = dpr;
    post({
      type: "size",
      W: SW,
      H: SH,
      dpr,
      night: isDarkTheme(),
      season: seasonOf(now),
      turn: turnOf(now),
      occasion: occasionOf(now),
      grown: 0,
      jar: 0,
      sapling: null,
      first: false,
      wait: false,
      rare: [],
      ask: null,
      stars: null,
    });
  }

  // The pointer leans the world a little while it is whole, as on the home page.
  let mx = 0,
    my = 0,
    tmx = 0,
    tmy = 0,
    apart = false;
  function place() {
    cvs.forEach((cv, i) => {
      const [ox, oy] = shift(LAYERS[i].d, mx, my, 0, SH);
      cv.style.transform = `translate3d(${ox.toFixed(1)}px,${oy.toFixed(1)}px,0)`;
    });
  }
  box.addEventListener(
    "pointermove",
    (e) => {
      if (apart || reduce) return;
      const b = box.getBoundingClientRect();
      tmx = ((e.clientX - b.left) / b.width) * 2 - 1;
      tmy = ((e.clientY - b.top) / b.height) * 2 - 1;
    },
    { signal },
  );
  box.addEventListener("pointerleave", () => (tmx = tmy = 0), { signal });

  // Frames run only while the box is on screen, each once the renderer has finished the last.
  let raf = 0,
    last = 0,
    seen = false;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (busy || !laid) return;
    mx += (tmx - mx) * 0.06;
    my += (tmy - my) * 0.06;
    place();
    busy = true;
    post({
      type: "frame",
      raw: last ? (t - last) / 1000 : 1 / 60,
      mx,
      my,
      scroll: 0,
      pointer: null,
      still: 0,
      idle: 0,
    });
    last = t;
  }
  function run() {
    const go = seen && !document.hidden && !reduce;
    if (go && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    } else if (!go && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }
  // The time to draw a frame, averaged over the last half second. A world held still draws no frames to time.
  readout.textContent = reduce ? "Held still, since your system asks for less motion" : "";
  const clock = reduce
    ? 0
    : setInterval(() => {
        if (!costs.length) return;
        readout.textContent = `${(costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(1)} ms to draw a frame`;
        costs.length = 0;
      }, 500);

  // Apart, each label stands to the left of its plane's pin, with a line to it, in the order the pins run down the box.
  // A label too close to the one above it, or above the top of the box, is pushed down; then one too close to the one
  // below it, or past the bottom, is pushed back up. The gap is small enough for all of them to fit.
  function name() {
    const b = box.getBoundingClientRect(),
      gap = Math.min(22, (b.height - 16) / labels.length),
      lo = gap / 2 + 4,
      hi = b.height - lo;
    const at = pins.map((p) => {
      const r = p.getBoundingClientRect();
      return [r.left - b.left, r.top - b.top];
    });
    const order = at.map((_, i) => i).sort((i, j) => at[i][1] - at[j][1]),
      ys = [];
    let y = -Infinity;
    for (const i of order) ys[i] = y = Math.max(at[i][1], y + gap, lo);
    y = Infinity;
    for (const i of order.reverse()) ys[i] = y = Math.min(ys[i], y - gap, hi);
    labels.forEach((l, i) => {
      const [px, py] = at[i],
        ly = ys[i],
        lx = Math.max(px - 18, l.offsetWidth + 8);
      l.style.transform = `translate(${(lx - l.offsetWidth - 6).toFixed(1)}px,${(ly - l.offsetHeight / 2).toFixed(1)}px)`;
      lines[i].setAttribute("x1", lx);
      lines[i].setAttribute("y1", ly);
      lines[i].setAttribute("x2", px);
      lines[i].setAttribute("y2", py);
    });
    names.classList.add("on");
    names.inert = false;
  }
  btn.addEventListener(
    "click",
    () => {
      apart = !apart;
      box.classList.toggle("apart", apart);
      btn.setAttribute("aria-pressed", String(apart));
      btn.textContent = apart ? "Put it back together" : "Take it apart";
      names.classList.remove("on");
      names.inert = true;
      show(-1);
      tmx = tmy = 0;
      // Held still, the planes move at once, with no transition to wait for.
      if (apart && reduce) requestAnimationFrame(name);
    },
    { signal },
  );
  stack.addEventListener(
    "transitionend",
    (e) => {
      if (e.target === stack && e.propertyName === "transform" && apart) name();
    },
    { signal },
  );

  // Stacked, the layers in front hide most of the ones behind, so pointing at a label, or tabbing to it, or tapping
  // it, leaves only its layer's picture showing. A tapped one stays until the box is tapped.
  function show(i) {
    box.classList.toggle("solo", i >= 0);
    planes.forEach((p, j) => p.classList.toggle("picked", j === i));
    labels.forEach((l, j) => l.classList.toggle("picked", j === i));
  }
  labels.forEach((l, i) => {
    l.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && show(i), { signal });
    l.addEventListener(
      "pointerleave",
      (e) => e.pointerType === "mouse" && show(labels.indexOf(document.activeElement)),
      { signal },
    );
    l.addEventListener("focus", () => show(i), { signal });
    l.addEventListener("blur", () => show(-1), { signal });
    l.addEventListener("click", () => show(i), { signal });
  });
  box.addEventListener("click", () => show(-1), { signal });

  const ro = new ResizeObserver(() => {
    size(false);
    if (apart) name();
  });
  const io = new IntersectionObserver((entries) => {
    seen = entries[entries.length - 1].isIntersecting;
    run();
  });
  document.addEventListener("visibilitychange", run, { signal });
  const unwatch = watchTheme(() => post({ type: "theme", night: isDarkTheme(), bitmaps: null }));

  start(true);
  size(true);
  ro.observe(box);
  io.observe(box);
  onPixelRatio(() => size(false), signal);

  return () => {
    life.abort();
    ro.disconnect();
    io.disconnect();
    unwatch();
    clearInterval(clock);
    cancelAnimationFrame(raf);
    worker?.terminate();
    stage.remove();
    names.remove();
  };
}
