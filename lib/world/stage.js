// Wires the world to the page: canvases, parallax, theme, the animation clock, field-guide labels and pointer input.
// The drawing itself is render.js, which runs in a worker where the browser allows, so this side only has to slide the
// finished layers about and answer the pointer. mountWorld takes the hero's elements and returns a function that tears
// everything down again, so the world can come and go with client-side navigation.

import { PAL, clamp } from "./core";
import { GUIDE, GUIDE_ORDER, LETTERS, RARE } from "./guide";
import { skyHere } from "./sky";
import { CON_NAMES, STAR_NAMES } from "./starnames";
import { D_ISLE, LAYERS, shift } from "./layers";
import { makeMap } from "./rumours";
import { coarseClock, onPixelRatio, pixelRatio } from "./screen";
import { makeSeam } from "./seam";
import { LEAF_D, LEAVES, occasionOf, seasonOf, turnOf } from "./calendar";
import { isDarkTheme, setThemeStage, switchTheme, watchTheme } from "../theme";

// How long, in ms, the pointer has to stay on something before its label shows.
const LINGER = 160;

// Added to the stackhouses' field-guide line on a day a new house went up for a returning visitor.
const NEW_HOUSE = "There’s a new one on top since you were last here! I think they knew you were coming back.";
// Added to the line for the visitor's own tree on a day it grew, and once it is grown.
const TREE_GREW = "It grew since you were last here! I watered it like I said.";
const TREE_GROWN = "It’s all grown up now, and it got its own lantern. Mine never did that.";

// Added to field-guide lines while the world is dressed up for an occasion, and the season each one falls in.
const OCCASIONS = {
  halloween: {
    season: "autumn",
    tree: "This week all the lanterns are pumpkins. I think it’s dressed up as a pumpkin patch.",
    lanterns: "They’re pumpkins this week, and they still ring! The song is spookier though.",
    boids: "Some of them are bats this week. The starlings are pretending not to notice.",
  },
  newyear: {
    season: "winter",
    tree: "It stayed up for New Year’s! Click the sky and it sets off fireworks.",
  },
};

// Added to field-guide lines in a season.
const SEASONS = {
  autumn: {
    tree: "It’s a maple, and it’s going red and orange! A few more leaves every day. I think it’s showing off.",
  },
  spring: { tree: "It’s a maple, and it’s dropping tiny helicopters! They spin all the way down." },
};

// What the field guide says about the weather where the visitor is, which it reads out rather than records.
const WEATHER = {
  rain: ["Pluvia", "It’s raining where you are right now, so it’s raining here too! The shy bells love it."],
  snow: ["Nix", "It’s snowing where you are! So it’s snowing here too. Try catching one on your tongue."],
  fog: ["Nebula", "It’s foggy where you are, so the mist came up out of the clouds to see what’s going on."],
  storm: [
    "Tonitrus",
    "There’s a thunderstorm where you are! Watch for the flashes behind the hills, and count to the rumble.",
  ],
  wind: ["Ventus", "It’s windy where you are! Hold on to your hat. The kite loves it."],
};

// What the tab's title says while the page is out of sight, one picked each time.
const MISSED = [
  "the sheep are looking for you",
  "the kite wants to go up",
  "someone is on the swing",
  "the snails are racing without you",
  "the lanterns left one on for you",
];
// How long, in ms, the page has to be out of sight for anything in the world to have changed when it comes back.
const AWAY = 20000;
// How long, in ms, into the first visit of a day a visitor who has finished the guide gets their lantern festival again.
const FESTIVAL = 65000;
// How long, in ms, the page has to be open and in sight before the world starts over: 22 minutes.
const LOOP = 22 * 60000;

// A constellation the visitor draws is named from these, one of each.
const STAR_ADJ = [
  "Lesser",
  "Greater",
  "Sleepy",
  "Wobbly",
  "Lost",
  "Little",
  "Upside-down",
  "Hungry",
  "Second-best",
  "Borrowed",
  "Very Patient",
  "Slightly Bent",
];
const STAR_NOUN = [
  "Teapot",
  "Sock",
  "Spoon",
  "Kettle",
  "Sheep",
  "Umbrella",
  "Noodle",
  "Slipper",
  "Pancake",
  "Mitten",
  "Wheelbarrow",
  "Snail",
  "Toast",
  "Doorknob",
];
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

// The visitor's constellation, if they drew one: its stars, the lines between them and its name. Kept in this browser,
// and checked, since anything kept there may have been changed: each star a place, and each line two of the stars. One
// of real stars has their places in the catalogue as well, one for each star.
const pairsOf = (a, ok) => Array.isArray(a) && a.every((p) => Array.isArray(p) && p.length === 2 && p.every(ok));
function ownStars() {
  try {
    const v = JSON.parse(localStorage.getItem("world-stars") ?? "null");
    const star = (i) => Number.isInteger(i) && i >= 0 && i < v.pts.length;
    const ids =
      v?.ids == null || (Array.isArray(v.ids) && v.ids.length === v.pts.length && v.ids.every(Number.isInteger));
    return v && pairsOf(v.pts, Number.isFinite) && pairsOf(v.links, star) && typeof v.name === "string" && ids
      ? v
      : null;
  } catch {
    return null;
  }
}

// The fireflies caught in the jar, kept in this browser.
function jarCount() {
  try {
    return Number(localStorage.getItem("world-jar")) || 0;
  } catch {
    return 0;
  }
}

// How far the world had to step down its drawing to keep up, last time, on a screen at least about this size: 0, 1 for
// lite or 2 for lower, as render.js names them. `px` is the screen's device pixels. Kept in this browser for a week,
// so one slow visit, say with a game running, does not hold the world down for good.
const TIER_DAYS = 7;
function savedTier(px) {
  try {
    const v = JSON.parse(localStorage.getItem("world-tier") ?? "null");
    return v && px >= v.px * 0.75 && Date.now() - v.at < TIER_DAYS * 864e5 ? clamp(Number(v.n) || 0, 0, 2) : 0;
  } catch {
    return 0;
  }
}

// How many times the world has started over in this browser, for the field guide.
function loopCount() {
  try {
    return Number(localStorage.getItem("world-loops")) || 0;
  } catch {
    return 0;
  }
}

// The leaves the visitor caught as they fell and pressed in the field guide, and the year they fell, kept in this
// browser. Only the last few are kept, as many as a postcard has room to tuck in.
const KEPT_LEAVES = 3;
function pressedLeaves() {
  try {
    const v = JSON.parse(localStorage.getItem("world-pressed") ?? "null");
    if (!v || !Number.isInteger(v.year) || !Array.isArray(v.leaves)) return null;
    const leaves = v.leaves.filter((l) => Number.isInteger(l?.c) && LEAVES[l.c] && Number.isFinite(l.r));
    return { year: v.year, leaves: leaves.slice(-KEPT_LEAVES) };
  } catch {
    return null;
  }
}
// Text for the page's markup, with anything in it that would read as markup written out instead.
const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// A maple leaf for the page, in `rgb`, turned by `deg` degrees about its middle, which is the middle of the picture.
const leafSvg = (rgb, deg = 0) =>
  `<svg viewBox="-1.1 -1.1 2.2 2.2" aria-hidden="true"><path d="${LEAF_D}" fill="rgb(${rgb})" transform="rotate(${deg})"/></svg>`;

