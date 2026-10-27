// The page's side of the edge of the world: makes the layers, hands their canvases to a worker where it can, and moves
// the layers for parallax and for the first look, which starts up at the sky and comes down to the edge. It follows the
// site's theme as the island does, night or dusk, and names what the pointer is over, as the island's field guide
// does, though nothing here goes in the guide. A click lets a lantern go; the stars the lanterns become are kept on
// this device, and painted back into the galaxy next time. Returns a teardown.

import { isDarkTheme, setThemeStage, watchTheme } from "../theme";
import { onPixelRatio, pixelRatio } from "../world/screen";
import { DEPTH, PAD, rockPlace, spinAt } from "./layout";

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

// What the pointer can be over, each with a Latin name, a common name and a few words, as on the island.
const LABELS = {
  lighthouse: [
    "Pharus ultimus",
    "The last lighthouse",
    "The island’s lighthouse has a twin out here. This one turns all night so nothing sails off the edge by mistake.",
  ],
  cottage: [
    "Casa custodis",
    "Keeper’s cottage",
    "Somebody lives out here and keeps the lamp lit. The window’s always on, but nobody has ever seen them.",
  ],
  maple: [
    "Acer viator",
    "Travelling maple",
    "A seed from the big maple on the island blew all the way out here and took. It turns with the seasons too.",
  ],
  pier: [
    "Pons ad nihil",
    "The pier",
    "It runs out over nothing. This is where the lanterns go from. Click anywhere and one sets off.",
  ],
  whale: [
    "Megaptera abyssi",
    "Deep whale",
    "It swims in the dark under the world, where the galaxy lights its belly. It comes by every couple of minutes.",
  ],
  jelly: [
    "Medusa stellaris",
    "Star jelly",
    "They drift up out of the galaxy and fade back into light before they reach the falls.",
  ],
  sun: [
    "Sol occidens",
    "The sun going down",
    "From the edge you can watch it set behind the far islands. Switch to dark mode and it’s night here too.",
  ],
  sea: [
    "Mare nubium",
    "The cloud sea",
    "The same cloud sea the island floats on. Home is back that way, past the far islands on the horizon.",
  ],
  falls: [
    "Cataracta nubium",
    "Cloudfalls",
    "The cloud sea runs off the edge here and never runs out. Nobody knows where it all comes from.",
  ],
  galaxy: [
    "Galaxia infera",
    "The galaxy below",
    "There’s no ground under the world, only this, turning once every fifteen minutes. Every lantern let go becomes one of its stars.",
  ],
};

const countText = (n) => (n ? `${n} ${n === 1 ? "star" : "stars"} down there ${n === 1 ? "is" : "are"} yours.` : "");

/**
 * @param {object} el
 * @param {HTMLElement} el.box The scene's box, which the layers go into.
 * @param {HTMLElement} el.count Where the number of stars let go is said.
 * @param {HTMLButtonElement} el.release Lets a lantern go, for the keyboard.
 * @param {HTMLButtonElement} el.soundBtn
 * @param {HTMLElement} el.tag The label naming what the pointer is over.
 * @returns {() => void} The teardown.
 */
export function mountEdge({ box, count, release, soundBtn, tag }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches,
    life = new AbortController(),
    { signal } = life;
  let stars = loadStars();
  count.textContent = countText(stars.length);
  // The galaxy turns by the clock, so it stands where it does now at every visit. Without motion it stands still here.
  const spin = spinAt(Date.now());

  // The layers, back to front. A canvas once handed to a worker can't be handed again, so falling back to this thread
  // makes them all over.
  let space, galaxy, world, fx, rock, front, layers;
  function build() {
    for (const e of [space, galaxy, world, fx, rock, front]) e?.remove();
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
    front = add("edge-front");
    layers = [
      [space, DEPTH.space],
      [galaxy, DEPTH.galaxy],
      [world, DEPTH.world],
      [fx, DEPTH.fx],
      [rock, DEPTH.rock],
      [front, DEPTH.front],
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
  // A theme switch waits for the layers to be painted in the new theme, so it never shows them half done.
  let painted = null;
  const receive = (m) => {
    if (m.type === "painted") {
      reveal();
      painted?.();
      painted = null;
    } else if (m.type === "star") keep(m);
    else if (m.type === "hover") label(m.key);
  };

  let worker = null,
    post = null,
    sized = null,
    on = false;
  function start(off) {
    build();
    const cvs = { space, galaxy, world, fx, rock, front },
      init = { type: "init", stars: stars.slice(), spin, night: isDarkTheme() };
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
    for (const e of [space, galaxy, world, fx, front]) px(e, -PAD, -PAD, width + PAD * 2, height + PAD * 2);
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
  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch") return;
      if (!reduce) {
        mx = (e.clientX / innerWidth - 0.5) * 2;
        my = (e.clientY / innerHeight - 0.5) * 2;
        move();
      }
      hover(e);
    },
    { signal, passive: true },
  );

  // The label follows the pointer over the scene. The worker says what is under it, allowing for where each layer has
  // moved to; over the words and buttons, or off the scene, there is nothing.
  let pointer = null,
    tagW = 0,
    tagH = 0;
  function hover(e) {
    const r = box.getBoundingClientRect(),
      U = r.height / 1000,
      over = e.target instanceof Node && box.contains(e.target);
    pointer = over ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
    if (!pointer) return label(null);
    post({
      type: "hover",
      x: pointer.x / U,
      y: pointer.y / U,
      ox: (-ax * 18) / U,
      oy: (-ay * 10 + lift * 320) / U,
    });
    placeTag();
  }
  let shown = null;
  function label(key) {
    if (key && !pointer) key = null;
    if (key !== shown) {
      shown = key;
      if (key) {
        const [latin, common, said] = LABELS[key];
        tag.replaceChildren(
          Object.assign(document.createElement("i"), { textContent: latin }),
          Object.assign(document.createElement("b"), { textContent: common }),
          Object.assign(document.createElement("span"), { textContent: said }),
        );
        tagW = tag.offsetWidth;
        tagH = tag.offsetHeight;
      }
      tag.classList.toggle("on", !!key);
    }
    placeTag();
  }
  function placeTag() {
    if (!shown || !pointer) return;
    const x = Math.min(Math.max(pointer.x + 18, 8), width - tagW - 8),
      y = pointer.y + 22 + tagH > height - 8 ? pointer.y - tagH - 14 : pointer.y + 22;
    tag.style.transform = `translate(${x}px,${y}px)`;
  }
  tag.addEventListener("transitionend", () => tag.classList.contains("on") || tag.replaceChildren(), { signal });

  // The theme: the header's switch waits on a repaint in the new one, and spreads it out from the lighthouse lamp.
  const night = () => post({ type: "theme", night: isDarkTheme() });
  const unwatch = watchTheme(night);
  const unstage = setThemeStage({
    prepare: (dark) =>
      new Promise((done) => {
        painted = done;
        post({ type: "theme", night: dark });
        setTimeout(done, 1500);
      }),
    origin: () => {
      if (!width) return null;
      const U = height / 1000,
        [x, y] = rockPlace({ WU: width / U, PAD: PAD / U }).lamp,
        r = box.getBoundingClientRect();
      return { x: r.left + x * U, y: r.top + y * U };
    },
  });

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
    unwatch();
    unstage();
    ro.disconnect();
    io.disconnect();
    clearTimeout(wait);
    cancelAnimationFrame(raf);
    post({ type: "on", on: false });
    worker?.terminate();
    sound?.stop();
    for (const e of [space, galaxy, world, fx, rock, front]) e.remove();
  };
}
