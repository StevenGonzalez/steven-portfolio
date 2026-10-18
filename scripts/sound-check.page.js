// Renders the world's sound offline, through a fixed script of every sound and every change the page makes to the song,
// and fingerprints each second of it. sound-check.mjs serves this page and the world's modules. Two versions of the
// sound code that make exactly the same sound give the same fingerprints.

import "/seeded-random.js";

const SAMPLE_RATE = 44100;
const hex = (buf) =>
  [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);

// The sound schedules its notes against ac.currentTime and times its loops with setTimeout and setInterval, and an
// offline context's clock stands still until it renders. So the script runs on a clock of its own, which both read:
// it steps forward through the whole script first, firing the timers as they fall due, and then the context renders
// everything that was scheduled. Suspending and closing mean nothing offline, so they are ignored. The page's own
// timers are put back before it waits on anything, since the browser running the check needs them.
let now = 0;
let timerId = 0;
const timers = new Map();
const realTimers = { setTimeout, setInterval, clearTimeout, clearInterval };
const scriptedTimers = {
  setTimeout: (f, ms = 0) => (timers.set(++timerId, { f, at: now + ms, every: 0 }), timerId),
  setInterval: (f, ms) => (timers.set(++timerId, { f, at: now + ms, every: ms }), timerId),
  clearTimeout: (id) => timers.delete(id),
  clearInterval: (id) => timers.delete(id),
};
function advance(to) {
  for (;;) {
    let next = null;
    for (const [id, timer] of timers) if (timer.at <= to && (!next || timer.at < next[1].at)) next = [id, timer];
    if (!next) break;
    const [id, timer] = next;
    now = timer.at;
    if (timer.every) timer.at += timer.every;
    else timers.delete(id);
    timer.f();
  }
  now = to;
}
class ScriptedContext extends OfflineAudioContext {
  get currentTime() {
    return now / 1000;
  }
  suspend() {
    return Promise.resolve();
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

// What a few sounds need to know more than where they are: how a gust blows, and that the kite looped.
const ARGS = { gust: { str: 0.7, dur: 2.5, cross: 3, tree: 1.2 }, kite: true };

try {
  const { code, night, occasion, sounds } = JSON.parse(new URLSearchParams(location.search).get("run"));
  const { makeSound } = await import(`/${code}/sound`);

  // Every sound in turn, from one side and then the other, over the wind and the world's own sounds. Then the song,
  // growing from a quarter of the field guide to all of it, a fire hovered and left, the world dozing off and waking,
  // the theme switched, the world scrolled away and back, and the sound turned off.
  const script = [
    [
      0.5,
      "the layout",
      (s) => (s.seat([-0.5, -0.15, 0.2, 0.5]), s.place({ falls: [-0.3, 0.5], up: 0.7, fire: 0.2, tree: 0.3 })),
    ],
  ];
  sounds.forEach((name, i) => script.push([2 + i * 1.5, name, (s) => s.play(name, ((i % 5) - 2) * 0.35, ARGS[name])]));
  let t = 2 + sounds.length * 1.5 + 2;
  for (const [after, label, f] of [
    [0, "the song at a quarter", (s) => s.song(0.25)],
    [9, "the song at half", (s) => s.song(0.5)],
    [5, "a fire hovered", (s) => s.near([1, 2])],
    [4, "the song at three quarters", (s) => s.song(0.75)],
    [4, "the fire left", (s) => s.near(null)],
    [5, "the whole song", (s) => s.song(1)],
    [9, "the world asleep", (s) => s.sleep(true)],
    [9, "the world awake", (s) => s.sleep(false)],
    [3, "the theme switched", (s) => s.night(!night)],
    [6, "the world out of view", (s) => s.active(false)],
    [3, "the world back", (s) => s.active(true)],
    [4, "sound turned off", (s) => s.stop()],
  ])
    script.push([(t += after), label, f]);
  const seconds = Math.ceil(t + 2);

  const ac = new ScriptedContext({ numberOfChannels: 2, length: seconds * SAMPLE_RATE, sampleRate: SAMPLE_RATE });
  Object.assign(globalThis, scriptedTimers);
  const sound = makeSound(ac, night, occasion);
  for (const [at, , f] of script) {
    advance(at * 1000);
    f(sound);
  }
  advance(seconds * 1000);
  Object.assign(globalThis, realTimers);
  const rendered = await ac.startRendering();

  // A fingerprint for each second, both channels, and what the script had last started by then.
  const left = rendered.getChannelData(0);
  const right = rendered.getChannelData(1);
  const out = [];
  let peak = 0;
  let broken = 0;
  for (let i = 0; i < left.length; i++) {
    const v = Math.max(Math.abs(left[i]), Math.abs(right[i]));
    if (Number.isNaN(v)) broken++;
    else peak = Math.max(peak, v);
  }
  for (let s = 0; s < seconds; s++) {
    const span = [s * SAMPLE_RATE, (s + 1) * SAMPLE_RATE];
    const both = new Uint8Array(SAMPLE_RATE * 8);
    both.set(new Uint8Array(left.slice(...span).buffer), 0);
    both.set(new Uint8Array(right.slice(...span).buffer), both.length / 2);
    const playing = script.findLast(([at]) => at <= s + 1)?.[1] ?? "the wind";
    out.push({ second: s, playing, hash: hex(await crypto.subtle.digest("SHA-1", both)) });
  }
  window.result = { out, peak, broken };
} catch (e) {
  Object.assign(globalThis, realTimers);
  window.result = { error: String((e && e.stack) || e) };
}