// The stackhouses remember visitors: each day someone comes back, one more house goes up on top, up to three. Only
// the count and the last day are kept, in this browser.
function visits() {
  try {
    const today = new Date().toDateString(),
      v = JSON.parse(localStorage.getItem("world-visits") ?? "null") || { days: 0 };
    if (v.last !== today) {
      v.days++;
      v.last = today;
      if (v.days > 1 && v.days <= 4) v.grew = today;
      localStorage.setItem("world-visits", JSON.stringify(v));
    }
    return { days: v.days, grown: Math.min(3, v.days - 1), fresh: v.grew === today };
  } catch {
    return { days: 1, grown: 0, fresh: false };
  }
}

// The winged trader's letters: how many have come, and whether the last one came today. Kept in this browser.
function mailbag() {
  try {
    const v = JSON.parse(localStorage.getItem("world-mail") ?? "null");
    return { n: clamp(Number(v?.n) || 0, 0, LETTERS.length), today: v?.day === new Date().toDateString() };
  } catch {
    return { n: 0, today: false };
  }
}

// The visitor's own tree, if they planted one: where along the island, from 0 to 1, and on which day of their
// visits. It grows a stage on each later day they come back, up to four. Kept in this browser.
function ownTree(days) {
  try {
    const today = new Date().toDateString(),
      v = JSON.parse(localStorage.getItem("world-tree") ?? "null");
    if (!v || !(v.u >= 0 && v.u <= 1)) return null;
    const age = clamp(days - v.day, 0, 4);
    if (age !== v.seen) {
      if (age > (v.seen ?? age)) v.grewOn = today;
      v.seen = age;
      localStorage.setItem("world-tree", JSON.stringify(v));
    }
    return { u: v.u, age, grew: v.grewOn === today };
  } catch {
    return null;
  }
}

// The dandelions grown from seeds the visitor blew off the clocks: where each seed came down along the island, from 0
// to 1, and on which day of their visits. One comes up on a later day. Only the last few are kept, as many as fit
// along the turf without crowding it, in this browser.
const SOWN = 40;
function sown() {
  try {
    const v = JSON.parse(localStorage.getItem("world-seeds") ?? "null");
    return pairsOf(v, Number.isFinite) ? v.filter(([u]) => u >= 0 && u <= 1).slice(-SOWN) : [];
  } catch {
    return [];
  }
}

/**
 * Mounts the world on the hero's elements.
 * @param {object} el
 * @param {HTMLElement} el.hero The hero section, which takes the pointer.
 * @param {HTMLElement} el.scene Where the layers' canvases go.
 * @param {HTMLElement} el.tag The live region that names what was clicked.
 * @param {HTMLElement} el.wake
 * @param {HTMLButtonElement} el.guideBtn Opens and closes the field guide.
 * @param {HTMLElement} el.guide The field guide's panel.
 * @param {HTMLOListElement} el.guideList
 * @param {HTMLElement} el.guideCount
 * @param {HTMLElement} el.guideFoot
 * @param {HTMLElement} el.guideViews Holds the buttons that show the guide as a list, as a map or as the letters.
 * @param {HTMLElement} el.guideMap
 * @param {HTMLOListElement} el.guideMail The trader's letters, once any have come.
 * @param {HTMLButtonElement} el.postcardBtn
 * @param {HTMLButtonElement} el.soundBtn
 * @param {HTMLElement} el.explore Takes the keyboard into the world.
 * @param {HTMLElement} el.ring Marks what the keyboard is on.
 * @param {HTMLCanvasElement} el.seamTop Where the world spills into the page, below the hero.
 * @param {HTMLCanvasElement} el.seamLow Where the page settles back into cloud, at the bottom.
 * @returns {() => void} The teardown.
 */
