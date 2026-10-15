// Sound for the world, made as it plays with Web Audio: no audio files. It is off until the visitor turns it on, and
// stage.js loads this file only then. A soft wind and the odd wind chime play underneath; a click rings a note picked by
// where it lands, low on the left and high on the right; and the things that react to a click make sounds of their own.
// Dusk plays in D major pentatonic, night in A minor pentatonic, so a click anywhere stays in tune.

const SCALES = { dusk: [62, 64, 66, 69, 71], night: [57, 60, 62, 64, 67] };
const hz = m => 440 * 2 ** ((m - 69) / 12);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// `ac` is created by the caller inside the click that turned sound on, which is what lets the browser play it.
export function makeSound(ac, night) {
  let scale = SCALES[night ? 'night' : 'dusk'], live = true, on = true, chimeTimer = 0;

  // Everything ends in a gentle compressor, so a busy moment cannot clip.
  const comp = new DynamicsCompressorNode(ac, { threshold: -18, knee: 12, ratio: 3, attack: .01, release: .3 });
  const master = new GainNode(ac, { gain: .9 });
  master.connect(comp).connect(ac.destination);

  // A long, dark hall made from filtered noise, so each sound carries across the sky.
  const verb = new ConvolverNode(ac, { buffer: hall(3.4) });
  verb.connect(new GainNode(ac, { gain: .55 })).connect(master);
  const noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  noise.getChannelData(0).forEach((_, i, d) => (d[i] = Math.random() * 2 - 1));

  function hall(len) {
    const n = Math.round(ac.sampleRate * len), b = ac.createBuffer(2, n, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let y = 0;
      for (let i = 0; i < n; i++) {
        y += (Math.random() * 2 - 1 - y) * .3;
        d[i] = y * Math.exp((-4 * i) / n) * Math.min(1, i / (ac.sampleRate * .02));
      }
    }
    return b;
  }

  // Sends a voice to the speakers at `pan` (-1 to 1), with `space` of it into the hall.
  function out(node, pan = 0, space = .4) {
    const p = new StereoPannerNode(ac, { pan: clamp(pan, -1, 1) });
    node.connect(p);
    p.connect(new GainNode(ac, { gain: 1 - space * .5 })).connect(master);
    p.connect(new GainNode(ac, { gain: space })).connect(verb);
  }
  // A quick rise to `peak`, then an exponential fall with time constant `fall`.
  function env(param, t, rise, peak, fall) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + rise);
    param.setTargetAtTime(0, t + rise, fall);
  }
  function osc(type, f, t, end) {
    const o = new OscillatorNode(ac, { type, frequency: f });
    o.start(t);
    if (end) o.stop(end);
    return o;
  }
  function hiss(t, end) {
    const s = new AudioBufferSourceNode(ac, { buffer: noise, loop: true });
    s.start(t, Math.random() * 1.5);
    if (end) s.stop(end);
    return s;
  }

  // A soft struck chime: a sine with a few quieter overtones that die away faster than it does.
  function bell(f, t, vol, pan, len = 1.8, space = .5) {
    const g = new GainNode(ac);
    out(g, pan, space);
    for (const [r, a, k] of [[1, 1, 1], [2, .22, .5], [3.01, .08, .3], [4.2, .04, .18]]) {
      const pg = new GainNode(ac, { gain: 0 });
      env(pg.gain, t, .003, vol * a, (len * k) / 4);
      osc('sine', f * r, t, t + len * 1.5).connect(pg).connect(g);
    }
  }
  // Noise through a band that sweeps across `fs`, swelling to `vol` and back out over `dur`.
  function whoosh(t, dur, fs, vol, pan, space = .4, q = 1.2) {
    const bp = new BiquadFilterNode(ac, { type: 'bandpass', Q: q, frequency: fs[0] });
    fs.forEach((f, i) => i && bp.frequency.exponentialRampToValueAtTime(f, t + (dur * i) / (fs.length - 1)));
    const g = new GainNode(ac, { gain: 0 });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * .55);
    g.gain.linearRampToValueAtTime(0, t + dur);
    hiss(t, t + dur + .05).connect(bp).connect(g);
    out(g, pan, space);
  }
  // A short hollow knock: a falling sine with a tap of noise on top.
  function tok(t, f, vol, pan) {
    const g = new GainNode(ac, { gain: 0 });
    env(g.gain, t, .002, vol, .045);
    const o = osc('sine', f, t, t + .4);
    o.frequency.exponentialRampToValueAtTime(f * .6, t + .1);
    o.connect(g);
    const n = new GainNode(ac, { gain: 0 });
    env(n.gain, t, .001, vol * .5, .015);
    hiss(t, t + .1).connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: f * 5, Q: 3 })).connect(n).connect(g);
    out(g, pan, .3);
  }
  const note = (i, oct = 0) => hz(scale[((i % 5) + 5) % 5] + 12 * (Math.floor(i / 5) + oct));

  const SOUNDS = {
    // A click anywhere: one note, two octaves across the width of the world.
    chime(t, pan) {
      bell(note(Math.round((pan + 1) * 4.5)), t, .16, pan * .7, 2.2, .5);
    },
    // A new field-guide entry.
    found(t, pan) {
      [4, 6, 9].forEach((k, i) => bell(note(k, 1), t + i * .075, .07, pan, 1.4, .6));
    },
    pop(t, pan) {
      const g = new GainNode(ac, { gain: 0 });
      env(g.gain, t, .002, .22, .03);
      const o = osc('sine', 380, t, t + .25);
      o.frequency.exponentialRampToValueAtTime(1300, t + .07);
      o.connect(g);
      out(g, pan, .35);
    },
    // The stackhouses wobbling like jelly: a boing that wobbles in pitch, and the clack of wood.
    wobble(t, pan) {
      const g = new GainNode(ac, { gain: 0 });
      env(g.gain, t, .005, .16, .55);
      const o = osc('triangle', 196, t, t + 3), lfo = osc('sine', 6.5, t, t + 3), depth = new GainNode(ac, { gain: 45 });
      depth.gain.setTargetAtTime(0, t + .2, .5);
      lfo.connect(depth).connect(o.frequency);
      o.connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1200 })).connect(g);
      out(g, pan, .35);
      tok(t, 520, .12, pan);
    },
    // The mill's sails spinning up and flying off.
    mill(t, pan) {
      const g = new GainNode(ac, { gain: 0 });
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.22, t + 1.2);
      g.gain.linearRampToValueAtTime(0, t + 3.2);
      const trem = new GainNode(ac, { gain: .5 }), lfo = osc('sine', 5, t, t + 3.3), d = new GainNode(ac, { gain: .5 });
      lfo.frequency.linearRampToValueAtTime(22, t + 1.6);
      lfo.connect(d).connect(trem.gain);
      hiss(t, t + 3.3).connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: 1.5 })).connect(trem).connect(g);
      out(g, pan, .4);
    },
    // The lighthouse whirling round in a fluster.
    spin(t, pan) {
      whoosh(t, 1.4, [500, 2600, 700], .14, pan, .45, 2);
      bell(note(8, 1), t + 1.2, .06, pan, 1.6);
    },
    // The moons racing round the giant.
    race(t, pan) {
      for (let i = 0; i < 3; i++) {
        const s = t + i * .16, g = new GainNode(ac, { gain: 0 });
        env(g.gain, s, .01, .07, .06);
        const o = osc('sine', 700, s, s + .4);
        o.frequency.exponentialRampToValueAtTime(1600, s + .14);
        o.connect(g);
        out(g, pan + (i % 2 ? .2 : -.2), .5);
      }
    },
    // The barbell in the stars doing a rep: up on one note, down on the one below.
    rep(t, pan) {
      bell(note(2, -1), t + .3, .1, pan, 1.6, .6);
      bell(note(0, -1), t + 1.5, .1, pan, 2, .6);
    },
    // A sky whale's spout, and its call.
    spout(t, pan) {
      whoosh(t, 1.3, [700, 3200], .07, pan, .5, .8);
      const g = new GainNode(ac, { gain: 0 });
      g.gain.setValueAtTime(0, t + .2);
      g.gain.linearRampToValueAtTime(.11, t + .9);
      g.gain.setTargetAtTime(0, t + 2.1, .35);
      const o = osc('triangle', 170, t + .2, t + 4), lfo = osc('sine', 5.5, t + .2, t + 4), vib = new GainNode(ac, { gain: 5 });
      o.frequency.linearRampToValueAtTime(240, t + 1.1);
      o.frequency.linearRampToValueAtTime(150, t + 2.6);
      lfo.connect(vib).connect(o.frequency);
      o.connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 700, Q: 5 })).connect(g);
      out(g, pan, .75);
    },
    // A koi jumping out of the clouds.
    splash(t, pan) {
      whoosh(t, .35, [1800, 4200], .1, pan, .3, .7);
      tok(t + .02, 300, .13, pan);
    },
    // Knocking on the arch.
    knock(t, pan) {
      tok(t, 170, .22, pan);
      tok(t + .17, 160, .2, pan);
    },
    // The cloud serpent rising: a low swell, felt more than heard.
    serpent(t, pan) {
      const g = new GainNode(ac, { gain: 0 });
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.06, t + 2.5);
      g.gain.linearRampToValueAtTime(0, t + 7);
      for (const f of [55, 82.4]) osc('sine', f, t, t + 7.2).connect(g);
      hiss(t, t + 7.2).connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 160 })).connect(g);
      out(g, pan, .6);
    },
    // The light from the gate reaching the tree: the bells open in a rising run, over a soft chord.
    call(t, pan) {
      [0, 2, 4, 5, 7].forEach((k, i) => bell(note(k, 1), t + i * .11, .07, pan + (i - 2) * .12, 3.4, .7));
      pad(t, [0, 2, 5], .035, pan, 1.2, 3);
    },
    // The theme turning over, by the door in the sky or the control: a breath of air and a chord in the new key.
    swell(t, pan) {
      const g = new GainNode(ac, { gain: 0 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 180 });
      lp.frequency.exponentialRampToValueAtTime(2600, t + 1.3);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.08, t + 1.1);
      g.gain.linearRampToValueAtTime(0, t + 2.6);
      hiss(t, t + 2.7).connect(lp).connect(g);
      out(g, pan, .6);
      pad(t + .4, [0, 2, 6], .04, pan, 1, 3.5);
    },
  };
  // Sustained sines on the given steps of the scale, rising over `rise` and fading over `fall`.
  function pad(t, steps, vol, pan, rise, fall) {
    const g = new GainNode(ac, { gain: 0 });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + rise);
    g.gain.setTargetAtTime(0, t + rise, fall / 3);
    for (const k of steps) osc('sine', note(k), t, t + rise + fall * 2).connect(g);
    out(g, pan, .7);
  }

  // Underneath: wind in two bands drifting from side to side, each gusting on its own slow cycle. It fades in.
  const wind = [[-.6, .07, 420], [.6, .11, 640]].map(([pan, rate, f]) => {
    const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: f, Q: .8 }), g = new GainNode(ac, { gain: 0 });
    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.linearRampToValueAtTime(.02, ac.currentTime + 3);
    const gust = osc('sine', rate, ac.currentTime), depth = new GainNode(ac, { gain: .016 });
    gust.connect(depth).connect(g.gain);
    const sweep = osc('sine', rate * .6, ac.currentTime), range = new GainNode(ac, { gain: f * .35 });
    sweep.connect(range).connect(bp.frequency);
    hiss(ac.currentTime).connect(bp).connect(g);
    out(g, pan, .3);
    return bp;
  });
  // And now and then, a wind chime somewhere off in the distance.
  function chimes() {
    chimeTimer = setTimeout(chimes, 6000 + Math.random() * 10000);
    if (!on) return;
    const t = ac.currentTime + .05, n = 1 + Math.floor(Math.random() * 3), pan = Math.random() * 1.6 - .8;
    for (let i = 0; i < n; i++) bell(note(Math.floor(Math.random() * 8), 1), t + i * (.18 + Math.random() * .2), .025 + Math.random() * .02, pan, 2.4, .85);
  }
  chimeTimer = setTimeout(chimes, 3000);

  function setNight(n) {
    scale = SCALES[n ? 'night' : 'dusk'];
    // Night wind sits lower and darker.
    wind.forEach((bp, i) => bp.frequency.setTargetAtTime((n ? .7 : 1) * (i ? 640 : 420), ac.currentTime, 1));
  }
  setNight(night);

  return {
    play(name, pan = 0) {
      if (live && on && SOUNDS[name]) SOUNDS[name](ac.currentTime + .01, pan);
    },
    night: setNight,
    // The world out of view, or the tab hidden: fade out and let the audio thread rest until it is back.
    active(yes) {
      if (!live || yes === on) return;
      on = yes;
      if (yes) ac.resume();
      master.gain.setTargetAtTime(yes ? .9 : 0, ac.currentTime, .25);
      if (!yes) setTimeout(() => !on && live && ac.suspend(), 1200);
    },
    stop() {
      if (!live) return;
      live = false;
      clearTimeout(chimeTimer);
      master.gain.setTargetAtTime(0, ac.currentTime, .15);
      setTimeout(() => ac.close(), 800);
    },
  };
}
