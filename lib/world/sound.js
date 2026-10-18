// Sound for the world, made as it plays with Web Audio: no audio files. It is off until the visitor turns it on, and
// stage.js loads this file only then. A soft wind and the odd wind chime play underneath; a click rings a note picked by
// where it lands, low on the left and high on the right; and the things that react to a click make sounds of their own.
// Under it all, a band camped out by the landmarks plays a slow song with a little tune, and grows with the field guide.
// Dusk plays in D major pentatonic, night in A minor pentatonic, and Halloween week in a darker Japanese scale on the
// same roots. The tune and the clicks take their notes from the same scale, so a click anywhere stays in tune, and
// clicking along makes a tune of your own over it.

// The song's tune, eight bars, twice round the chords, as [beat, step of the scale, beats long]: a little phrase that
// comes back three times and climbs once, then comes home. On each chord it lands on the chord's own notes.
const DUSK_TUNE = [
  [[0, 8, 1], [1, 9, .5], [1.5, 8, .5], [2, 7, 1.5], [3.5, 6, .5]],
  [[0, 5, 1.5], [1.5, 6, .5], [2, 7, 2]],
  [[0, 8, 1], [1, 9, .5], [1.5, 8, .5], [2, 6, 1.5], [3.5, 5, .5]],
  [[0, 6, 1.5], [1.5, 5, .5], [2, 6, 1.5], [3.5, 8, .5]],
  [[0, 10, 1], [1, 11, .5], [1.5, 10, .5], [2, 9, 1.5], [3.5, 8, .5]],
  [[0, 7, 1.5], [1.5, 8, .5], [2, 9, 2]],
  [[0, 8, 1], [1, 9, .5], [1.5, 8, .5], [2, 7, 1], [3, 6, 1]],
  [[0, 5, 4]],
];
const NIGHT_TUNE = [
  [[0, 8, 1], [1, 9, .5], [1.5, 8, .5], [2, 6, 1.5], [3.5, 7, .5]],
  [[0, 6, 1.5], [1.5, 7, .5], [2, 8, 2]],
  [[0, 9, 1], [1, 10, .5], [1.5, 9, .5], [2, 7, 1.5], [3.5, 6, .5]],
  [[0, 7, 1.5], [1.5, 6, .5], [2, 7, 1.5], [3.5, 8, .5]],
  [[0, 10, 1], [1, 11, .5], [1.5, 10, .5], [2, 9, 1.5], [3.5, 8, .5]],
  [[0, 6, 1.5], [1.5, 8, .5], [2, 9, 2]],
  [[0, 9, 1], [1, 10, .5], [1.5, 9, .5], [2, 8, 1], [3, 7, .5], [3.5, 6, .5]],
  [[0, 5, 4]],
];
// Each key: its scale, the song's four chords as steps of the scale, root first, and its tune. Halloween week keeps the
// chords and the tune, so it is the same song, only darker.
const DUSK_CHORDS = [[0, 2, 3], [-1, 0, 2], [1, 3, 4], [-2, 0, 1]], NIGHT_CHORDS = [[0, 1, 3], [1, 3, 4], [-1, 1, 2], [2, 4, 5]];
const KEYS = {
  dusk: { scale: [62, 64, 66, 69, 71], chords: DUSK_CHORDS, tune: DUSK_TUNE },
  night: { scale: [57, 60, 62, 64, 67], chords: NIGHT_CHORDS, tune: NIGHT_TUNE },
  duskSpooky: { scale: [62, 63, 67, 69, 72], chords: DUSK_CHORDS, tune: DUSK_TUNE },
  nightSpooky: { scale: [57, 58, 62, 64, 67], chords: NIGHT_CHORDS, tune: NIGHT_TUNE },
};
// The song's bar, in seconds.
const BAR = 4;
const hz = m => 440 * 2 ** ((m - 69) / 12);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// `ac` is created by the caller inside the click that turned sound on, which is what lets the browser play it.
export function makeSound(ac, night, occasion) {
  let key, live = true, on = true, chimeTimer = 0, rainVoice = null, dozing = false;

  // Everything ends in a gentle compressor, so a busy moment cannot clip. On the way there it passes a lowpass that
  // stays wide open until the world falls asleep, and then muffles everything, as if heard from under a blanket.
  const comp = new DynamicsCompressorNode(ac, { threshold: -18, knee: 12, ratio: 3, attack: .01, release: .3 });
  const master = new GainNode(ac, { gain: .9 }), dream = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 20000, Q: 0 });
  master.connect(dream).connect(comp).connect(ac.destination);

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

  // Sends a voice to the speakers at `pan` (-1 to 1), with `space` of it into the hall, by way of a band player's `bus`
  // if it is theirs. Returns the panner, for a voice that moves.
  function out(node, pan = 0, space = .4, bus = null) {
    const p = new StereoPannerNode(ac, { pan: clamp(pan, -1, 1) });
    node.connect(p);
    p.connect(new GainNode(ac, { gain: 1 - space * .5 })).connect(bus ? bus.dry : master);
    p.connect(new GainNode(ac, { gain: space })).connect(bus ? bus.wet : verb);
    return p;
  }
  // A quick rise to `peak`, then an exponential fall with time constant `fall`.
  function env(param, t, rise, peak, fall) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + rise);
    param.setTargetAtTime(0, t + rise, fall);
  }
  // Holds a param where it starts until `t`, so a ramp after it runs from `t`. A ramp with nothing before it runs from
  // whenever it was scheduled instead, which for a sound set to start later is too early.
  function hold(param, t) {
    param.setValueAtTime(param.value, t);
    return param;
  }
  function osc(type, f, t, end) {
    const o = new OscillatorNode(ac, { type, frequency: f });
    hold(o.frequency, t);
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

  // A soft struck chime: a sine with a few quieter overtones that die away faster than it does. It goes to `dest`
  // instead of the speakers, if given, and by way of a band player's `bus` if it is theirs.
  function bell(f, t, vol, pan, len = 1.8, space = .5, dest = null, bus = null) {
    const g = new GainNode(ac);
    if (dest) g.connect(dest);
    else out(g, pan, space, bus);
    for (const [r, a, k] of [[1, 1, 1], [2, .22, .5], [3.01, .08, .3], [4.2, .04, .18]]) {
      const pg = new GainNode(ac, { gain: 0 });
      env(pg.gain, t, .003, vol * a, (len * k) / 4);
      osc('sine', f * r, t, t + len * 1.5).connect(pg).connect(g);
    }
  }
  // Noise through a band that sweeps across `fs`, swelling to `vol` and back out over `dur`.
  function whoosh(t, dur, fs, vol, pan, space = .4, q = 1.2) {
    const bp = new BiquadFilterNode(ac, { type: 'bandpass', Q: q, frequency: fs[0] });
    hold(bp.frequency, t);
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
  const note = (i, oct = 0) => hz(key.scale[((i % 5) + 5) % 5] + 12 * (Math.floor(i / 5) + oct));

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
    // The stackhouses wobbling like jelly: a boing whose pitch sways with the houses, once a swing (whimsy.js sways
    // them at 7.5 radians a second, dying away at 1.2 a second), and the clack of wood.
    wobble(t, pan) {
      const g = new GainNode(ac, { gain: 0 });
      env(g.gain, t, .005, .14, .9);
      const o = osc('triangle', 250, t, t + 4), lfo = osc('sine', 7.5 / (2 * Math.PI), t, t + 4), depth = new GainNode(ac, { gain: 32 });
      o.frequency.exponentialRampToValueAtTime(196, t + .12);
      depth.gain.setTargetAtTime(0, t, 1 / 1.2);
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
      whoosh(t, 1.3, [700, 3200], .05, pan, .5, .8);
      const g = new GainNode(ac, { gain: 0 });
      g.gain.setValueAtTime(0, t + .2);
      g.gain.linearRampToValueAtTime(.08, t + .9);
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
      whoosh(t, .35, [1800, 4200], .035, pan, .3, .7);
      tok(t + .02, 300, .045, pan);
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
    // The light leaving the gate for the tree, from `pan` to `to`. The gate blooms low as it lets the light go, then an
    // airy shimmer and a soft voice follow the light across, rising and falling with its loop-the-loop on the way, a few
    // glints trail behind it, and all of it fades into the bells as the light arrives. The timings follow story.js: the
    // flight takes 3.2 seconds, and the loop runs from .3 to .7 of it.
    stream(t, pan, to = pan) {
      const D = 3.2, loopIn = t + D * .3, top = t + D * .5, loopOut = t + D * .7;
      bell(note(0, -1), t, .07, pan, 2.6, .8);
      const mix = new GainNode(ac, { gain: 0 });
      mix.gain.setValueAtTime(0, t);
      mix.gain.linearRampToValueAtTime(.7, t + .5);
      mix.gain.linearRampToValueAtTime(1, top);
      mix.gain.linearRampToValueAtTime(.6, t + D - .3);
      mix.gain.linearRampToValueAtTime(0, t + D);
      const p = out(mix, pan, .6);
      p.pan.setValueAtTime(clamp(pan, -1, 1), t);
      p.pan.linearRampToValueAtTime(clamp(to, -1, 1), t + D);
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', Q: 3, frequency: 1400 });
      bp.frequency.setValueAtTime(1400, loopIn);
      bp.frequency.exponentialRampToValueAtTime(4200, top);
      bp.frequency.exponentialRampToValueAtTime(1600, loopOut);
      bp.frequency.exponentialRampToValueAtTime(2400, t + D);
      hiss(t, t + D + .1).connect(bp).connect(new GainNode(ac, { gain: .07 })).connect(mix);
      const o = osc('sine', note(0, 1), t, t + D + .1);
      o.frequency.setValueAtTime(note(0, 1), loopIn);
      o.frequency.exponentialRampToValueAtTime(note(5, 1), top);
      o.frequency.exponentialRampToValueAtTime(note(0, 1), loopOut);
      o.connect(new GainNode(ac, { gain: .035 })).connect(mix);
      [7, 9, 6, 8, 5].forEach((k, i) => {
        const f = (i + .5) / 5;
        bell(note(k, 1), t + .3 + f * (D - .6), .018, pan + (to - pan) * f, 1.2, .8);
      });
    },
    // The light from the gate reaching the tree: the tree answers softly with the opening of the song's tune, over a
    // slow swell.
    call(t, pan) {
      key.tune[0].slice(0, 3).forEach(([at, k], i) => bell(note(k), t + .3 + at * .4, .034, pan + (i - 1) * .12, 2.8, .75));
      pad(t, [0, 2, 5], .016, pan, 2, 3);
    },
    // A lantern in the tree, rung: a clear bell on its own note, with a faint glassy shimmer an octave over it.
    lantern(t, pan, step = 0) {
      bell(note(step, 1), t, .085, pan, 2.8, .65);
      bell(note(step + 5, 1) * 1.003, t, .012, pan, 1.2, .7);
    },
    // A click on the far mountains, coming back off them: the click's own note, twice, quieter and duller each time,
    // from the other side first.
    echo(t, pan) {
      const f = note(Math.round((pan + 1) * 4.5));
      for (const [delay, vol, side] of [[.42, .06, -pan * .7], [.86, .025, pan * .4]]) {
        const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1400, Q: .5 });
        out(lp, side, .85);
        bell(f, t + delay, vol, 0, 2.2, 0, lp);
      }
    },
    // A firefly going into the jar: a glassy tink as the lid closes, and a little rising twinkle.
    caught(t, pan) {
      tok(t, 2400, .05, pan);
      [5, 7, 9].forEach((k, i) => bell(note(k, 1), t + .06 + i * .06, .03, pan, 1.2, .6));
    },
    // A leaf pressed in the field guide: a breath of paper as the book closes on it, and the soft pat of it shutting.
    pressed(t, pan) {
      whoosh(t, .16, [2600, 1300], .02, pan, .3, .9);
      tok(t + .1, 240, .05, pan);
    },
    // A maple seed sent spinning back up: a soft airy whirr that climbs with it, fluttering as its wing goes round,
    // slower as it slows.
    whirl(t, pan) {
      const g = new GainNode(ac, { gain: 0 }), bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 600, Q: 3 });
      const fl = new GainNode(ac, { gain: .6 }), wing = osc('sine', 24, t, t + 1.4), depth = new GainNode(ac, { gain: .4 });
      hold(bp.frequency, t).exponentialRampToValueAtTime(1500, t + .9);
      wing.frequency.exponentialRampToValueAtTime(8, t + 1.2);
      wing.connect(depth).connect(fl.gain);
      env(g.gain, t, .06, .1, .35);
      hiss(t, t + 1.4).connect(bp).connect(fl).connect(g);
      out(g, pan, .4);
    },
    // A star joined up: a small, high tink on a note set by how high the star hangs.
    star(t, pan, step = 0) {
      bell(note(step, 1), t, .05, pan, 1.8, .75);
      bell(note(step + 5, 1) * 1.004, t + .02, .01, pan, 1, .8);
    },
    // A constellation finished: a run up through its notes, over a faint chord.
    named(t, pan) {
      [0, 2, 4, 7, 9].forEach((k, i) => bell(note(k, 1), t + i * .09, .04, pan + (i - 2) * .1, 2.4, .75));
      pad(t, [0, 2, 4], .02, pan, .8, 3);
    },
    // A cloud sheep found out: a soft bleat, wavering the way a sheep's does, through two vowel formants, and a breath
    // of air. `voice` is the sheep's own pitch.
    baa(t, pan, voice = 1) {
      const g = new GainNode(ac, { gain: 0 }), f = 300 * voice;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.27, t + .05);
      g.gain.setValueAtTime(.27, t + .38);
      g.gain.linearRampToValueAtTime(0, t + .7);
      const o = osc('sawtooth', f, t, t + .75), lfo = osc('sine', 22, t, t + .75), vib = new GainNode(ac, { gain: f * .03 });
      o.frequency.linearRampToValueAtTime(f * .92, t + .7);
      lfo.connect(vib).connect(o.frequency);
      const trem = new GainNode(ac, { gain: .75 });
      lfo.connect(new GainNode(ac, { gain: .25 })).connect(trem.gain);
      for (const [ff, q, v] of [[750, 6, 1], [1150, 8, .6], [2600, 10, .25]]) {
        o.connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: ff, Q: q })).connect(new GainNode(ac, { gain: v })).connect(trem);
      }
      trem.connect(g);
      out(g, pan, .35);
      whoosh(t + .05, .6, [600, 1800], .03, pan, .3, 1);
    },
    // A cloud coming apart into sheep: a soft whump of cloud, then little hooves pattering off every which way. `n` is
    // how many run, and one on its own makes no whump.
    scurry(t, pan, n = 1) {
      if (n > 1) {
        const g = new GainNode(ac, { gain: 0 });
        env(g.gain, t, .015, .09, .1);
        hiss(t, t + .6).connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 420, Q: .7 })).connect(g);
        out(g, pan, .4);
      }
      for (let i = 0; i < 5 * n; i++) tok(t + .05 + Math.random() * .7, 1500 + Math.random() * 1100, .016, pan + (Math.random() - .5) * .8);
    },
    // Lantern moths scattering: a papery whirr of wings, and a sprinkle of glitter.
    flutter(t, pan) {
      const g = new GainNode(ac, { gain: 0 }), trem = new GainNode(ac, { gain: .5 }), lfo = osc('sine', 26, t, t + 1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.09, t + .03);
      g.gain.setTargetAtTime(0, t + .08, .18);
      lfo.connect(new GainNode(ac, { gain: .5 })).connect(trem.gain);
      hiss(t, t + 1).connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: 1.4 })).connect(trem).connect(g);
      out(g, pan, .35);
      [9, 7, 10, 8, 11].forEach((k, i) => bell(note(k, 1), t + .05 + i * .07 + Math.random() * .04, .012, pan + (Math.random() - .5) * .4, 1, .7));
    },
    // A dandelion going poof: a puff of breath, and its seeds tinkling away on the wind.
    poof(t, pan) {
      const g = new GainNode(ac, { gain: 0 });
      env(g.gain, t, .006, .12, .07);
      hiss(t, t + .5).connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2400, Q: .8 })).connect(g);
      out(g, pan, .4);
      [5, 7, 6, 9].forEach((k, i) => bell(note(k, 1), t + .12 + i * .16, .014, pan + i * .08, 1.2, .8));
    },
    // A new dandelion done growing: a small rising pip.
    sprout(t, pan) {
      const g = new GainNode(ac, { gain: 0 }), o = osc('sine', 520, t, t + .3);
      env(g.gain, t, .005, .035, .05);
      o.frequency.exponentialRampToValueAtTime(1040, t + .09);
      o.connect(g);
      out(g, pan, .5);
    },
    // A glow snail pulling into its shell: a wet little slurp, falling.
    shloop(t, pan) {
      const g = new GainNode(ac, { gain: 0 }), o = osc('sine', 900, t, t + .4);
      env(g.gain, t, .01, .08, .06);
      o.frequency.exponentialRampToValueAtTime(220, t + .2);
      o.connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1400, Q: 4 })).connect(g);
      out(g, pan, .35);
    },
    // And peeking back out: two quick rising blips, one for each feeler.
    peek(t, pan) {
      for (const [d, f] of [[0, 600], [.11, 760]]) {
        const g = new GainNode(ac, { gain: 0 }), o = osc('sine', f, t + d, t + d + .2);
        env(g.gain, t + d, .004, .03, .035);
        o.frequency.exponentialRampToValueAtTime(f * 1.5, t + d + .06);
        o.connect(g);
        out(g, pan, .4);
      }
    },
    // Thunder: a sharp crack overhead, then a low rumble that rolls a few times and dies away.
    thunder(t, pan) {
      const crack = new GainNode(ac, { gain: 0 });
      env(crack.gain, t, .002, .3, .06);
      hiss(t, t + .5).connect(new BiquadFilterNode(ac, { type: 'highpass', frequency: 1200 })).connect(crack);
      out(crack, pan, .6);
      const g = new GainNode(ac, { gain: 0 });
      let at = t + .3;
      g.gain.setValueAtTime(0, t + .05);
      g.gain.linearRampToValueAtTime(.5, at);
      for (let i = 0; i < 5; i++) {
        at += .35 + Math.random() * .4;
        g.gain.linearRampToValueAtTime((.15 + Math.random() * .3) * (1 - i / 6), at);
      }
      g.gain.linearRampToValueAtTime(0, at + 1.2);
      hiss(t, at + 1.3).connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 180, Q: .7 })).connect(g);
      out(g, pan * .5, .7);
    },
    // Rain, for as long as a storm rains, at `level` from 0 to 1. Unlike the others it is one sound that keeps going,
    // following the rain up and down, and stops once the rain does.
    rain(t, pan, level = 0) {
      if (!rainVoice) {
        if (!level) return;
        const g = new GainNode(ac, { gain: 0 }), lo = new GainNode(ac, { gain: .5 }), srcs = [hiss(t), hiss(t)];
        srcs[0].connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2600, Q: .6 })).connect(g);
        srcs[1].connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 700 })).connect(lo).connect(g);
        rainVoice = { g, srcs, p: out(g, pan, .4) };
      }
      rainVoice.g.gain.setTargetAtTime(level * .09, t, .4);
      // It follows the storm while it rains, and fades out wherever it was.
      if (level) rainVoice.p.pan.setTargetAtTime(clamp(pan, -1, 1) * .6, t, .5);
      else {
        for (const src of rainVoice.srcs) src.stop(t + 2.5);
        rainVoice = null;
      }
    },
    // A firework going up: a thin rising whistle over a rush of air.
    launch(t, pan) {
      const g = new GainNode(ac, { gain: 0 });
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.025, t + .15);
      g.gain.linearRampToValueAtTime(.015, t + .8);
      g.gain.linearRampToValueAtTime(0, t + .95);
      const o = osc('sine', 900, t, t + 1);
      o.frequency.exponentialRampToValueAtTime(2200, t + .9);
      o.connect(g);
      out(g, pan, .4);
      whoosh(t, .9, [800, 3000], .04, pan, .3, 1.5);
    },
    // A firework bursting: a soft thump, a bell, then crackle scattered around it.
    firework(t, pan) {
      const boom = new GainNode(ac, { gain: 0 });
      env(boom.gain, t, .005, .3, .2);
      hiss(t, t + 1).connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 300 })).connect(boom);
      out(boom, pan, .7);
      const thump = new GainNode(ac, { gain: 0 }), o = osc('sine', 120, t, t + .7);
      env(thump.gain, t, .004, .12, .12);
      o.frequency.exponentialRampToValueAtTime(48, t + .35);
      o.connect(thump);
      out(thump, pan, .5);
      bell(note(7 + Math.floor(Math.random() * 3), 1), t + .05, .03, pan, 2, .8);
      const crackle = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 4500, Q: 1 });
      out(crackle, pan, .4);
      for (let i = 0; i < 18; i++) {
        const s = t + .35 + Math.random() * 1.1, g = new GainNode(ac, { gain: 0 });
        env(g.gain, s, .001, .05 + Math.random() * .05, .008);
        hiss(s, s + .06).connect(g).connect(crackle);
      }
    },
    // The world waking from a doze: a soft run up the bells as the lanterns light again, left to right.
    wake(t, pan) {
      [0, 2, 4, 5, 7, 9].forEach((k, i) => bell(note(k, 1), t + .1 + i * .19, .02, pan + (i - 2.5) * .15, 2.2, .75));
    },
    // A sheep sneezing off the dandelion tickling it: a little breath in, a pause, then a squeaky choo. `voice` is
    // the sheep's own pitch. The choo comes .55 seconds in, which critters.js times the seeds by.
    sneeze(t, pan, voice = 1) {
      whoosh(t, .45, [500, 1300], .025, pan, .3, 1.2);
      const g = new GainNode(ac, { gain: 0 }), o = osc('triangle', 950 * voice, t + .55, t + .85), s = new GainNode(ac, { gain: 0 });
      env(g.gain, t + .55, .004, .09, .05);
      hiss(t + .55, t + .85).connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2600 * voice, Q: 1.2 })).connect(g);
      out(g, pan, .35);
      env(s.gain, t + .55, .004, .035, .04);
      o.frequency.exponentialRampToValueAtTime(520 * voice, t + .72);
      o.connect(s);
      out(s, pan, .35);
    },
    // A sapling planted in the turf: a soft pat of earth, and a small pip as it comes up.
    plant(t, pan) {
      tok(t, 210, .08, pan);
      SOUNDS.sprout(t + .35, pan);
    },
    // The campfire spitting while a marshmallow toasts: a couple of tiny pops of sap.
    sizzle(t, pan) {
      for (let i = 0, n = 1 + (Math.random() < .5); i < n; i++) {
        const g = new GainNode(ac, { gain: 0 }), at = t + i * (.04 + Math.random() * .08);
        env(g.gain, at, .001, .03 + Math.random() * .02, .008);
        hiss(at, at + .05).connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2400 + Math.random() * 2400, Q: 1.5 })).connect(g);
        out(g, pan, .2);
      }
    },
    // A marshmallow catching fire: a soft whump of flame.
    catch(t, pan) {
      const g = new GainNode(ac, { gain: 0 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 220, Q: .7 });
      hold(lp.frequency, t).exponentialRampToValueAtTime(1600, t + .25);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.1, t + .12);
      g.gain.setTargetAtTime(0, t + .15, .2);
      hiss(t, t + 1).connect(lp).connect(g);
      out(g, pan, .3);
    },
    // A marshmallow eaten: a soft little gulp, and then a happy run up for a golden one, or a sad slide down for a burnt
    // one. `q` is 0 for one barely warm, 1 for golden and 2 for burnt.
    eat(t, pan, q = 0) {
      const g = new GainNode(ac, { gain: 0 }), o = osc('sine', 260, t, t + .3);
      env(g.gain, t, .01, .09, .05);
      o.frequency.exponentialRampToValueAtTime(150, t + .12);
      o.connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 700, Q: 2 })).connect(g);
      out(g, pan, .3);
      if (q === 1) [4, 7, 9].forEach((k, i) => bell(note(k, 1), t + .18 + i * .08, .025, pan, 1.3, .6));
      if (q === 2) {
        const w = new GainNode(ac, { gain: 0 }), v = osc('triangle', note(2), t + .2, t + 1.1);
        v.frequency.setValueAtTime(note(2), t + .2);
        v.frequency.setValueAtTime(note(0), t + .5);
        v.frequency.exponentialRampToValueAtTime(note(0) * .94, t + 1);
        w.gain.setValueAtTime(0, t + .2);
        w.gain.linearRampToValueAtTime(.035, t + .25);
        w.gain.setValueAtTime(.035, t + .45);
        w.gain.linearRampToValueAtTime(.02, t + .52);
        w.gain.linearRampToValueAtTime(.03, t + .6);
        w.gain.linearRampToValueAtTime(0, t + 1.05);
        v.connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1100 })).connect(w);
        out(w, pan, .4);
      }
    },
    // The kite: a papery flutter on the wind as it goes up, or a longer swoop with a high note at the top of a loop.
    kite(t, pan, loop) {
      const d = loop ? 1.2 : .8, g = new GainNode(ac, { gain: 0 }), trem = new GainNode(ac, { gain: .5 }), lfo = osc('sine', loop ? 15 : 11, t, t + d + .1);
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 700, Q: 1.3 });
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.05, t + d * .4);
      g.gain.linearRampToValueAtTime(0, t + d);
      lfo.connect(new GainNode(ac, { gain: .5 })).connect(trem.gain);
      hold(bp.frequency, t).exponentialRampToValueAtTime(loop ? 2000 : 1400, t + d * .5);
      bp.frequency.exponentialRampToValueAtTime(800, t + d);
      hiss(t, t + d + .1).connect(bp).connect(trem).connect(g);
      out(g, pan, .4);
      if (loop) bell(note(7, 1), t + d * .5, .02, pan, 1.4, .7);
    },
    // A rare sighting coming into view: a slow high shimmer, like something glinting a long way off.
    rare(t, pan) {
      [5, 7, 8, 9].forEach((k, i) => bell(note(k, 1), t + i * .24, .018, pan + (i - 1.5) * .1, 2.6, .9));
      whoosh(t, 2.2, [2400, 5200, 3000], .016, pan, .8, 2);
    },
    // A whale calf copying its mother's spout: a tiny puff of air and a squeak.
    pfft(t, pan) {
      whoosh(t, .45, [1200, 3600], .03, pan, .4, .9);
      const g = new GainNode(ac, { gain: 0 }), o = osc('triangle', 420, t + .1, t + .8);
      env(g.gain, t + .1, .04, .035, .12);
      o.frequency.exponentialRampToValueAtTime(620, t + .3);
      o.connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1500, Q: 3 })).connect(g);
      out(g, pan, .6);
    },
    // The drifting village winking back: a far-off clock striking three.
    hamlet(t, pan) {
      [4, 2, 0].forEach((k, i) => bell(note(k), t + i * .5, .035, pan, 2.4, .85));
    },
    // The lantern ship rung from bow to stern: a quick run down the bells.
    lanternship(t, pan) {
      [9, 8, 7, 6, 5, 4, 3, 2].forEach((k, i) => bell(note(k, 1), t + i * .1, .028, pan + (3.5 - i) * .04, 2, .75));
    },
    // A lantern in the tree letting go of its sky lantern at the festival: its own note, softer and longer, carried off.
    lift(t, pan, step = 0) {
      bell(note(step, 1), t, .04, pan, 3.4, .8);
    },
    // The festival beginning: a warm chord swelling under the lanterns' run, and the whole song, melody and all, for
    // as long as the lanterns are in the sky.
    festival(t, pan) {
      pad(t, [0, 2, 4], .03, pan, 3, 9);
      party = t + 30;
      startSong();
    },
    // The sun swelling until it goes: a low chord rising out of nothing, with a rush of air and a high shimmer coming in,
    // over `len` seconds. Then quiet, the song too, until the world has come round again.
    nova(t, pan, len = 14) {
      hush = t + len + 4;
      const g = new GainNode(ac, { gain: 0 });
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.02, t + len * .8);
      g.gain.linearRampToValueAtTime(.03, t + len);
      g.gain.setTargetAtTime(0, t + len, .2);
      for (const [k, oct] of [[0, -2], [0, -1], [2, -1], [4, -1]]) osc('sine', note(k, oct), t, t + len + 1.5).connect(g);
      out(g, pan, .7);
      whoosh(t + len * .5, len * .5 + .3, [300, 2400], .035, pan, .6, .9);
      [5, 7, 9, 10, 12].forEach((k, i) => bell(note(k, 1), t + len * (.4 + i * .1), .012, pan + (i - 2) * .1, 3, .9));
    },
    // The theme turning over, by the door in the sky or the control: a breath of air and a chord in the new key.
    swell(t, pan) {
      const g = new GainNode(ac, { gain: 0 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 180 });
      hold(lp.frequency, t).exponentialRampToValueAtTime(2600, t + 1.3);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.08, t + 1.1);
      g.gain.linearRampToValueAtTime(0, t + 2.6);
      hiss(t, t + 2.7).connect(lp).connect(g);
      out(g, pan, .6);
      pad(t + .4, [0, 2, 6], .04, pan, 1, 3.5);
    },
    // Leaves sent flying from the pile: a papery swish, and the dry crackle of leaves crushing, more of it the more
    // leaves went, from 0 to 1 in `n`. Kept low and soft, so sweeping back and forth through the pile never turns harsh.
    crunch(t, pan, n = .5) {
      const g = new GainNode(ac, { gain: 0 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 3200 });
      env(g.gain, t, .015, .04 + .04 * n, .08);
      hiss(t, t + .5).connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1300, Q: .8 })).connect(g);
      out(g, pan, .3);
      out(lp, pan, .25);
      for (let i = 0; i < 5 + 10 * n; i++) {
        const s = t + Math.random() ** 1.6 * (.12 + .2 * n), c = new GainNode(ac, { gain: 0 });
        env(c.gain, s, .001, (.012 + Math.random() * .02) * (.6 + .4 * n), .004 + Math.random() * .006);
        hiss(s, s + .06).connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900 + Math.random() * 1800, Q: 1.5 })).connect(c).connect(lp);
      }
    },
    // A gust of the world's coming across from the side at `pan`: a rush of air that swells and passes over to the
    // other side, matching what it bends on its way, and rustles the tree as it gets there. `str`, `dur`, `cross` and
    // `tree` say how strong it is, how long it blows at any one place, how long it takes to cross, and how long until
    // it reaches the tree. Its swell is the sum of the gust everywhere across the world, moment by moment.
    gust(t, pan, { str, dur, cross, tree }) {
      const len = dur + cross, curve = new Float32Array(64), f = (dark ? .7 : 1) * 300;
      curve.forEach((_, i) => {
        for (let j = 0; j < 8; j++) curve[i] += Math.sin(Math.PI * clamp(((i / 63) * len - (cross * j) / 7) / dur, 0, 1)) ** 2 / 8;
        curve[i] *= .04 * str;
      });
      const g = new GainNode(ac, { gain: 0 }), bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: f, Q: .7 });
      g.gain.setValueCurveAtTime(curve, t, len);
      bp.frequency.setValueAtTime(f, t);
      bp.frequency.exponentialRampToValueAtTime(f * (1.3 + 1.3 * str), t + len / 2);
      bp.frequency.exponentialRampToValueAtTime(f, t + len);
      hiss(t, t + len + .1).connect(bp).connect(g);
      hold(out(g, pan * .8, .3).pan, t).linearRampToValueAtTime(clamp(-pan * .8, -1, 1), t + len);
      rustle(t + tree, dur * .8, .5 + str * .8);
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

  // Underneath: wind in two bands, one off to each side, each breathing and wandering in pitch on its own slow cycle,
  // with the world's gusts coming on top. It fades in.
  const wind = [[-.6, .07, 420], [.6, .11, 640]].map(([pan, rate, f]) => {
    const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: f, Q: .8 }), g = new GainNode(ac, { gain: 0 });
    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.linearRampToValueAtTime(.02, ac.currentTime + 3);
    const breath = osc('sine', rate, ac.currentTime), depth = new GainNode(ac, { gain: .006 });
    breath.connect(depth).connect(g.gain);
    const sweep = osc('sine', rate * .6, ac.currentTime), range = new GainNode(ac, { gain: f * .35 });
    sweep.connect(range).connect(bp.frequency);
    hiss(ac.currentTime).connect(bp).connect(g);
    out(g, pan, .3);
    return bp;
  });
  // And now and then, a wind chime somewhere off in the distance.
  function chimes() {
    chimeTimer = setTimeout(chimes, 6000 + Math.random() * 10000);
    if (!on || dozing) return;
    const t = ac.currentTime + .05, n = 1 + Math.floor(Math.random() * 3), pan = Math.random() * 1.6 - .8;
    for (let i = 0; i < n; i++) bell(note(Math.floor(Math.random() * 8), 1), t + i * (.18 + Math.random() * .2), .025 + Math.random() * .02, pan, 2.4, .85);
  }
  chimeTimer = setTimeout(chimes, 3000);

  // The world's own small sounds, each from where its thing is, and each kept out of the wind's way: the wind is a
  // low rush that comes and goes, so these are higher, steadier or shorter. The two waterfalls off the island hiss
  // softly, high above the wind, with drops plinking in them; the upfall at the far mill is fainter, and its drops
  // plink the wrong way round. The campfire ticks and pops, the tree's leaves stir as each gust gets there, and far
  // off, birds call to each other at dusk while crickets take over at night.
  let dark = night, ambTimer = 0;
  // Each place is a way to the speakers, panned to where its thing is once the layout says where that is.
  const source = (pan, space) => {
    const g = new GainNode(ac, { gain: 0 });
    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.linearRampToValueAtTime(1, ac.currentTime + 4);
    return { g, p: out(g, pan, space) };
  };
  // [hiss level, drops a second, drops upside down]
  const water = [[.0018, 4, false], [.0023, 6, false], [.0008, 1.5, true]].map(([vol, rate, up], i) => {
    const w = { ...source([-.3, .5, .7][i], .2), rate, up };
    hiss(ac.currentTime)
      .connect(new BiquadFilterNode(ac, { type: 'highpass', frequency: 2200, Q: .5 }))
      .connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 6500, Q: .5 }))
      .connect(new GainNode(ac, { gain: vol }))
      .connect(w.g);
    return w;
  });
  const fire = source(.2, .15), leaves = source(.3, .3);
  const crickets = [[4450, -.55, 1.05], [4900, .45, .8]].map(([f, pan, every]) => ({ ...source(pan, .5), f, every, next: 0 }));
  // A drop falling into water: a short sine sliding up as its bubble rises. Upside down, it slides down. They are kept
  // low and round, more bloop than plink, so a stream of them never turns shrill.
  function drop(t, dest, up) {
    const f = 550 + Math.random() * 550, g = new GainNode(ac, { gain: 0 }), o = osc('sine', f, t, t + .14);
    o.frequency.exponentialRampToValueAtTime(f * (up ? .55 : 1.9), t + .035 + Math.random() * .03);
    env(g.gain, t, .004, .003 + Math.random() * .005, .03);
    o.connect(g).connect(dest);
  }
  // A crackle in the fire: mostly tiny bright ticks, sometimes a fuller pop.
  function spark(t, big) {
    const g = new GainNode(ac, { gain: 0 }), f = big ? 700 + Math.random() * 900 : 2600 + Math.random() * 2600;
    env(g.gain, t, .001, big ? .028 + Math.random() * .02 : .011 + Math.random() * .017, big ? .012 : .004);
    hiss(t, t + .08).connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: f, Q: big ? 1.2 : 2 })).connect(g).connect(fire.g);
  }
  // The leaves stirring: high noise that flutters as it swells and fades.
  function rustle(t, dur, vol) {
    const curve = new Float32Array(48), g = new GainNode(ac, { gain: 0 });
    let y = .5;
    curve.forEach((_, i) => {
      y += (Math.random() - y) * .5;
      curve[i] = Math.max(0, Math.sin((Math.PI * i) / 47)) ** 1.5 * (.3 + y) * .011 * vol;
    });
    g.gain.setValueCurveAtTime(curve, t, dur);
    hiss(t, t + dur + .1).connect(new BiquadFilterNode(ac, { type: 'bandpass', frequency: 3800, Q: .7 })).connect(g).connect(leaves.g);
  }
  // A far-off bird: two or three quick whistled notes, each sliding up or down. Another sometimes answers.
  function bird(t, pan) {
    const base = 2600 + Math.random() * 900, n = 2 + Math.floor(Math.random() * 2), g = new GainNode(ac);
    for (let i = 0; i < n; i++) {
      const s = t + i * (.13 + Math.random() * .06), len = .05 + Math.random() * .06, f = base * (1 + (Math.random() - .5) * .3);
      const v = new GainNode(ac, { gain: 0 }), o = osc('sine', f, s, s + len + .05);
      o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), s + len);
      v.gain.setValueAtTime(0, s);
      v.gain.linearRampToValueAtTime(.0075 + Math.random() * .005, s + .012);
      v.gain.linearRampToValueAtTime(0, s + len);
      o.connect(v).connect(g);
    }
    out(g, pan, .6);
  }
  // A cricket's chirp: three quick pulses of one high note.
  function chirp(t, c) {
    const g = new GainNode(ac, { gain: 0 });
    for (let i = 0; i < 3; i++) env(g.gain, t + i * .034, .004, .007, .006);
    osc('sine', c.f, t, t + .15).connect(g).connect(c.g);
  }
  let birdAt = 0;
  // Every quarter of a second, everything due in the next quarter. Drops and crackles come at random moments, so they
  // never fall into a beat.
  function ambience() {
    if (!on) return;
    const now = ac.currentTime + .05, many = rate => Math.floor(rate * .25 + Math.random());
    for (const w of water) for (let n = many(w.rate); n > 0; n--) drop(now + Math.random() * .25, w.g, w.up);
    for (let n = many(3.5); n > 0; n--) spark(now + Math.random() * .25, Math.random() < .15);
    if (!dark && !dozing && !rainVoice && now > birdAt) {
      if (birdAt) {
        const pan = Math.random() * 1.4 - .7;
        bird(now, pan);
        if (Math.random() < .5) bird(now + 1 + Math.random(), -pan * .8);
      }
      birdAt = now + 7 + Math.random() * 9;
    }
    for (const c of crickets) {
      if (!dark) c.next = 0;
      else {
        if (c.next < now) c.next = now + Math.random() * c.every;
        while (c.next < now + .25) {
          chirp(c.next, c);
          // Now and then a cricket rests a moment.
          c.next += Math.random() < .06 ? 3 + Math.random() * 5 : c.every * (.94 + Math.random() * .12);
        }
      }
    }
  }
  ambTimer = setInterval(ambience, 250);

  // The song, played by a band of four camped out by the landmarks, never seen, over a low drone and a slow loop of four
  // chords. The first entry in the field guide brings in the tune, on bells, so anyone who finds anything hears it. A
  // quarter of the guide adds a soft chord, half adds plucked notes, three quarters the whales calling to each other,
  // and the whole guide the far mountains echoing the tune back. While the world sleeps it plays a lullaby instead,
  // however much of the guide is found. Each bar is scheduled a moment ahead, so it keeps time even when the page is
  // busy, and anything new comes in at the start of the next bar.
  let level = 0, bar = 0, nextBar = 0, songTimer = 0, party = 0, hush = 0;
  function song(l) {
    level = l;
    if (l > 0) startSong();
  }
  function startSong() {
    if (songTimer) return;
    nextBar = ac.currentTime + .5;
    songTimer = setInterval(schedule, 250);
    schedule();
  }
  function schedule() {
    if (nextBar < ac.currentTime) nextBar = ac.currentTime + .1;
    while (nextBar < ac.currentTime + 1) {
      playBar(nextBar, bar++);
      nextBar += BAR;
    }
  }
  // A held voice that swells in over a bar and fades out into the next, so bars overlap into one sound.
  function held(t, freqs, type, vol, cutoff, pan, space, bus) {
    const g = new GainNode(ac, { gain: 0 });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 1.5);
    g.gain.setValueAtTime(vol, t + BAR);
    g.gain.linearRampToValueAtTime(0, t + BAR + 1.6);
    const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: cutoff });
    for (const f of freqs) osc(type, f, t, t + BAR + 1.7).connect(lp);
    lp.connect(g);
    out(g, pan, space, bus);
  }
  // Two whales calling, one answering the other a little higher, each gliding up from one note of the chord to another.
  function whale(t, from, to, vol, pan) {
    const g = new GainNode(ac, { gain: 0 });
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 1);
    g.gain.setTargetAtTime(0, t + 2.4, .5);
    const o = osc('triangle', from, t, t + 5), lfo = osc('sine', 4.8, t, t + 5), vib = new GainNode(ac, { gain: from * .012 });
    o.frequency.setValueAtTime(from, t + .3);
    o.frequency.exponentialRampToValueAtTime(to, t + 1.8);
    o.frequency.exponentialRampToValueAtTime(from, t + 3.4);
    lfo.connect(vib).connect(o.frequency);
    o.connect(new BiquadFilterNode(ac, { type: 'lowpass', frequency: 800, Q: 4 })).connect(g);
    out(g, pan, .8);
  }

  // Each player, one to a voice of the song, has a way to the speakers of their own. Hovering a fire brings its players
  // up close, louder and drier, with the fire crackling, and hushes the rest. `seats` are where their fires are.
  const players = [0, 1, 2, 3].map(() => {
    const dry = new GainNode(ac), wet = new GainNode(ac);
    dry.connect(master);
    wet.connect(verb);
    return { dry, wet };
  });
  let close = null, seats = [-.5, -.15, .2, .5];
  function listen(list) {
    close = list;
    const t = ac.currentTime;
    players.forEach((pl, i) => {
      const on = !!list?.includes(i);
      pl.dry.gain.setTargetAtTime(!list ? 1 : on ? 1.4 : .4, t, .25);
      pl.wet.gain.setTargetAtTime(!list ? 1 : on ? .5 : .4, t, .25);
    });
  }
  // The fire up close: a pop of wood here and there.
  function crackle(t, i) {
    const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 1800 });
    out(hp, seats[i], .2, players[i]);
    for (let j = 0; j < 9; j++) {
      const s = t + Math.random() * BAR, g = new GainNode(ac, { gain: 0 });
      env(g.gain, s, .001, .02 + Math.random() * .04, .006);
      hiss(s, s + .05).connect(g).connect(hp);
    }
  }

  // The plucked notes' rhythm, in eighths of a bar.
  const PLUCKS = [0, 1.5, 2, 3, 4.5, 5, 6, 7];
  function playBar(t, i) {
    const lv = t < party ? 1 : level;
    if (!live || t < hush || (lv <= 0 && !dozing)) return;
    const ch = key.chords[i % 4];
    // The lullaby: the drone and the chord, low and soft, and three slow notes rocking down the chord over them.
    if (dozing) {
      held(t, [note(ch[0], -2), note(ch[0], -1)], 'sine', .016, 400, 0, .5);
      held(t, ch.map(k => note(k)), 'triangle', .007, 700, 0, .7);
      [2, 1, 0].forEach((j, n) => bell(note(ch[j], 1), t + n * 1.33, .014, n % 2 ? .25 : -.25, 2.6, .8));
      return;
    }
    const [tune, chord, plucks, echo] = players, v = lv >= 1 ? 1.15 : 1;
    held(t, [note(ch[0], -2), note(ch[0], -1)], 'sine', .024 * v, 500, 0, .5);
    if (lv >= .25) held(t, ch.map(k => note(k)), 'triangle', .011 * v, 900, 0, .7, chord);
    if (lv >= .5) {
      PLUCKS.forEach((at, j) => {
        const k = ch[(j + i) % 3] + 5 * (j % 4 > 1 ? 1 : 0);
        bell(note(k), t + at * BAR / 8, .017 * v, j % 2 ? .3 : -.3, 1.6, .6, null, plucks);
      });
    }
    if (lv >= .75 && i % 2 === 0) {
      whale(t + .2, note(ch[0], -1), note(ch[2], -1), .028, -.4);
      whale(t + 1, note(ch[1], -1), note(ch[2] + 1, -1), .022, .4);
    }
    // The tune, a little to either side, and with the whole guide found, the far mountains sending it back a dotted beat
    // later, softer and duller, from one side and then the other.
    const far = lv >= 1 && new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1800, Q: .5 });
    if (far) out(far, i % 2 ? .5 : -.5, .9, echo);
    key.tune[i % 8].forEach(([at, k], n) => {
      bell(note(k), t + at, .025 * v, n % 2 ? .12 : -.12, 2.4, .6, null, tune);
      if (far) bell(note(k), t + at + .75, .012, 0, 2.4, 0, far);
    });
    if (close) for (const p of close) crackle(t, p);
  }

  function setNight(n) {
    dark = n;
    key = KEYS[(n ? 'night' : 'dusk') + (occasion === 'halloween' ? 'Spooky' : '')];
    // Night wind sits lower and darker.
    wind.forEach((bp, i) => bp.frequency.setTargetAtTime((n ? .7 : 1) * (i ? 640 : 420), ac.currentTime, 1));
  }
  setNight(night);

  return {
    // `arg` is anything more a sound needs: where a sound that travels ends up, or which note to ring.
    play(name, pan = 0, arg) {
      if (live && on && SOUNDS[name]) SOUNDS[name](ac.currentTime + .01, pan, arg);
    },
    night: setNight,
    // How much of the field guide is found, from 0 to 1.
    song,
    // Where each player's fire is, from -1 at the left to 1 at the right.
    seat(pans) {
      seats = pans;
    },
    // Where the waterfalls, the upfall, the campfire and the tree are, the same way.
    place(spots) {
      const at = (p, pan) => p.pan.setValueAtTime(clamp(pan, -1, 1), ac.currentTime);
      [...spots.falls, spots.up].forEach((pan, i) => at(water[i].p, pan));
      at(fire.p, spots.fire);
      at(leaves.p, spots.tree);
    },
    // The players at the fire under the pointer, or null.
    near(list) {
      if (live && String(list) !== String(close)) listen(list);
    },
    // The world dozing off, or waking.
    sleep(yes) {
      if (!live || yes === dozing) return;
      dozing = yes;
      dream.frequency.setTargetAtTime(yes ? 900 : 20000, ac.currentTime, yes ? 2 : .4);
      if (yes) startSong();
    },
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
      clearInterval(ambTimer);
      clearInterval(songTimer);
      master.gain.setTargetAtTime(0, ac.currentTime, .15);
      setTimeout(() => ac.close(), 800);
    },
  };
}