export function mountWorld(el) {
  const { hero, scene: sceneEl, tag } = el;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The season, and any occasion, follow the visitor's date. ?season=winter and the like show the others, and
  // ?season=halloween or newyear an occasion.
  const asked = new URLSearchParams(location.search).get("season") ?? "";
  const askedOccasion = Object.hasOwn(OCCASIONS, asked);
  const askedSeason = ["spring", "summer", "autumn", "winter"].includes(asked);
  const occasion = askedOccasion ? asked : askedSeason ? null : occasionOf(new Date());
  const season = occasion ? OCCASIONS[occasion].season : askedSeason ? asked : seasonOf(new Date());
  // How far the maple has turned, in autumn: by the date, or all the way for a season or occasion asked for.
  const turn = askedOccasion || askedSeason ? 1 : turnOf(new Date());
  // ?rare=calf, hamlet or lanternship brings that rare sighting by a few seconds in.
  const rareAsked = new URLSearchParams(location.search).get("rare");
  // ?loop=30 starts the world over after that many seconds instead. Anything that isn't a time to wait is ignored.
  const loopAfter = Math.max(0, Number(new URLSearchParams(location.search).get("loop"))) * 1000 || LOOP;
  const { days, grown, fresh: newHouse } = visits();
  let tree = ownTree(days),
    stars = ownStars(),
    here = null,
    weather = null,
    seeds = sown();
  // On each day the visitor comes back, the winged trader brings the next letter, until all of them have come, and the
  // day's letter stays where it landed for the rest of the day. A world held still has it there already. ?mail=3 has
  // the trader bring the third letter, and keeps nothing.
  const mailAsked = clamp(Math.round(Number(new URLSearchParams(location.search).get("mail"))) || 0, 0, LETTERS.length);
  const bag = mailbag();
  let mail = mailAsked ? "due" : bag.today ? "lying" : days > 1 && bag.n < LETTERS.length ? "due" : null;
  // How many letters have come, the last of them the one that is lying in the world.
  const letters = () => (mailAsked ? (mail === "lying" ? mailAsked : 0) : bag.n);
  function landMail() {
    mail = "lying";
    if (mailAsked) return;
    bag.n++;
    try {
      localStorage.setItem("world-mail", JSON.stringify({ n: bag.n, day: new Date().toDateString() }));
    } catch {}
  }
  if (mail === "due" && reduce) landMail();
  // Every listener goes through this signal, so teardown is one abort.
  const life = new AbortController(),
    { signal } = life,
    observers = [],
    timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };

  // `geo` is where the renderer last laid the world out: the scale, the layers' sizes and a few landmarks the page
  // needs. Nothing is drawn or measured on this side until it arrives.
  let geo = null,
    P,
    W = 0,
    H = 0,
    mx = 0,
    my = 0,
    tmx = 0,
    tmy = 0,
    pointer = null,
    lastMove = 0,
    touchTimer = 0;
  let raf = 0,
    last = 0,
    sent = 0,
    busy = false,
    visible = true,
    shown = null,
    woken = false,
    aim = null,
    aimAt = 0;
  let tick = 0,
    ticks = 0,
    postedAt = 0,
    vsync = 1000 / 60,
    pace = 1,
    drawn = 0,
    stir = performance.now(),
    asleep = false;
  const gaps = new Array(30).fill(1000 / 60),
    costs = new Array(60).fill(0);
  // `near` is the band players at the fire under the pointer, for the sound to bring up close.
  let sound = null,
    soundJob = 0,
    pressed = false,
    holding = false,
    jar = jarCount(),
    near = null,
    leaves = pressedLeaves(),
    loops = loopCount();

  const offset = (d) => shift(d, mx, my, scrollY, H);
  const palette = () => (isDarkTheme() ? PAL.night : PAL.dusk);

  // One canvas per layer. Where the browser can hand canvases to a worker, the renderer runs there and draws into
  // them; otherwise, or if the worker fails, it runs on this thread with the same messages. A canvas once handed over
  // cannot be drawn from here, so falling back starts again on fresh canvases. They are handed over before the worker
  // is made, so a browser that refuses them leaves no worker behind. They join the page once the renderer has said
  // where they go, so none ever shows at the wrong size first. This thread fetches the renderer only when it has to run
  // it, so the page never downloads it twice, and what the renderer is told before it arrives waits for it.
  let cvs = [],
    worker = null,
    post = null;
  function start(off) {
    for (const cv of cvs) cv.remove();
    cvs = LAYERS.map((l) => {
      const cv = document.createElement("canvas");
      if (l.glow) cv.className = l.glow;
      return cv;
    });
    geo = null;
    busy = false;
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
          rebuild(!woken);
          sync();
        };
        w.postMessage({ canvases: handed, reduce }, handed);
        worker = w;
        post = (m, transfer = []) => w.postMessage(m, transfer);
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
      const run = makeRenderer(cvs, reduce, receive);
      post = (m) => run(m);
      for (const m of waiting) run(m);
    });
  }

  function receive(m) {
    if (m.type === "layout") return onLayout(m);
    if (m.type === "snap") return postcard(m.img);
    if (m.type === "door") return portal(m);
    if (m.type === "jar") return keepJar(m.n);
    if (m.type === "leaf") return pressLeaf(m);
    if (m.type === "plant") return plant(m.u);
    if (m.type === "seeds") return sow(m.u);
    if (m.type === "stars") return nameStars(m);
    if (m.type === "gate") return void record("gatesong");
    if (m.type === "mail") {
      landMail();
      return renderGuide();
    }
    if (m.type === "nova") return again();
    if (m.type === "tier") return stepped(m.n);
    if (m.sfx && sound) for (const [name, pan, arg] of m.sfx) sound.play(name, pan, arg);
    if ("near" in m) sound?.near((near = m.near));
    if ("hover" in m) mark(m.aim ?? null);
    show(m.hover, m.type === "frame" && !spot);
    if (m.type === "frame") {
      busy = false;
      if (!m.held) paceTo(coarseClock() ? (ticks - postedAt + 0.5) * vsync : m.ms);
      asleep = m.asleep;
      sound?.sleep(asleep);
      sound?.hush(m.hush);
    }
  }

  // One seam where the world spills into the page, and one where the page settles back into cloud at the bottom.
  const seams = [makeSeam(el.seamTop, 140), makeSeam(el.seamLow, 70, true)];
  const seamsOn = () => seams.some((s) => s.on);
  const drawSeams = (dt, t, all) => {
    for (const s of seams) if (all || s.on) s.draw(dt, P, t);
  };

  // The theme not on screen is painted ahead of time in the paint worker. `spare` resolves to its bitmaps, or to null
  // when they were superseded or the worker is unavailable; then a switch paints in place instead.
  const waiting = new Map();
  let painter = null,
    job = 0,
    spareId = 0,
    spare = null,
    gen = 0,
    held = null;
  try {
    painter = new Worker(new URL("./paint.worker.js", import.meta.url), { type: "module" });
    painter.onmessage = ({ data }) => {
      const done = waiting.get(data.id);
      waiting.delete(data.id);
      if (done) return done(data);
      for (const b of data.bitmaps) b.close();
    };
    painter.onerror = (e) => {
      e.preventDefault();
      painter = null;
      for (const done of waiting.values()) done(null);
      waiting.clear();
    };
  } catch {
    painter = null;
  }
  function request(night) {
    if (!painter || !geo) return Promise.resolve(null);
    const id = ++job;
    painter.postMessage({ id, W, H, grown, night, season, turn, occasion, here, layers: geo.paints });
    return new Promise((done) => waiting.set(id, done));
  }
  function prepare() {
    const old = waiting.get(spareId);
    if (old) {
      waiting.delete(spareId);
      old(null);
    }
    spare = request(!P.night);
    spareId = job;
  }
  // Bitmaps painted before a resize no longer fit, and are left for a paint in place.
  const fits = (d, night) =>
    !!d &&
    !!geo &&
    d.night === night &&
    d.bitmaps[0].width === geo.paints[0].w &&
    d.bitmaps[0].height === geo.paints[0].h;
  const release = (d) => {
    if (d) for (const b of d.bitmaps) b.close();
  };

  // Asks the renderer to lay the world out for the hero's size. Any paint in place supersedes a first paint still on its
  // way from the paint worker. On first load the paint worker paints the world while the arrival still covers it.
  // `ratio` is the screen's pixel ratio it was laid out for.
  let ratio = 0;
  function rebuild(first) {
    W = hero.clientWidth;
    H = hero.clientHeight;
    if (!W || !H) return;
    if (!first) gen++;
    P = palette();
    ratio = pixelRatio();
    // The sky as it is now, for the renderer and the paint worker alike.
    here = skyHere();
    post({
      type: "size",
      W,
      H,
      dpr: ratio,
      night: P.night,
      season,
      turn,
      occasion,
      here,
      weather,
      grown,
      jar,
      sapling: tree,
      first,
      wait: first && !!painter,
      tier: savedTier(W * H * ratio * ratio),
      rare: RARE.filter((k) => found.has(k)),
      ask: rareAsked,
      mail,
      stars: stars && { pts: stars.pts, links: stars.links, ids: stars.ids },
      seeds: seeds.filter(([, day]) => day < days).map(([u]) => u),
    });
  }

  function onLayout(m) {
    geo = m;
    sound?.seat(m.band);
    sound?.place(m.spots);
    cvs.forEach((cv, i) => {
      const { w, h, top } = m.css[i];
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      cv.style.top = top + "px";
      if (!cv.isConnected) sceneEl.appendChild(cv);
    });
    place();
    renderGuide();
    if (m.first) {
      if (painter) {
        const g = gen;
        request(P.night).then((d) => {
          if (signal.aborted) return release(d);
          if (g !== gen) release(d);
          else if (fits(d, P.night)) post({ type: "paint", bitmaps: d.bitmaps }, d.bitmaps);
          else {
            release(d);
            post({ type: "paint", bitmaps: null });
          }
          awake();
        });
      } else awake();
    }
    prepare();
    for (const s of seams) s.resize();
    drawSeams(0, 0, true);
    sync();
    post({ type: "band", n: players() });
  }

  // Slides each layer by its parallax.
  function place() {
    cvs.forEach((cv, i) => {
      const [ox, oy] = offset(LAYERS[i].d);
      cv.style.transform = `translate3d(${ox.toFixed(1)}px,${oy.toFixed(1)}px,0)`;
    });
  }

  // How many screen refreshes each world frame takes. Handing the renderer a frame as soon as it is free lets frames
  // land two refreshes apart, then three, whenever drawing one takes about as long as two refreshes, which reads as
  // stutter, the more so on a fast screen (144 Hz). So the world steps every `pace` refreshes: the fewest that nine
  // in ten recent frames fit into, with half a millisecond to hand the frame over. A rare slow frame only drops itself.
  // The pace speeds up again only once frames fit the faster one with room to spare, so it never flips between the
  // two. The refresh interval is the shortest recent gap between animation frames. Where the clock is too coarse to time
  // a frame by, which would read most as taking a whole refresh or none, a frame is taken to have cost half a refresh
  // less than the refreshes that went by before it came back: half of one if it was back before the next.
  function paceTo(ms) {
    costs[drawn++ % costs.length] = ms;
    const p90 = costs.slice().sort((a, b) => a - b)[Math.floor(costs.length * 0.9)] + 0.5;
    const need = Math.max(1, Math.ceil(p90 / vsync));
    if (need > pace || (need < pace && p90 < (pace - 1) * vsync * 0.92)) pace = need;
  }
  // The renderer stepped its drawing down, so frames now cost less than the ones the pace was set from: the pace starts
  // over from the next frames. The step is kept for the next visit on this screen.
  function stepped(n) {
    costs.fill(0);
    try {
      localStorage.setItem("world-tier", JSON.stringify({ n, px: W * H * ratio * ratio, at: Date.now() }));
    } catch {}
  }
  // The page's frame clock. Each world frame it eases the parallax, slides the layers and hands the renderer its next
  // frame, once it has finished the last, so a slow device drops frames instead of falling behind. While the world
  // sleeps, which is when nothing on the page has stirred for a while, it steps at about 30 frames a second at most.
  function frame(now) {
    raf = requestAnimationFrame(frame);
    ticks++;
    const gap = now - tick;
    tick = now;
    if (gap > 3) {
      gaps.copyWithin(0, 1);
      gaps[gaps.length - 1] = gap;
      vsync = Math.min(...gaps);
    }
    const step = asleep ? Math.max(pace, Math.round(1000 / 30 / vsync)) : pace;
    if (now - last < (step - 0.5) * vsync || (visible && busy)) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    drawSeams(dt, now / 1000);
    if (!visible) return void (sent = now);
    mx += (tmx - mx) * Math.min(1, dt * 3);
    my += (tmy - my) * Math.min(1, dt * 3);
    place();
    busy = true;
    postedAt = ticks;
    const raw = (now - sent) / 1000;
    sent = now;
    post({
      type: "frame",
      raw,
      mx,
      my,
      scroll: scrollY,
      pointer,
      still: pointer ? (now - lastMove) / 1000 : 0,
      idle: (now - stir) / 1000,
    });
  }
  function sync() {
    sound?.active(visible && !document.hidden);
    const want = (visible || seamsOn()) && !document.hidden && !reduce && !!geo && !signal.aborted;
    if (want && !raf) {
      last = sent = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!want && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  // Has the renderer name whatever is under the pointer now, without waiting for a frame.
  const look = () => geo && post({ type: "look", mx, my, scroll: scrollY, pointer });

  // Field-guide label for whatever the renderer found under the pointer. While the world moves, a new label waits until
  // the pointer has stayed on its thing for a moment, so sweeping across the scene on the way to a link names nothing.
  // A tap, or a world held still, names it straight away. The label is measured once each time its words change, since
  // measuring it every frame would have the browser lay the page out every frame.
  let tagW = 0,
    tagH = 0;
  function show(best, linger) {
    if (linger) {
      const now = performance.now();
      if (best !== aim) {
        aim = best;
        aimAt = now;
      }
      if (best && best !== shown && now - aimAt < LINGER) best = null;
    }
    if (best !== shown) {
      shown = best;
      // The trader's letter is read, not recorded.
      if (best === "mail") {
        const n = letters(),
          [from, words] = LETTERS[n - 1];
        tag.innerHTML = `<i>Epistula</i><b>From ${escape(from)}</b><span>${escape(words)}</span><em>Letter ${n} of ${LETTERS.length}</em>`;
      } else if (best === "weather") {
        const [latin, said] = WEATHER[weather.kind];
        tag.innerHTML = `<i>${latin}</i><b>Your weather</b><span>${escape(said)}</span>`;
      } else if (best?.[0] === "*") {
        // A real star is named, not recorded.
        const [latin, common, con] = STAR_NAMES[Number(best.slice(1))],
          where = CON_NAMES[con],
          hour = new Date().getHours();
        const said =
          (common ? `That’s a real star, in ${where}!` : "That’s a real star!") +
          " It’s up there right now, over wherever you are" +
          (hour >= 7 && hour < 19
            ? ", even in the daytime. The sun’s just too bright to see it."
            : ". Go outside and look!");
        tag.innerHTML = `<i>${escape(latin)}</i><b>${escape(common ?? `A star in ${where}`)}</b><span>${escape(said)}</span>`;
      } else if (best) {
        const [latin, common, said] = entry(best),
          fresh = record(best);
        const extra =
          best === "stack" && newHouse
            ? NEW_HOUSE
            : best === "sapling"
              ? treeNews()
              : (OCCASIONS[occasion]?.[best] ?? SEASONS[season]?.[best]);
        const line = extra ? `${said} ${extra}` : said;
        if (fresh && at()) post({ type: "burst", x: at().x, y: at().y });
        tag.innerHTML =
          `<i>${escape(latin)}</i><b>${escape(common)}</b><span>${escape(line)}</span>` +
          (fresh
            ? `<em>${RARE.includes(best) ? "Rare sighting" : "New field guide entry"} · ${tally().replace(/ /g, "")}</em>`
            : "");
      }
      if (best) {
        tagW = tag.offsetWidth;
        tagH = tag.offsetHeight;
      }
      tag.classList.toggle("on", !!best);
      if (!best && reduce) tag.replaceChildren();
    }
    // Beside the pointer, or clear of the ring round what the keyboard is on.
    const p = at(),
      gap = spot ? ringSize(spot) * 0.7 : 0;
    if (best && p) {
      const x = clamp(p.x + 18 + gap, 8, W - tagW - 8),
        y = p.y + 22 + gap + tagH > H - 8 ? p.y - tagH - 14 - gap : p.y + 22 + gap;
      tag.style.transform = `translate(${x}px,${y}px)`;
    }
  }

  // Once a label has faded out, its words go too, so a screen reader can't come across a label that is no longer there.
  // Held still, a label doesn't fade, and goes as soon as it is hidden.
  tag.addEventListener("transitionend", () => tag.classList.contains("on") || tag.replaceChildren(), { signal });

  function localPoint(e) {
    const b = hero.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  // Over a link, a button or the open guide the pointer is on the page, not in the world, so nothing behind it gets
  // named or recorded. The layers still follow it.
  hero.addEventListener(
    "pointermove",
    (e) => {
      const p = localPoint(e);
      pointer = /** @type {Element} */ (e.target).closest("a, button, [data-guide]") ? null : p;
      lastMove = performance.now();
      if (pressed) post({ type: "drag", x: p.x, y: p.y });
      if (reduce) return look();
      tmx = (p.x / W) * 2 - 1;
      tmy = (p.y / H) * 2 - 1;
    },
    { signal },
  );
  // A finger lifting off the screen leaves as well, but a tap's label stays up for a moment: the tap clears it itself.
  hero.addEventListener(
    "pointerleave",
    (e) => {
      if (e.pointerType === "touch") return;
      pointer = null;
      tmx = tmy = 0;
      if (reduce) look();
    },
    { signal },
  );
  // A click sends a ring of light through the scene, and knocks on the arch if it lands there. A press is followed
  // until it lets go, for sweeping across the lanterns and for holding still to brew a storm. With a mouse, it starts no
  // text selection, so a sweep that strays over the heading doesn't select it.
  hero.addEventListener(
    "pointerdown",
    (e) => {
      // Touching the world with a pointer takes it back from the keyboard.
      if (document.activeElement === explore) explore.blur();
      if (!geo || /** @type {Element} */ (e.target).closest("a, button, [data-guide]")) return;
      const p = localPoint(e);
      if (e.pointerType === "mouse") e.preventDefault();
      pressed = true;
      // A finger on a star after dark is joining up the stars, and one on the campfire is toasting a marshmallow, so
      // dragging it doesn't scroll the page.
      holding = e.pointerType !== "mouse" && ((P.night && onStar(p)) || onFire(p));
      // Touch has no hover, so a tap also names whatever is under the finger for a moment.
      if (e.pointerType !== "mouse") {
        pointer = p;
        lastMove = performance.now();
        look();
        clearTimeout(touchTimer);
        timers.delete(touchTimer);
        touchTimer = later(() => {
          pointer = null;
          look();
        }, 2600);
      }
      sound?.play("chime", (p.x / W) * 2 - 1);
      post({ type: "down", x: p.x, y: p.y });
    },
    { signal },
  );
  for (const type of ["pointerup", "pointercancel"]) {
    addEventListener(
      type,
      () => {
        if (!pressed) return;
        pressed = holding = false;
        post({ type: "up" });
      },
      { signal },
    );
  }
  hero.addEventListener(
    "touchmove",
    (e) => {
      if (holding) e.preventDefault();
    },
    { passive: false, signal },
  );

  // Exploring from the keyboard. The world takes focus after the hero's buttons, starting on the lantern maple. The arrow
  // keys step from thing to thing, and Enter or Space presses on the one the keyboard is on for as long as it is held, as
  // a pointer would. A ring marks it, and its label shows, and is read out, as a hover's is. `spot` is where it is on the
  // hero, as the renderer last said.
  const { explore, ring } = el;
  let spot = null,
    ringR = 0,
    keyed = false;
  const at = () => spot ?? pointer;
  const ringSize = (s) => clamp(s.r, 14, 64);
  function mark(s) {
    s = document.activeElement === explore ? s : null;
    if (!s && !spot) return;
    spot = s;
    ring.hidden = !s;
    if (!s) return;
    const r = ringSize(s);
    if (r !== ringR) ring.style.width = ring.style.height = `${(ringR = r) * 2}px`;
    ring.style.transform = `translate(${(s.x - r).toFixed(1)}px,${(s.y - r).toFixed(1)}px)`;
  }
  const pressKey = (e) => e.key === "Enter" || e.key === " ";
  function letGo() {
    if (!keyed) return;
    keyed = false;
    post({ type: "up" });
  }
  explore.addEventListener("focus", () => geo && post({ type: "aim", dir: "in" }), { signal });
  explore.addEventListener(
    "blur",
    () => {
      letGo();
      mark(null);
      if (geo) post({ type: "aim" });
    },
    { signal },
  );
  explore.addEventListener(
    "keydown",
    (e) => {
      if (!geo || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        post({ type: "aim", dir: e.key });
      } else if (pressKey(e)) {
        e.preventDefault();
        if (e.repeat || keyed || !spot) return;
        keyed = true;
        sound?.play("chime", (spot.x / W) * 2 - 1);
        post({ type: "down", x: spot.x, y: spot.y });
      }
    },
    { signal },
  );
  explore.addEventListener("keyup", (e) => pressKey(e) && letGo(), { signal });

  // Whether a point on the hero is on one of the stars to join up. They hang in the high sky, at depth 0.
  function onStar(p) {
    const S = geo.stars,
      [ox, oy] = offset(0);
    return S.pts.some(([x, y]) => Math.hypot(x * geo.U + ox - p.x, y * geo.U + oy - p.y) < S.R * geo.U);
  }
  // Whether it is on the campfire, on the island's layer.
  function onFire(p) {
    const [x, y, r] = geo.fire,
      [ox, oy] = offset(D_ISLE);
    return Math.hypot(x * geo.U + ox - p.x, y * geo.U + oy - p.y) < r * geo.U;
  }
  function keepJar(n) {
    jar = n;
    try {
      localStorage.setItem("world-jar", String(n));
    } catch {}
  }
  function plant(u) {
    tree = { u, age: 0, grew: false };
    try {
      localStorage.setItem("world-tree", JSON.stringify({ u, day: days, seen: 0 }));
    } catch {}
  }
  // Seeds that came down on the turf, each kept for a dandelion on a later day, but not one right on top of another.
  function sow(us) {
    for (const u of us) if (!seeds.some(([v]) => Math.abs(v - u) < 0.005)) seeds.push([u, days]);
    seeds = seeds.slice(-SOWN);
    try {
      localStorage.setItem("world-seeds", JSON.stringify(seeds));
    } catch {}
  }
  const treeNews = () => (tree?.age === 4 ? TREE_GROWN : tree?.grew ? TREE_GREW : null);
  // A leaf caught as it fell, pressed in the field guide. It is kept straight away, with the year it fell, for the guide
  // and that autumn's postcards; only the last few are. Then it flies into the guide's button from just where and how
  // it was falling, turning face-on and growing as if lifted out of the scene, and lands with a soft pat.
  function pressLeaf({ x, y, r, rot, flip, c, fill }) {
    const year = new Date().getFullYear(),
      kept = leaves?.year === year ? leaves.leaves : [];
    leaves = { year, leaves: [...kept, { c, r: Math.round((Math.random() - 0.5) * 120) / 100 }].slice(-KEPT_LEAVES) };
    try {
      localStorage.setItem("world-pressed", JSON.stringify(leaves));
    } catch {}
    const h = hero.getBoundingClientRect(),
      b = guideBtn.getBoundingClientRect();
    const dx = b.left + 13.5 - h.left - x,
      dy = b.top + b.height / 2 - h.top - y;
    const land = () => {
      sound?.play("pressed", ((x + dx) / W) * 2 - 1);
      if (record("pressed")) return;
      renderGuide();
      pulse();
    };
    if (reduce) return land();
    const leaf = document.createElement("span"),
      R = r * 1.1;
    leaf.className = "pressing";
    leaf.style.width = leaf.style.height = `${R * 2}px`;
    leaf.innerHTML = leafSvg(fill);
    hero.appendChild(leaf);
    // At night it was in the dark's shade; lifted out, it takes the colour it keeps pressed.
    /** @type {SVGPathElement} */ (leaf.querySelector("path")).animate(
      [{ fill: `rgb(${fill})` }, { fill: `rgb(${LEAVES[c]})` }],
      { duration: 360, fill: "forwards" },
    );
    const at = (u, v, k, a, f = 1) => `translate(${x - R + u}px,${y - R + v}px) rotate(${a}rad) scale(${k},${k * f})`;
    leaf.animate(
      [
        { transform: at(0, 0, 1, rot, flip), easing: "cubic-bezier(.2,.7,.3,1)" },
        {
          transform: at(dx * 0.08, Math.min(-30, dy * 0.08), 2.2, rot * 0.3),
          offset: 0.3,
          easing: "cubic-bezier(.45,0,.35,1)",
        },
        { transform: at(dx, dy, 0.7, 0), opacity: 1, offset: 0.88 },
        { transform: at(dx, dy, 0.3, 0), opacity: 0 },
      ],
      1200,
    ).onfinish = () => {
      leaf.remove();
      if (!signal.aborted) land();
    };
  }
  // A constellation just drawn gets a name, and goes in the field guide, with the label saying so at once.
  function nameStars({ pts, links, ids }) {
    stars = { pts, links, ids, name: `The ${pickOne(STAR_ADJ)} ${pickOne(STAR_NOUN)}` };
    try {
      localStorage.setItem("world-stars", JSON.stringify(stars));
    } catch {}
    shown = null;
    show("mine");
    renderGuide();
  }
  // A field-guide entry, with the visitor's own name for their constellation. It is text, to be escaped in markup.
  const entry = (k) => (k === "mine" && stars ? [GUIDE.mine[0], stars.name, GUIDE.mine[2]] : GUIDE[k]);

  // Field guide: every creature and place the visitor has hovered, kept in this browser only.
  const { guideBtn, guide: guideEl, guideList, guideCount, guideFoot, guideViews, guideMap, guideMail } = el;
  const map = makeMap(guideMap, signal);
  let view = "list";
  let found = new Set();
  try {
    found = new Set((JSON.parse(localStorage.getItem("field-guide") ?? "null") || []).filter((k) => GUIDE[k]));
  } catch {}
  // A phone shows fewer landmarks, and a world held still for reduced motion brews no storms, so the guide lists only
  // what can be found.
  const guideOrder = () => GUIDE_ORDER.filter((g) => !(geo && geo.phone && g[2]) && !(reduce && g[0] === "storm"));
  const foundCount = () => guideOrder().filter(([k]) => found.has(k)).length;
  // The desk behind the arch, the barbell in the stars, the visitor's own tree, the autumn leaf pile, a pressed leaf,
  // the far gate opened wide, the rare sightings and the world starting over are not on the list. Finding them puts the
  // count past the total.
  const extras = () =>
    ["desk", "lifter", "sapling", "leaves", "pressed", "gatesong", ...RARE, "loop"].filter((k) => found.has(k));
  const tally = () => `${foundCount() + extras().length} / ${guideOrder().length}`;
  // The song grows with the guide: how much of it has been found, from 0 to 1.
  const songLevel = () => foundCount() / guideOrder().length;
  // How many of the band have joined, as the song grows: the tune first, then the chords, the plucked notes, and the
  // echo of the tune once everything is found.
  const players = (l = songLevel()) => (l <= 0 ? 0 : l >= 1 ? 4 : l >= 0.5 ? 3 : l >= 0.25 ? 2 : 1);
  // The pressed leaves, laid in the guide beside their entry.
  const pressedRow = () =>
    `<span class="pressed">${(leaves?.leaves ?? []).map((l) => leafSvg(LEAVES[l.c], Math.round(l.r * 57.3))).join("")}</span>`;
  // Each entry's number is for the eye: a screen reader counts the list's items itself, which the list's role keeps
  // even in Safari, where a list drawn without markers otherwise stops being one.
  function renderGuide() {
    const order = guideOrder(),
      n = foundCount();
    guideCount.textContent = tally();
    guideList.innerHTML =
      order
        .map(([k, hint], i) => {
          const n = String(i + 1).padStart(2, "0");
          return found.has(k)
            ? `<li class="got"><span class="n" aria-hidden="true">${n}</span><span><i>${escape(entry(k)[0])}</i><b>${escape(entry(k)[1])}</b></span></li>`
            : `<li><span class="n" aria-hidden="true">${n}</span><span><b>Unrecorded</b><small>${hint}</small></span></li>`;
        })
        .join("") +
      extras()
        .map(
          (k, i) =>
            `<li class="got extra"><span class="n" aria-hidden="true">${order.length + i + 1}</span><span><i>${GUIDE[k][0]}</i><b>${GUIDE[k][1]}</b><small>${RARE.includes(k) ? "Rare sighting" : "Not on the list"}${k === "loop" && loops > 1 ? ` · ${loops} times so far` : ""}</small>${k === "pressed" ? pressedRow() : ""}</span></li>`,
        )
        .join("");
    const done = n === order.length,
      more = extras().length;
    guideFoot.textContent = !done
      ? "Hover anything in the scene to record it."
      : more
        ? `All ${n} found, plus ${["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][more - 1] ?? more} ${more > 1 ? "that were" : "that was"} never on the list. Thanks for looking so closely.`
        : `All ${n} found. That is everything out here, as far as anyone knows. Thanks for looking so closely.`;
    guideBtn.classList.toggle("done", done);
    if (view === "map") map.draw({ found, order, entry });
    // The letters, in the order they came, are kept in the guide once the first has.
    const mailBtn = /** @type {HTMLElement} */ (guideViews.querySelector('[data-view="mail"]'));
    mailBtn.hidden = !letters();
    if (view === "mail")
      guideMail.innerHTML = LETTERS.slice(0, letters())
        .map(([from, words]) => `<li class="got"><b>From ${escape(from)}</b><span>${escape(words)}</span></li>`)
        .join("");
  }
  // The guide shows as a list, as a map of what mentions what, or as the trader's letters.
  guideViews.addEventListener(
    "click",
    (e) => {
      const b = /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest("[data-view]"));
      if (!b?.dataset.view) return;
      view = b.dataset.view;
      for (const o of guideViews.querySelectorAll("[data-view]")) o.setAttribute("aria-pressed", String(o === b));
      guideList.hidden = view !== "list";
      guideMap.hidden = view !== "map";
      guideMail.hidden = view !== "mail";
      guideEl.classList.toggle("mapped", view === "map");
      renderGuide();
    },
    { signal },
  );
  function record(k) {
    if (found.has(k)) return false;
    found.add(k);
    try {
      localStorage.setItem("field-guide", JSON.stringify([...found]));
    } catch {}
    renderGuide();
    pulse();
    sound?.play("found", at() ? (at().x / W) * 2 - 1 : 0);
    sound?.song(songLevel());
    post({ type: "band", n: players() });
    // Only the find that finishes the list calls up the serpent and sets off the festival, not something off the list
    // found after it.
    if (complete() && guideOrder().some(([g]) => g === k)) {
      post({ type: "serpent" });
      later(celebrate, 1500);
    }
    return true;
  }
  // The guide's button glows for a moment.
  function pulse() {
    guideBtn.classList.remove("new");
    void guideBtn.offsetWidth;
    guideBtn.classList.add("new");
  }
  const complete = () => foundCount() === guideOrder().length;
  // The lantern festival, kept to once a day. If the world is out of sight when it is due, it waits until it is back.
  let festDue = false;
  function celebrate() {
    festDue = !visible || document.hidden;
    if (festDue) return;
    post({ type: "festival" });
    try {
      localStorage.setItem("world-festival", new Date().toDateString());
    } catch {}
  }
  try {
    if (!reduce && localStorage.getItem("world-festival") !== new Date().toDateString())
      later(() => complete() && celebrate(), FESTIVAL);
  } catch {}
  // The guide opens upward, so on a short screen it stops below the site's header instead of running under it.
  function openGuide(open) {
    const top = document.querySelector(".nav")?.getBoundingClientRect().bottom ?? 0;
    guideEl.style.maxHeight = open
      ? `min(76vh, 620px, ${Math.max(200, guideBtn.getBoundingClientRect().top - top - 20)}px)`
      : "";
    guideEl.hidden = !open;
    guideBtn.setAttribute("aria-expanded", String(open));
  }
  guideBtn.addEventListener("click", () => openGuide(guideEl.hidden), { signal });
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!guideEl.hidden && !(/** @type {Element} */ (e.target).closest("[data-guide]"))) openGuide(false);
    },
    { signal },
  );
  // Escape shuts it from anywhere, and takes focus back to its button only from inside it, where focus would be lost.
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape" && !guideEl.hidden) {
        const inside = guideEl.contains(document.activeElement);
        openGuide(false);
        if (inside) guideBtn.focus();
      }
    },
    { signal },
  );
  renderGuide();

  // A postcard of the world as it is right now: the renderer flattens the layers, and postcard.js frames them, with any
  // leaves pressed this autumn tucked in. Its code loads on the first click, so it costs the page nothing until someone
  // wants one. If the code fails to load, the picture is let go.
  const { postcardBtn } = el;
  postcardBtn.addEventListener("click", () => geo && post({ type: "snap" }), { signal });
  function postcard(img) {
    const font = (e) => getComputedStyle(e).fontFamily;
    import("./postcard").then(
      ({ savePostcard }) =>
        savePostcard(img, {
          W,
          geo,
          season,
          night: P.night,
          tally: tally(),
          complete: complete(),
          display: font(hero.querySelector("h1")),
          mono: font(guideBtn),
          pressed: season === "autumn" && leaves?.year === new Date().getFullYear() ? leaves.leaves : [],
        }),
      () => img.close?.(),
    );
  }

  // A theme switch waits for the paint worker's bitmaps of the other theme, then hands them to the renderer when the
  // theme changes. The world keeps moving while it waits, so the wait never freezes. With the world out of view, the
  // switch spreads from the control instead of from the sun or moon, and a click on the door in the sky spreads it from
  // the doorway.
  let doorway = null;
  function portal({ x, y }) {
    const b = hero.getBoundingClientRect();
    doorway = { x: b.left + x, y: b.top + y };
    switchTheme(isDarkTheme() ? "light" : "dark", doorway).finally(() => (doorway = null));
  }
  const unstage = setThemeStage({
    prepare: async () => {
      const ready = spare && (await spare);
      release(held);
      held = ready;
    },
    origin: () => {
      if (doorway) return doorway;
      if (!geo) return null;
      const [ox, oy] = offset(0),
        b = hero.getBoundingClientRect(),
        x = b.left + geo.L[0] * geo.U + ox,
        y = b.top + geo.L[1] * geo.U + oy;
      return y > 0 && y < innerHeight ? { x, y } : null;
    },
  });
  function onTheme() {
    const ready = held;
    held = null;
    if (!geo || P.night === isDarkTheme()) return release(ready);
    const ok = fits(ready, isDarkTheme());
    if (!ok) release(ready);
    gen++;
    P = palette();
    post({ type: "theme", night: P.night, bitmaps: ok ? ready.bitmaps : null }, ok ? ready.bitmaps : []);
    sound?.night(P.night);
    sound?.play("swell", doorway ? (doorway.x / innerWidth) * 2 - 1 : 0);
    prepare();
    drawSeams(0, last / 1000, true);
  }
  const unwatch = watchTheme(onTheme);

  // Sound, off until asked for. The audio context has to start inside the click itself for the browser to let it play,
  // so it is made here and handed to sound.js once that loads.
  const { soundBtn } = el;
  soundBtn.addEventListener(
    "click",
    () => {
      const on = soundBtn.getAttribute("aria-pressed") !== "true";
      soundBtn.setAttribute("aria-pressed", String(on));
      const job = ++soundJob;
      sound?.stop();
      sound = null;
      if (!on || typeof AudioContext === "undefined") return;
      const ac = new AudioContext();
      import("./sound").then(
        ({ makeSound }) => {
          if (job !== soundJob || signal.aborted) return ac.close();
          // In the page's theme, which the world's palette follows, and which is there before the world has a size to be
          // laid out at.
          sound = makeSound(ac, isDarkTheme(), occasion);
          sound.song(songLevel());
          if (geo) {
            sound.seat(geo.band);
            sound.place(geo.spots);
          }
          sound.near(near);
          sound.active(visible && !document.hidden);
        },
        () => {
          // Its code didn't load, so there is no sound to play and the button goes back to off.
          ac.close();
          if (job === soundJob) soundBtn.setAttribute("aria-pressed", "false");
        },
      );
    },
    { signal },
  );

  const heroIo = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (!visible && geo) post({ type: "unseen" });
    sync();
    if (festDue) celebrate();
  });
  heroIo.observe(hero);
  const seamIo = new IntersectionObserver((entries) => {
    for (const e of entries) seams.find((s) => s.cv === e.target).on = e.isIntersecting;
    sync();
  });
  for (const s of seams) seamIo.observe(s.cv);
  // While the page is out of sight, its tab says the world misses the visitor. Back after a while, they find something
  // changed.
  let title = null,
    hiddenAt = 0;
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        if (geo) post({ type: "unseen" });
        hiddenAt = performance.now();
        title = document.title;
        document.title = MISSED[Math.floor(Math.random() * MISSED.length)];
      } else if (title !== null) {
        document.title = title;
        title = null;
        const gone = performance.now() - hiddenAt;
        if (geo && gone > AWAY) post({ type: "away", secs: gone / 1000 });
        if (festDue) celebrate();
      }
      sync();
    },
    { signal },
  );
  // Anything stirring on the page keeps the world awake, or wakes it.
  for (const type of ["pointerdown", "keydown", "scroll", "wheel"])
    addEventListener(type, () => (stir = performance.now()), { passive: true, signal });
  // The page's wanderlights shy away from the pointer too.
  addEventListener(
    "pointermove",
    (e) => {
      stir = performance.now();
      for (const s of seams) {
        if (!s.on) continue;
        const b = s.cv.getBoundingClientRect();
        s.point(e.clientX - b.left, e.clientY - b.top);
      }
    },
    { passive: true, signal },
  );
  document.addEventListener(
    "pointerleave",
    () => {
      for (const s of seams) s.point(null);
    },
    { signal },
  );
  // A new size, or a move to a screen with a different pixel ratio, lays the world out again once it settles.
  let resizeTimer = 0;
  function resized() {
    clearTimeout(resizeTimer);
    timers.delete(resizeTimer);
    resizeTimer = later(() => {
      if (hero.clientWidth === W && hero.clientHeight === H && pixelRatio() === ratio) return;
      rebuild();
    }, 120);
  }
  const resizeObs = new ResizeObserver(resized);
  resizeObs.observe(hero);
  onPixelRatio(resized, signal);
  observers.push(heroIo, seamIo, resizeObs);

  // Arrival: the dark parts from the lantern tree, which flares as it wakes the world. It waits for the first paint.
  const wakeEl = el.wake;
  function awake() {
    if (woken) return;
    woken = true;
    if (reduce || !geo) return (wakeEl.hidden = true);
    const [ox, oy] = offset(D_ISLE);
    wakeEl.style.setProperty("--wx", `${geo.tree[0] * geo.U + ox}px`);
    wakeEl.style.setProperty("--wy", `${geo.tree[1] * geo.U + oy}px`);
    wakeEl.addEventListener("animationend", () => (wakeEl.hidden = true), { once: true, signal });
    wakeEl.classList.add("go");
    later(() => post({ type: "flash" }), 250);
  }
  // The world's own loop. After 22 minutes with the page open and in sight, the sun swells blue until everything goes
  // white, and the world starts over in the dark, arrival and all. It waits for the hero to be on screen, and it wakes
  // the world if it dozed off. A few things the visitor did come through it, which the renderer sees to, and the field
  // guide counts the times it has happened in this browser.
  let lived = 0,
    looping = false;
  function count() {
    if (!document.hidden) lived += 1000;
    if (lived >= loopAfter && visible && !document.hidden && geo && !looping && !reduce) {
      looping = true;
      stir = performance.now();
      post({ type: "nova" });
    }
    later(count, 1000);
  }
  later(count, 1000);
  function again() {
    lived = 0;
    looping = woken = false;
    wakeEl.classList.remove("go");
    wakeEl.style.animation = "none";
    wakeEl.hidden = false;
    void wakeEl.offsetWidth;
    wakeEl.style.animation = "";
    rebuild(true);
    loops++;
    try {
      localStorage.setItem("world-loops", String(loops));
    } catch {}
    later(() => record("loop") || renderGuide(), 4000);
  }

  start(true);
  rebuild(true);
  if (!W || !H) awake();

  // The weather where the visitor is, for the world to follow, which only a visitor the proxy placed has. The site
  // asks Open-Meteo for it (app/api/weather), so only the rough place leaves the site, never the visitor's address.
  // ?weather=rain, snow, fog, storm or wind brings that instead, for anyone.
  const weatherAsked = new URLSearchParams(location.search).get("weather");
  const { lat, lon, local } = skyHere();
  (Object.hasOwn(WEATHER, weatherAsked ?? "")
    ? Promise.resolve({ kind: weatherAsked, level: 0.7, wind: weatherAsked === "wind" ? 40 : 10 })
    : local
      ? fetch(`/api/weather?lat=${lat}&lon=${lon}`).then((r) => (r.ok ? r.json() : null))
      : Promise.resolve(null)
  )
    .then((w) => {
      if (signal.aborted || !w?.kind || !Object.hasOwn(WEATHER, w.kind)) return;
      weather = w;
      post({ type: "weather", w });
    })
    .catch(() => {});

  return () => {
    life.abort();
    if (title !== null) document.title = title;
    for (const o of observers) o.disconnect();
    for (const id of timers) clearTimeout(id);
    cancelAnimationFrame(raf);
    raf = 0;
    unstage();
    unwatch();
    soundJob++;
    sound?.stop();
    for (const done of waiting.values()) done(null);
    waiting.clear();
    release(held);
    held = null;
    if (spare) spare.then(release);
    if (painter) painter.terminate();
    if (worker) worker.terminate();
    for (const cv of cvs) cv.remove();
  };
}
