// Sound at the edge of the world, made with Web Audio as it plays, as the home page's is: the low roar of the falls
// underneath, a breath of air as a lantern is let go, and a bell when one becomes a star. The bells ring in A minor
// pentatonic, the key the home page's song plays in at night, low for a star on the left and high on the right.

const SCALE = [57, 60, 62, 64, 67];
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const note = (i) => hz(SCALE[i % 5] + 12 * Math.floor(i / 5));

// `ac` is made by the caller inside the click that turned sound on, which is what lets the browser play it.
export function makeEdgeSound(ac) {
  const comp = new DynamicsCompressorNode(ac, { threshold: -18, knee: 12, ratio: 3, attack: 0.01, release: 0.3 }),
    master = new GainNode(ac, { gain: 0 });
  master.connect(comp).connect(ac.destination);

  // A long dark hall from filtered noise, so a bell carries out over the void.
  const n = Math.round(ac.sampleRate * 4.5),
    ir = ac.createBuffer(2, n, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let y = 0;
    for (let i = 0; i < n; i++) {
      y += (Math.random() * 2 - 1 - y) * 0.3;
      d[i] = y * Math.exp((-4 * i) / n) * Math.min(1, i / (ac.sampleRate * 0.02));
    }
  }
  const verb = new ConvolverNode(ac, { buffer: ir });
  verb.connect(new GainNode(ac, { gain: 0.6 })).connect(master);
  const noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  noise.getChannelData(0).forEach((_, i, d) => (d[i] = Math.random() * 2 - 1));

  function out(node, pan, space) {
    const p = new StereoPannerNode(ac, { pan: Math.max(-1, Math.min(1, pan)) });
    node.connect(p);
    p.connect(new GainNode(ac, { gain: 1 - space * 0.5 })).connect(master);
    p.connect(new GainNode(ac, { gain: space })).connect(verb);
  }
  function hiss(t) {
    const s = new AudioBufferSourceNode(ac, { buffer: noise, loop: true });
    s.start(t, Math.random() * 1.5);
    return s;
  }

  // The falls: noise kept low and dark, swelling and easing very slowly.
  const roar = new GainNode(ac, { gain: 0.05 }),
    swell = new OscillatorNode(ac, { frequency: 0.06 }),
    depth = new GainNode(ac, { gain: 0.015 });
  swell.connect(depth).connect(roar.gain);
  swell.start();
  const rumble = hiss(ac.currentTime);
  rumble.connect(new BiquadFilterNode(ac, { type: "lowpass", frequency: 420, Q: 0.3 })).connect(roar);
  out(roar, 0, 0.5);

  // A soft struck bell: a sine with a few quieter overtones that die away faster, each strike a little different.
  function bell(f, t, vol, pan, len) {
    const g = new GainNode(ac);
    out(g, pan, 0.7);
    const hit = 0.85 + Math.random() * 0.3;
    for (const [r, a, k] of [
      [1, 1, 1],
      [2, 0.2, 0.5],
      [3.01, 0.07, 0.3],
    ]) {
      const pg = new GainNode(ac, { gain: 0 });
      pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(vol * a * hit, t + 0.004);
      pg.gain.setTargetAtTime(0, t + 0.004, (len * k) / 4);
      const o = new OscillatorNode(ac, { frequency: f * r });
      o.start(t);
      o.stop(t + len * 1.5);
      o.connect(pg).connect(g);
    }
  }

  return {
    // Air past a lantern as it lifts off: noise through a band sweeping up, a little different each time.
    release(pan) {
      const t = ac.currentTime,
        p = 2 ** ((Math.random() * 2 - 1) * 0.1),
        bp = new BiquadFilterNode(ac, { type: "bandpass", Q: 1.4, frequency: 300 * p }),
        g = new GainNode(ac, { gain: 0 });
      bp.frequency.setValueAtTime(300 * p, t);
      bp.frequency.exponentialRampToValueAtTime(1100 * p, t + 1.6);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.7);
      g.gain.linearRampToValueAtTime(0, t + 1.7);
      const s = hiss(t);
      s.stop(t + 1.8);
      s.connect(bp).connect(g);
      out(g, pan, 0.5);
    },
    // A new star: two notes on the scale, the second a step above, from where it landed.
    star(pan) {
      const t = ac.currentTime,
        i = 5 + Math.round(((pan + 1) / 2) * 6);
      bell(note(i), t, 0.12, pan, 3.4);
      bell(note(i + 2), t + 0.22, 0.06, pan, 3);
    },
    active(on) {
      master.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, on ? 0.6 : 0.2);
    },
    stop() {
      master.gain.setTargetAtTime(0, ac.currentTime, 0.15);
      setTimeout(() => ac.close(), 800);
    },
  };
}
