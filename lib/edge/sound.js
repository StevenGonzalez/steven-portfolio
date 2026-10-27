// Sound at the edge of the world, made with Web Audio as it plays, as the home page's is: the low roar of the falls
// underneath, a breath of air as a lantern is let go, a bell when one becomes a star, and a soft answer from each thing
// that is clicked. The bells ring in A minor pentatonic, the key the home page's song plays in at night, low for a star
// on the left and high on the right. Each method takes where the sound is from, -1 on the left to 1 on the right.

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

  // A short breath of noise through a band, for a door, leaves or spray.
  function breath(t, from, to, len, vol, pan, q = 1.2) {
    const bp = new BiquadFilterNode(ac, { type: "bandpass", Q: q, frequency: from }),
      g = new GainNode(ac, { gain: 0 });
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(to, t + len);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + len * 0.2);
    g.gain.linearRampToValueAtTime(0, t + len);
    const s = hiss(t);
    s.stop(t + len + 0.05);
    s.connect(bp).connect(g);
    out(g, pan, 0.4);
  }

  return {
    // Air past a lantern as it lifts off: noise through a band sweeping up, a little different each time.
    lantern(pan) {
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
    // The lighthouse signalling: a low bell and the fifth above it, ringing out long into the hall.
    lighthouse(pan) {
      const t = ac.currentTime;
      bell(note(0), t, 0.14, pan, 5);
      bell(note(3), t + 0.35, 0.07, pan, 4.5);
    },
    // The cottage door: a creak as it opens, two soft knocks of wood as it settles, and the latch again as it shuts.
    cottage(pan) {
      const t = ac.currentTime;
      breath(t, 700, 1100, 0.5, 0.05, pan, 9);
      for (const at of [0.55, 0.7, 3.4]) {
        const o = new OscillatorNode(ac, { frequency: 150 + Math.random() * 30 }),
          g = new GainNode(ac, { gain: 0 });
        g.gain.setValueAtTime(0, t + at);
        g.gain.linearRampToValueAtTime(0.12, t + at + 0.004);
        g.gain.setTargetAtTime(0, t + at + 0.004, 0.03);
        o.connect(g);
        o.start(t + at);
        o.stop(t + at + 0.3);
        out(g, pan, 0.3);
      }
    },
    // The maple's leaves: a high rustle that fades.
    maple(pan) {
      const t = ac.currentTime;
      breath(t, 2600, 1800, 0.9, 0.04, pan, 0.8);
      breath(t + 0.25, 3200, 2000, 0.7, 0.025, pan, 0.8);
    },
    // The whale: a low call gliding up and back, and the hiss of its spout.
    whale(pan) {
      const t = ac.currentTime,
        o = new OscillatorNode(ac, { frequency: hz(45) }),
        g = new GainNode(ac, { gain: 0 });
      o.frequency.setValueAtTime(hz(45), t);
      o.frequency.exponentialRampToValueAtTime(hz(52), t + 1.1);
      o.frequency.exponentialRampToValueAtTime(hz(47), t + 2.4);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.5);
      g.gain.linearRampToValueAtTime(0, t + 2.6);
      o.connect(g);
      o.start(t);
      o.stop(t + 2.7);
      out(g, pan, 0.8);
      breath(t + 0.1, 1800, 900, 1.2, 0.035, pan);
    },
    // A jelly flaring: a quick high bell, two notes up.
    jelly(pan) {
      const t = ac.currentTime,
        i = 10 + Math.floor(Math.random() * 3);
      bell(note(i), t, 0.05, pan, 1.6);
      bell(note(i + 2), t + 0.08, 0.035, pan, 1.4);
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
