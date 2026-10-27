// The page's side of the edge of the world: makes the layers, hands their canvases to a worker where it can, and moves
// the layers for parallax and for the first look, which starts up at the sky and comes down to the edge. A click lets a
// lantern go; the stars the lanterns become are kept on this device, and painted back into the galaxy next time.
// Returns a teardown.

import { onPixelRatio, pixelRatio } from "../world/screen";
import { PAD, rockPlace, spinAt } from "./layout";

const KEY = "edge-stars",
  // The most stars kept; past it, the oldest go.
  MOST = 400;

function loadStars() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return Array.isArray(v) ? v.filter((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)) : [];
  } catch {
    return [];
  }
}

const countText = (n) => (n ? `${n} ${n === 1 ? "star" : "stars"} down there ${n === 1 ? "is" : "are"} yours.` : "");

/**
 * @param {object} el
 * @param {HTMLElement} el.box The scene's box, which the layers go into.
 * @param {HTMLElement} el.count Where the number of stars let go is said.
 * @param {HTMLButtonElement} el.release Lets a lantern go, for the keyboard.
 * @param {HTMLButtonElement} el.soundBtn
 * @returns {() => void} The teardown.
 */
export function mountEdge({ box, count, release, soundBtn }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches,
    life = new AbortController(),
    { signal } = life;
  let stars = loadStars();
  count.textContent = countText(stars.length);
  // The galaxy turns by the clock, so it stands where it does now at every visit. Without motion it stands still here.
  const spin = spinAt(Date.now());

  // The layers, back to front. A canvas once handed to a worker can't be handed again, so falling back to this thread
  // makes them all over.
  let space, galaxy, world, fx, rock, layers;
  function build() {
    for (const e of [space, galaxy, world, fx, rock]) e?.remove();
    const add = (cls) => {
      const e = box.appendChild(document.createElement("canvas"));
      e.className = cls;
      return e;
    };
    space = add("edge-space");
    galaxy = add("edge-galaxy");
    world = add("edge-world");
    fx = add("edge-fx");
    rock = add("edge-rock");
    layers = [
      [space, 0.15],
      [galaxy, 0.3],
      [world, 0.5],
      [fx, 0.5],
      [rock, 1],
    ];
  }

  let sound = null,
    soundJob = 0;
  function keep(m) {
    stars.push([m.u, m.v]);
    if (stars.length > MOST) stars = stars.slice(-MOST);
    try {
      localStorage.setItem(KEY, JSON.stringify(stars));
    } catch {
      // Storage is full or off: the star still shines until the page closes.
    }
    count.textContent = countText(stars.length);
    sound?.star(m.pan);
  }
  const receive = (m) => {
    if (m.type === "painted") reveal();
    else if (m.type === "star") keep(m);
  };

  let worker = null,
    post = null,
    sized = null,
    on = false;
  function start(off) {
    build();
    const cvs = { space, galaxy, world, fx, rock },
      init = { type: "init", stars: stars.slice(), spin };
    if (off && typeof OffscreenCanvas !== "undefined" && "transferControlToOffscreen" in HTMLCanvasElement.prototype) {
      try {
        const canvases = Object.fromEntries(Object.entries(cvs).map(([k, c]) => [k, c.transferControlToOffscreen()]));
        const w = new Worker(new URL("./edge.worker.js", import.meta.url), { type: "module" });
        w.onmessage = ({ data }) => receive(data);
        w.onerror = (e) => {
          e.preventDefault();
          w.terminate();
          if (worker !== w || signal.aborted) return;
          start(false);
          lay();
          if (sized) post(sized);
          play();
        };
        w.postMessage({ canvases, reduce }, Object.values(canvases));
        worker = w;
        post = (m) => w.postMessage(m);
        post(init);
        return;
      } catch {
        return start(false);
      }
    }
    worker = null;
    const waiting = [init];
    post = (m) => waiting.push(m);
    import("./play").then(({ playEdge }) => {
      if (signal.aborted) return;
      post = playEdge(cvs, reduce, receive);
      for (const m of waiting) post(m);
    });
  }

  // The layers are laid out for the box's size, and the player told it, after it has held still a moment: painting
  // takes a while, and a window being dragged wider would otherwise paint at every step.
  let width = 0,
    height = 0,
    ratio = 0,
    wait = 0;
  function size(w, h) {
    const dpr = Math.min(pixelRatio(), 2);
    if (!w || !h || (Math.abs(w - width) < 1 && Math.abs(h - height) < 1 && dpr === ratio)) return;
    width = w;
    height = h;
    ratio = dpr;
    lay();
    const again = !!sized;
    sized = { type: "size", w: Math.round(w), h: Math.round(h), dpr };
    clearTimeout(wait);
    wait = setTimeout(() => post(sized), again ? 150 : 0);
  }
  // Puts each layer where it goes for the box's size.
  function lay() {
    const U = height / 1000,
      K = { WU: width / U, PAD: PAD / U },
      b = rockPlace(K).box,
      px = (e, x, y, w, h) =>
        Object.assign(e.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    for (const e of [space, galaxy, world, fx]) px(e, -PAD, -PAD, width + PAD * 2, height + PAD * 2);
    px(rock, b.x * U, b.y * U, b.w * U, b.h * U);
  }

  // Parallax follows a mouse, and the first look comes down from the sky once the layers are painted.
  let mx = 0,
    my = 0,
    ax = 0,
    ay = 0,
    lift = reduce ? 0 : 1,
    from = 0,
    raf = 0;
  function reveal() {
    if (box.classList.contains("ready")) return;
    box.classList.add("ready");
    from = performance.now();
    move();
  }
  function settle() {
    raf = 0;
    ax += (mx - ax) * 0.08;
    ay += (my - ay) * 0.08;
    if (from && lift > 0) lift = (1 - Math.min(1, (performance.now() - from) / 3200)) ** 3;
    for (const [e, d] of layers)
      e.style.translate = `${(-ax * 18 * d).toFixed(1)}px ${(-ay * 10 * d + lift * 320 * d).toFixed(1)}px`;
    if (Math.abs(mx - ax) > 0.002 || Math.abs(my - ay) > 0.002 || lift > 0) move();
  }
  const move = () => (raf ||= requestAnimationFrame(settle));
  if (!reduce)
    addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "touch") return;
        mx = (e.clientX / innerWidth - 0.5) * 2;
        my = (e.clientY / innerHeight - 0.5) * 2;
        move();
      },
      { signal, passive: true },
    );

  // A lantern goes from the pier toward wherever the scene was clicked.
  const letGo = (x, y) => {
    post({ type: "lantern", x, y });
    sound?.release((x / width) * 2 - 1);
  };
  box.addEventListener(
    "click",
    (e) => {
      const r = box.getBoundingClientRect(),
        U = r.height / 1000;
      letGo((e.clientX - r.left) / U, (e.clientY - r.top) / U);
    },
    { signal },
  );
  release.addEventListener("click", () => letGo(0, 0), { signal });

  start(true);
  const ro = new ResizeObserver(([e]) => size(e.contentRect.width, e.contentRect.height));
  ro.observe(box);
  onPixelRatio(() => size(width, height), signal);
  // It plays only while it is on screen and the page is in view.
  const play = () => {
    post({ type: "on", on: on && !document.hidden });
    sound?.active(on && !document.hidden);
  };
  const io = new IntersectionObserver((entries) => {
    on = entries[entries.length - 1].isIntersecting;
    play();
  });
  io.observe(box);
  document.addEventListener("visibilitychange", play, { signal });

  // Sound, off until asked for. The audio context has to start inside the click itself for the browser to let it play.
  soundBtn.addEventListener(
    "click",
    () => {
      const want = soundBtn.getAttribute("aria-pressed") !== "true";
      soundBtn.setAttribute("aria-pressed", String(want));
      const job = ++soundJob;
      sound?.stop();
      sound = null;
      if (!want || typeof AudioContext === "undefined") return;
      const ac = new AudioContext();
      import("./sound").then(
        ({ makeEdgeSound }) => {
          if (job !== soundJob || signal.aborted) return ac.close();
          sound = makeEdgeSound(ac);
          sound.active(on && !document.hidden);
        },
        () => {
          ac.close();
          if (job === soundJob) soundBtn.setAttribute("aria-pressed", "false");
        },
      );
    },
    { signal },
  );

  return () => {
    life.abort();
    ro.disconnect();
    io.disconnect();
    clearTimeout(wait);
    cancelAnimationFrame(raf);
    post({ type: "on", on: false });
    worker?.terminate();
    sound?.stop();
    for (const e of [space, galaxy, world, fx, rock]) e.remove();
  };
}
