"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";

type GameMode = "ready" | "running" | "paused" | "ended";

type Vector = {
  x: number;
  y: number;
};

type Signal = Vector & {
  kind: "gain" | "repair" | "focus" | "bonus" | "clear";
  radius: number;
  pulse: number;
};

type Incident = Vector & {
  kind: "drift" | "tracker" | "heavy" | "waver" | "splitter" | "sentinel";
  radius: number;
  velocity: Vector;
  spin: number;
  age: number;
};

type NovaWave = Vector & {
  age: number;
  duration: number;
  radius: number;
  maxRadius: number;
};

type FloatingText = Vector & {
  text: string;
  color: string;
  surge: boolean;
  age: number;
  duration: number;
};

type GameState = {
  player: Vector;
  target: Vector;
  pointerActive: boolean;
  playerAngle: number;
  signals: Signal[];
  incidents: Incident[];
  novaWave: NovaWave | null;
  floatingTexts: FloatingText[];
  score: number;
  combo: number;
  comboTimer: number;
  lives: number;
  phaseTimer: number;
  focusTimer: number;
  purgeSlowTimer: number;
  multiplierTimer: number;
  dashCooldown: number;
  dashTimer: number;
  invulnerableTimer: number;
  dashVector: Vector;
  shakeTimer: number;
  elapsed: number;
  spawnTimer: number;
  signalTimer: number;
  width: number;
  height: number;
};

const PLAYER_RADIUS = 14;
const KEYBOARD_SPEED = 260;
const POINTER_SPEED = 220;
const POINTER_DRAG_THRESHOLD = 8;
const DASH_SPEED = 780;
const DASH_DURATION = 0.16;
const DASH_COOLDOWN = 1.35;
const DASH_INVULNERABLE_DURATION = 0.22;
const HIT_INVULNERABLE_DURATION = 1.8;
const INITIAL_LIVES = 3;
const MAX_INCIDENTS = 14;
const SENTINEL_PULL_RADIUS_PADDING = 150;
const SENTINEL_PULL_SPEED = 230;
const SURGE_CYCLE_DURATION = 34;
const SURGE_PHASE_START = 18;
const RECOVERY_PHASE_START = 26;
const PHASE_DURATION = 6;
const FREEZE_DURATION = 7.5;
const NOVA_SLOW_DURATION = 3.5;
const NOVA_WAVE_DURATION = 1.1;
const FLOATING_TEXT_DURATION = 0.9;
const OVERDRIVE_DURATION = 10.5;
const OVERDRIVE_SPEED_MULTIPLIER = 1.25;
const COMBO_DURATION = 4.2;
const BASE_COMBO_MULTIPLIER = 1;
const COMBO_DECAY_STEP = 0.2;
const MAX_COMBO_MULTIPLIER = 3;
const COMBO_COLORS = ["#67e8f9", "#38bdf8", "#a78bfa", "#f97316", "#f8fafc"] as const;
const NOVA_CLEAR_SCORE: Record<Incident["kind"], number> = {
  drift: 30,
  tracker: 40,
  heavy: 55,
  waver: 65,
  splitter: 75,
  sentinel: 90,
};
const TIMER_UI_STEP = 0.1;
const DASH_COLOR = "#22d3ee";
const PLAYER_BASE_COLOR = "#2f7f8e";
const PLAYER_READY_COLOR = "#67e8f9";
const SHIP_POINTS = [
  { x: PLAYER_RADIUS * 1.05, y: 0 },
  { x: -PLAYER_RADIUS * 0.72, y: PLAYER_RADIUS * 0.72 },
  { x: -PLAYER_RADIUS * 0.72, y: -PLAYER_RADIUS * 0.72 },
  { x: PLAYER_RADIUS * 1.05, y: 0 },
] as const;
const DASH_SHIP_SCALE = 1.08;
const DASH_SHIP_POINTS = SHIP_POINTS.map((point) => ({
  x: point.x * DASH_SHIP_SCALE,
  y: point.y * DASH_SHIP_SCALE,
}));
const DASH_EDGE_LENGTHS = DASH_SHIP_POINTS.slice(0, -1).map((point, index) => {
  const next = DASH_SHIP_POINTS[index + 1];
  return Math.hypot(point.x - next.x, point.y - next.y);
});
const DASH_PERIMETER = DASH_EDGE_LENGTHS.reduce((total, length) => total + length, 0);
const LIFE_INDICES = Array.from({ length: INITIAL_LIVES }, (_, index) => index);

const signalStyles = {
  gain: {
    label: "Star",
    description: "combo score",
    color: "#f8fafc",
  },
  repair: {
    label: "Shield",
    description: "blocks hits",
    color: "#2dd4bf",
  },
  focus: {
    label: "Freeze",
    description: "slows hazards",
    color: "#60a5fa",
  },
  bonus: {
    label: "Overdrive",
    description: "2x score, faster",
    color: "#a3e635",
  },
  clear: {
    label: "Nova",
    description: "clears hazards",
    color: "#c084fc",
  },
} satisfies Record<Signal["kind"], { label: string; description: string; color: string }>;
const POWERUP_ENTRIES = Object.entries(signalStyles) as Array<[Signal["kind"], (typeof signalStyles)[Signal["kind"]]]>;

const incidentStyles = {
  drift: {
    label: "Laser",
    description: "straight",
    color: "#fb7185",
  },
  tracker: {
    label: "Orb",
    description: "tracks",
    color: "#f43f5e",
  },
  heavy: {
    label: "Crusher",
    description: "lane slam",
    color: "#ef4444",
  },
  waver: {
    label: "Waver",
    description: "wide sweep",
    color: "#f97316",
  },
  splitter: {
    label: "Splitter",
    description: "splits wide",
    color: "#fb923c",
  },
  sentinel: {
    label: "Sentinel",
    description: "pulse zone",
    color: "#e11d48",
  },
} satisfies Record<Incident["kind"], { label: string; description: string; color: string }>;
const HAZARD_ENTRIES = Object.entries(incidentStyles) as Array<[Incident["kind"], (typeof incidentStyles)[Incident["kind"]]]>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distanceSquared(a: Vector, b: Vector) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function isWithinDistance(a: Vector, b: Vector, radius: number) {
  return distanceSquared(a, b) < radius * radius;
}

function lerpAngle(from: number, to: number, amount: number) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * amount;
}

function quantizeTimer(value: number) {
  return value <= 0 ? 0 : Math.ceil(value / TIMER_UI_STEP) / (1 / TIMER_UI_STEP);
}

function getComboGain(multiplier: number) {
  const heat = clamp((multiplier - BASE_COMBO_MULTIPLIER) / (MAX_COMBO_MULTIPLIER - BASE_COMBO_MULTIPLIER), 0, 1);
  return clamp(0.24 * (1 - heat) ** 1.55 + 0.04, 0.05, 0.24);
}

function getComboColor(heat: number) {
  const index = Math.min(COMBO_COLORS.length - 1, Math.floor(heat * COMBO_COLORS.length));
  return COMBO_COLORS[index];
}

function getSurgePhase(elapsed: number) {
  const cycle = Math.floor(elapsed / SURGE_CYCLE_DURATION);
  const phaseTime = elapsed % SURGE_CYCLE_DURATION;
  const phase = phaseTime >= RECOVERY_PHASE_START ? "recovery" : phaseTime >= SURGE_PHASE_START ? "surge" : "build";
  return {
    cycle,
    phase,
    speedMultiplier: phase === "surge" ? 1.16 : phase === "recovery" ? 0.86 : 1,
    spawnOffset: phase === "surge" ? -0.13 : phase === "recovery" ? 0.22 : 0,
  };
}

function getIncidentCap(elapsed: number) {
  return Math.min(MAX_INCIDENTS, 6 + Math.floor(elapsed / 22));
}

function getIncidentSpawnDelay(elapsed: number) {
  const surge = getSurgePhase(elapsed);
  const cyclePressure = Math.min(0.18, surge.cycle * 0.03);
  return clamp(0.86 - cyclePressure + surge.spawnOffset, 0.46, 1.05);
}

function getIncidentCollisionRadius(incident: Incident) {
  if (incident.kind === "sentinel") {
    const pulseTime = incident.age % 2.15;
    if (pulseTime > 0.95) return incident.radius;
    return incident.radius + (1 - (1 - pulseTime / 0.95) ** 2) * 54;
  }
  return incident.radius;
}

function createFloatingText(x: number, y: number, text: string, color: string, surge = false): FloatingText {
  return {
    x,
    y,
    text,
    color,
    surge,
    age: 0,
    duration: FLOATING_TEXT_DURATION,
  };
}

function createNovaWave(origin: Vector, width: number, height: number): NovaWave {
  const maxRadius = Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(width - origin.x, origin.y),
    Math.hypot(width - origin.x, height - origin.y),
    Math.hypot(origin.x, height - origin.y),
  ) + 32;

  return {
    x: origin.x,
    y: origin.y,
    age: 0,
    duration: NOVA_WAVE_DURATION,
    radius: PLAYER_RADIUS + 10,
    maxRadius,
  };
}

function createSignal(width: number, height: number, kind: Signal["kind"]): Signal {
  return {
    kind,
    x: 48 + Math.random() * Math.max(1, width - 96),
    y: 48 + Math.random() * Math.max(1, height - 96),
    radius: kind === "gain" ? 12 + Math.random() * 3 : 14 + Math.random() * 4,
    pulse: Math.random() * Math.PI * 2,
  };
}

function createPowerupSignal(width: number, height: number): Signal {
  const roll = Math.random();
  const kind: Signal["kind"] = roll < 0.42 ? "repair" : roll < 0.67 ? "focus" : roll < 0.88 ? "clear" : "bonus";

  return createSignal(width, height, kind);
}

function getIncidentWeights(elapsed: number): Array<[Incident["kind"], number]> {
  if (elapsed < 20) {
    return [["drift", 1]];
  }

  if (elapsed < 45) {
    return [
      ["drift", 0.76],
      ["tracker", 0.24],
    ];
  }

  if (elapsed < 75) {
    return [
      ["drift", 0.48],
      ["tracker", 0.18],
      ["heavy", 0.34],
    ];
  }

  if (elapsed < 110) {
    return [
      ["drift", 0.28],
      ["tracker", 0.12],
      ["heavy", 0.28],
      ["waver", 0.32],
    ];
  }

  if (elapsed < 155) {
    return [
      ["drift", 0.14],
      ["tracker", 0.1],
      ["heavy", 0.28],
      ["waver", 0.27],
      ["splitter", 0.21],
    ];
  }

  return [
    ["drift", 0.07],
    ["tracker", 0.07],
    ["heavy", 0.29],
    ["waver", 0.27],
    ["splitter", 0.22],
    ["sentinel", 0.08],
  ];
}

function getIncidentKindLimit(kind: Incident["kind"], elapsed: number) {
  if (kind === "sentinel") return elapsed > 130 ? 2 : 1;
  if (kind === "tracker") return 2;
  if (kind === "drift") return elapsed > 155 ? 2 : 5;
  return MAX_INCIDENTS;
}

function chooseIncidentKind(elapsed: number, activeIncidents: Incident[]): Incident["kind"] {
  const counts = activeIncidents.reduce(
    (accumulator, incident) => {
      accumulator[incident.kind] += 1;
      return accumulator;
    },
    {
      drift: 0,
      tracker: 0,
      heavy: 0,
      waver: 0,
      splitter: 0,
      sentinel: 0,
    } satisfies Record<Incident["kind"], number>,
  );
  const weights = getIncidentWeights(elapsed).filter(([kind]) => counts[kind] < getIncidentKindLimit(kind, elapsed));
  const availableWeights = weights.length > 0 ? weights : getIncidentWeights(elapsed);
  const totalWeight = availableWeights.reduce((total, [, weight]) => total + weight, 0);
  let roll = Math.random() * totalWeight;

  for (const [kind, weight] of availableWeights) {
    roll -= weight;
    if (roll <= 0) return kind;
  }

  return availableWeights[availableWeights.length - 1][0];
}

function createIncident(width: number, height: number, elapsed: number, activeIncidents: Incident[]): Incident {
  const side = Math.floor(Math.random() * 4);
  const kind = chooseIncidentKind(elapsed, activeIncidents);
  const surge = getSurgePhase(elapsed);
  const baseSpeed = kind === "heavy" ? 86 : kind === "sentinel" ? 56 : kind === "splitter" ? 94 : kind === "tracker" ? 68 : kind === "waver" ? 112 : 128;
  const speed = (baseSpeed + Math.min(72, elapsed * 1.55) + Math.random() * 24) * surge.speedMultiplier;
  const angle = Math.random() * Math.PI * 2;
  const start = [
    { x: -28, y: Math.random() * height },
    { x: width + 28, y: Math.random() * height },
    { x: Math.random() * width, y: -28 },
    { x: Math.random() * width, y: height + 28 },
  ][side];

  const centerAngle = Math.atan2(height / 2 - start.y, width / 2 - start.x);
  const direction = centerAngle + (Math.random() - 0.5) * 0.85 + angle * 0.08;

  const velocity =
    kind === "heavy"
      ? side < 2
        ? { x: side === 0 ? speed : -speed, y: 0 }
        : { x: 0, y: side === 2 ? speed : -speed }
      : {
          x: Math.cos(direction) * speed,
          y: Math.sin(direction) * speed,
        };

  return {
    ...start,
    kind,
    radius:
      kind === "heavy"
        ? 34 + Math.random() * 10
        : kind === "sentinel"
          ? 34 + Math.random() * 7
          : kind === "splitter"
            ? 23 + Math.random() * 5
          : kind === "tracker"
            ? 15 + Math.random() * 4
            : kind === "waver"
              ? 20 + Math.random() * 5
              : 10 + Math.random() * 5,
    velocity,
    spin: Math.random() * Math.PI * 2,
    age: 0,
  };
}

function createGameState(width: number, height: number): GameState {
  const player = { x: width * 0.5, y: height * 0.62 };

  return {
    player,
    target: player,
    pointerActive: false,
    playerAngle: -Math.PI / 2,
    signals: [],
    incidents: [],
    novaWave: null,
    floatingTexts: [],
    score: 0,
    combo: BASE_COMBO_MULTIPLIER,
    comboTimer: 0,
    lives: INITIAL_LIVES,
    phaseTimer: 0,
    focusTimer: 0,
    purgeSlowTimer: 0,
    multiplierTimer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    invulnerableTimer: 0,
    dashVector: { x: Math.cos(-Math.PI / 2), y: Math.sin(-Math.PI / 2) },
    shakeTimer: 0,
    elapsed: 0,
    spawnTimer: 0.38,
    signalTimer: 3.2,
    width,
    height,
  };
}

function drawSignalIcon(ctx: CanvasRenderingContext2D, kind: Signal["kind"], radius: number) {
  if (kind === "gain") {
    ctx.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const angle = -Math.PI / 2 + point * (Math.PI / 5);
      const pointRadius = point % 2 === 0 ? radius : radius * 0.42;
      const x = Math.cos(angle) * pointRadius;
      const y = Math.sin(angle) * pointRadius;
      if (point === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    return;
  }

  if (kind === "repair") {
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.quadraticCurveTo(radius * 0.78, -radius * 0.78, radius * 0.72, -radius * 0.04);
    ctx.quadraticCurveTo(radius * 0.62, radius * 0.58, 0, radius);
    ctx.quadraticCurveTo(-radius * 0.62, radius * 0.58, -radius * 0.72, -radius * 0.04);
    ctx.quadraticCurveTo(-radius * 0.78, -radius * 0.78, 0, -radius);
    ctx.stroke();
    return;
  }

  if (kind === "focus") {
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let spoke = 0; spoke < 3; spoke += 1) {
      const angle = spoke * (Math.PI / 3);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      ctx.moveTo(-x, -y);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    return;
  }

  if (kind === "bonus") {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-radius * 0.65, -radius * 0.72);
    ctx.lineTo(0, 0);
    ctx.lineTo(-radius * 0.65, radius * 0.72);
    ctx.moveTo(radius * 0.06, -radius * 0.72);
    ctx.lineTo(radius * 0.72, 0);
    ctx.lineTo(radius * 0.06, radius * 0.72);
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  for (let ray = 0; ray < 4; ray += 1) {
    const angle = ray * (Math.PI / 2) + Math.PI / 4;
    ctx.moveTo(Math.cos(angle) * radius * 0.92, Math.sin(angle) * radius * 0.92);
    ctx.lineTo(Math.cos(angle) * radius * 1.18, Math.sin(angle) * radius * 1.18);
  }
  ctx.stroke();
}

function drawGame(ctx: CanvasRenderingContext2D, game: GameState, mode: GameMode) {
  const { width, height } = game;
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  if (game.shakeTimer > 0) {
    const strength = game.shakeTimer / 0.22;
    ctx.translate((Math.random() - 0.5) * 12 * strength, (Math.random() - 0.5) * 12 * strength);
  }

  const arcadeBack = ctx.createLinearGradient(0, 0, width, height);
  arcadeBack.addColorStop(0, "#02040b");
  arcadeBack.addColorStop(0.52, "#080a16");
  arcadeBack.addColorStop(1, "#020611");
  ctx.fillStyle = arcadeBack;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.fillStyle = "#f8fafc";
  for (let i = 0; i < 30; i += 1) {
    const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * width;
    const y = ((Math.cos(i * 57.3 + game.elapsed * 0.16) * 0.5 + 0.5) * height + game.elapsed * (4 + (i % 5))) % height;
    ctx.globalAlpha = 0.16 + (i % 4) * 0.035;
    ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.11;
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 1;
  const grid = 32;
  ctx.beginPath();
  for (let x = (game.elapsed * 12) % grid; x < width; x += grid) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = (game.elapsed * 8) % grid; y < height; y += grid) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.fillStyle = "#67e8f9";
  for (let y = 0; y < height; y += 6) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();

  ctx.save();
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.62, "rgba(0,0,0,0.18)");
  vignette.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  if (game.focusTimer > 0 || game.purgeSlowTimer > 0) {
    const isFreeze = game.focusTimer > 0;
    const effectColor = isFreeze ? signalStyles.focus.color : signalStyles.clear.color;
    const freezePulse = 0.5 + Math.sin(game.elapsed * 5.5) * 0.5;
    ctx.save();
    if (isFreeze) {
      const sweepY = (game.elapsed * 48) % 42;
      ctx.fillStyle = effectColor;
      ctx.globalAlpha = 0.025;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 0.08 + freezePulse * 0.04;
      for (let y = -42; y < height + 42; y += 42) {
        ctx.fillRect(0, y + sweepY, width, 1);
      }
    } else {
      const novaPulse = 0.5 + Math.sin(game.elapsed * 8) * 0.5;
      ctx.fillStyle = effectColor;
      ctx.globalAlpha = 0.018 + novaPulse * 0.012;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = effectColor;
      ctx.globalAlpha = 0.08 + novaPulse * 0.05;
      ctx.lineWidth = 1;
      for (let index = 0; index < 6; index += 1) {
        const angle = game.elapsed * 0.45 + index * ((Math.PI * 2) / 10);
        const inner = 28 + novaPulse * 8;
        const outer = 64 + novaPulse * 16;
        ctx.beginPath();
        ctx.moveTo(game.player.x + Math.cos(angle) * inner, game.player.y + Math.sin(angle) * inner);
        ctx.lineTo(game.player.x + Math.cos(angle) * outer, game.player.y + Math.sin(angle) * outer);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = isFreeze ? 0.42 : 0.24;
    ctx.strokeStyle = effectColor;
    ctx.shadowBlur = isFreeze ? 16 + freezePulse * 10 : 0;
    ctx.shadowColor = effectColor;
    ctx.lineWidth = 2;
    const inset = 16;
    const length = isFreeze ? 58 : 46;
    ctx.beginPath();
    ctx.moveTo(inset, inset + length);
    ctx.lineTo(inset, inset);
    ctx.lineTo(inset + length, inset);
    ctx.moveTo(width - inset - length, inset);
    ctx.lineTo(width - inset, inset);
    ctx.lineTo(width - inset, inset + length);
    ctx.moveTo(width - inset, height - inset - length);
    ctx.lineTo(width - inset, height - inset);
    ctx.lineTo(width - inset - length, height - inset);
    ctx.moveTo(inset + length, height - inset);
    ctx.lineTo(inset, height - inset);
    ctx.lineTo(inset, height - inset - length);
    ctx.stroke();
    ctx.restore();
  }

  if (game.multiplierTimer > 0) {
    const overdrivePulse = 0.5 + Math.sin(game.elapsed * 7) * 0.5;
    const speedOffset = (game.elapsed * 180) % 56;
    ctx.save();
    ctx.strokeStyle = signalStyles.bonus.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.06 + overdrivePulse * 0.03;
    for (let y = -height * 0.7; y < height * 1.7; y += 86) {
      ctx.beginPath();
      ctx.moveTo(width + 60, y + speedOffset);
      ctx.lineTo(-60, y + height * 0.34 + speedOffset);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.16 + overdrivePulse * 0.08;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();
    ctx.restore();
  }

  for (const signal of game.signals) {
    const glowPulse = 0.5 + Math.sin(game.elapsed * 5 + signal.pulse) * 0.5;
    const style = signalStyles[signal.kind];
    const iconRadius = signal.kind === "gain" ? 11 : 12.5;
    ctx.save();
    ctx.translate(signal.x, signal.y);
    ctx.shadowBlur = 8 + glowPulse * 7;
    ctx.shadowColor = style.color;
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = style.color;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.24 + glowPulse * 0.1;
    drawSignalIcon(ctx, signal.kind, iconRadius + 3.5);
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 1.8;
    drawSignalIcon(ctx, signal.kind, iconRadius);
    ctx.restore();
  }

  for (const incident of game.incidents) {
    const style = incidentStyles[incident.kind];
    ctx.save();
    ctx.translate(incident.x, incident.y);
    const heading = Math.atan2(incident.velocity.y, incident.velocity.x);
    if (incident.kind === "drift") {
      ctx.rotate(heading);
    }
    ctx.strokeStyle = style.color;
    ctx.fillStyle = "transparent";
    ctx.shadowBlur = 9;
    ctx.shadowColor = ctx.strokeStyle;
    if (incident.kind === "tracker") {
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(0, 0, incident.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (incident.kind === "sentinel") {
      const pulseRadius = getIncidentCollisionRadius(incident);
      const pulseTime = incident.age % 2.15;
      const pulseProgress = pulseTime <= 0.95 ? pulseTime / 0.95 : 0;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const angle = Math.PI / 6 + point * (Math.PI / 3);
        const radius = incident.radius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (point === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = pulseProgress > 0 ? 0.34 + pulseProgress * 0.36 : 0.16;
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 1.1 + pulseProgress * 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      if (pulseProgress > 0) {
        ctx.globalAlpha = 0.11 + pulseProgress * 0.12;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(0, 0, pulseRadius - 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else if (incident.kind === "heavy") {
      const size = Math.max(22, incident.radius * 0.98);
      ctx.rotate(Math.PI / 4);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(-size / 2, -size / 2, size, size);
      ctx.stroke();
    } else if (incident.kind === "waver") {
      ctx.rotate(incident.spin * 0.28);
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let point = 0; point <= 16; point += 1) {
        const angle = point * (Math.PI / 8);
        const radius = incident.radius * (point % 2 === 0 ? 0.86 : 0.58);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (point === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    } else if (incident.kind === "splitter") {
      ctx.rotate(heading);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(incident.radius, 0);
      ctx.lineTo(0, incident.radius * 0.72);
      ctx.lineTo(-incident.radius, 0);
      ctx.lineTo(0, -incident.radius * 0.72);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.lineCap = "round";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-incident.radius * 0.95, 0);
      ctx.lineTo(incident.radius * 0.95, 0);
      ctx.stroke();
    }
    if (game.focusTimer > 0) {
      const freezeHalo = 0.5 + Math.sin(game.elapsed * 6 + incident.spin) * 0.5;
      ctx.strokeStyle = signalStyles.focus.color;
      ctx.shadowColor = signalStyles.focus.color;
      ctx.shadowBlur = 10 + freezeHalo * 8;
      ctx.globalAlpha = 0.22 + freezeHalo * 0.16;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, getIncidentCollisionRadius(incident) + 5 + freezeHalo * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  if (game.phaseTimer > 0) {
    const shieldPulse = 0.5 + Math.sin(game.elapsed * 7.5) * 0.5;
    const shieldRadius = PLAYER_RADIUS + 19 + shieldPulse * 3;
    ctx.save();
    ctx.translate(game.player.x, game.player.y);
    const shieldGlow = ctx.createRadialGradient(0, 0, PLAYER_RADIUS * 0.7, 0, 0, shieldRadius + 12);
    shieldGlow.addColorStop(0, "rgba(45,212,191,0)");
    shieldGlow.addColorStop(0.58, "rgba(45,212,191,0.06)");
    shieldGlow.addColorStop(1, "rgba(45,212,191,0)");
    ctx.fillStyle = shieldGlow;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius + 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = signalStyles.repair.color;
    ctx.shadowColor = signalStyles.repair.color;
    ctx.shadowBlur = 18 + shieldPulse * 16;
    ctx.globalAlpha = 0.34 + shieldPulse * 0.18;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.26 + shieldPulse * 0.14;
    ctx.lineWidth = 1.25;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius - 5, game.elapsed * 1.8, game.elapsed * 1.8 + Math.PI * 0.85);
    ctx.arc(0, 0, shieldRadius - 5, game.elapsed * 1.8 + Math.PI * 1.18, game.elapsed * 1.8 + Math.PI * 1.72);
    ctx.stroke();
    ctx.restore();
  }

  if (game.novaWave) {
    const progress = clamp(game.novaWave.age / game.novaWave.duration, 0, 1);
    const fade = 1 - progress;
    ctx.save();
    ctx.translate(game.novaWave.x, game.novaWave.y);
    ctx.strokeStyle = signalStyles.clear.color;
    ctx.globalAlpha = 0.38 + fade * 0.45;
    ctx.lineWidth = 3 + fade * 2;
    ctx.beginPath();
    ctx.arc(0, 0, game.novaWave.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.1 + fade * 0.16;
    ctx.lineWidth = 8 + fade * 8;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0, game.novaWave.radius - 8), 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.12 * fade;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0, game.novaWave.radius * 0.72), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (game.dashTimer > 0 || game.invulnerableTimer > 0) {
    const dashFade = clamp(game.dashTimer / DASH_DURATION, 0, 1);
    const recoveryFade = game.dashTimer <= 0 ? clamp(game.invulnerableTimer / HIT_INVULNERABLE_DURATION, 0, 1) : 0;
    ctx.save();
    ctx.translate(game.player.x, game.player.y);
    ctx.strokeStyle = PLAYER_READY_COLOR;
    ctx.shadowBlur = 18;
    ctx.shadowColor = PLAYER_READY_COLOR;
    if (recoveryFade > 0) {
      ctx.globalAlpha = 0.18 + Math.sin(game.elapsed * 24) * 0.08 + recoveryFade * 0.22;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER_RADIUS + 9 + recoveryFade * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (dashFade > 0) {
      ctx.globalAlpha = 0.45 * dashFade;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-game.dashVector.x * 9, -game.dashVector.y * 9);
      ctx.lineTo(-game.dashVector.x * 34, -game.dashVector.y * 34);
      ctx.stroke();
    }
    ctx.restore();
  }

  const dashReadyPercent = clamp(1 - game.dashCooldown / DASH_COOLDOWN, 0, 1);
  const dashReady = game.dashCooldown <= 0;
  const readyPulse = dashReady ? 0.5 + Math.sin(game.elapsed * 6.2) * 0.5 : 0;
  const overdriveActive = game.multiplierTimer > 0;
  ctx.save();
  ctx.translate(game.player.x, game.player.y);
  ctx.rotate(game.playerAngle);
  if (overdriveActive) {
    const trailPulse = 0.5 + Math.sin(game.elapsed * 12) * 0.5;
    ctx.strokeStyle = signalStyles.bonus.color;
    ctx.shadowColor = signalStyles.bonus.color;
    ctx.shadowBlur = 20 + trailPulse * 10;
    ctx.lineCap = "round";
    for (let index = 0; index < 3; index += 1) {
      const length = 18 + index * 10 + trailPulse * 6;
      const offset = index * 4;
      ctx.globalAlpha = 0.34 - index * 0.09;
      ctx.lineWidth = 3 - index * 0.45;
      ctx.beginPath();
      ctx.moveTo(-PLAYER_RADIUS * 0.72 - offset, PLAYER_RADIUS * 0.42);
      ctx.lineTo(-PLAYER_RADIUS * 0.72 - length, PLAYER_RADIUS * 0.42);
      ctx.moveTo(-PLAYER_RADIUS * 0.72 - offset, -PLAYER_RADIUS * 0.42);
      ctx.lineTo(-PLAYER_RADIUS * 0.72 - length, -PLAYER_RADIUS * 0.42);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "#050816";
  ctx.strokeStyle = PLAYER_BASE_COLOR;
  ctx.globalAlpha = dashReady ? 1 : 0.62;
  ctx.shadowBlur = overdriveActive ? 14 : dashReady ? 8 : 0;
  ctx.shadowColor = overdriveActive ? signalStyles.bonus.color : PLAYER_BASE_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SHIP_POINTS[0].x, SHIP_POINTS[0].y);
  ctx.lineTo(SHIP_POINTS[1].x, SHIP_POINTS[1].y);
  ctx.lineTo(SHIP_POINTS[2].x, SHIP_POINTS[2].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (dashReadyPercent > 0) {
    let remainingLength = DASH_PERIMETER * dashReadyPercent;

    if (dashReady) {
      ctx.fillStyle = DASH_COLOR;
      ctx.globalAlpha = 0.1 + readyPulse * 0.1;
      ctx.shadowBlur = 20 + readyPulse * 12;
      ctx.shadowColor = DASH_COLOR;
      ctx.beginPath();
      ctx.moveTo(DASH_SHIP_POINTS[0].x, DASH_SHIP_POINTS[0].y);
      ctx.lineTo(DASH_SHIP_POINTS[1].x, DASH_SHIP_POINTS[1].y);
      ctx.lineTo(DASH_SHIP_POINTS[2].x, DASH_SHIP_POINTS[2].y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = DASH_COLOR;
    ctx.shadowBlur = dashReady ? 18 + readyPulse * 10 : 0;
    ctx.shadowColor = DASH_COLOR;
    ctx.globalAlpha = dashReady ? 1 : 0.55;
    ctx.lineWidth = dashReady ? 2.8 : 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(DASH_SHIP_POINTS[0].x, DASH_SHIP_POINTS[0].y);
    for (let index = 0; index < DASH_EDGE_LENGTHS.length && remainingLength > 0; index += 1) {
      const from = DASH_SHIP_POINTS[index];
      const to = DASH_SHIP_POINTS[index + 1];
      const edgeLength = DASH_EDGE_LENGTHS[index];
      if (remainingLength >= edgeLength) {
        ctx.lineTo(to.x, to.y);
      } else {
        const amount = remainingLength / edgeLength;
        ctx.lineTo(from.x + (to.x - from.x) * amount, from.y + (to.y - from.y) * amount);
      }
      remainingLength -= edgeLength;
    }
    ctx.stroke();

    if (dashReady) {
      const readyScale = 1.2 + readyPulse * 0.07;
      ctx.strokeStyle = PLAYER_READY_COLOR;
      ctx.globalAlpha = 0.3 + readyPulse * 0.28;
      ctx.shadowBlur = 18 + readyPulse * 16;
      ctx.shadowColor = PLAYER_READY_COLOR;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(SHIP_POINTS[0].x * readyScale, SHIP_POINTS[0].y * readyScale);
      ctx.lineTo(SHIP_POINTS[1].x * readyScale, SHIP_POINTS[1].y * readyScale);
      ctx.lineTo(SHIP_POINTS[2].x * readyScale, SHIP_POINTS[2].y * readyScale);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  for (const floatingText of game.floatingTexts) {
    const progress = clamp(floatingText.age / floatingText.duration, 0, 1);
    const lift = 34 * (1 - (1 - progress) * (1 - progress));
    ctx.save();
    ctx.translate(floatingText.x, floatingText.y - lift);
    ctx.globalAlpha = 1 - progress;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${floatingText.surge ? "800" : "700"} ${floatingText.surge ? 18 : 16}px Roboto Condensed, sans-serif`;
    if (floatingText.surge) {
      const shimmer = (Math.sin(game.elapsed * 18 + floatingText.age * 22) + 1) / 2;
      const surgeGradient = ctx.createLinearGradient(-24, 0, 24, 0);
      surgeGradient.addColorStop(0, shimmer > 0.5 ? "#22d3ee" : "#c084fc");
      surgeGradient.addColorStop(0.48, "#f8fafc");
      surgeGradient.addColorStop(1, shimmer > 0.5 ? "#c084fc" : "#22d3ee");
      ctx.fillStyle = surgeGradient;
      ctx.shadowBlur = 20 + shimmer * 10;
      ctx.shadowColor = shimmer > 0.5 ? "#22d3ee" : "#c084fc";
    } else {
      ctx.fillStyle = floatingText.color;
      ctx.shadowBlur = 14;
      ctx.shadowColor = floatingText.color;
    }
    ctx.fillText(floatingText.text, 0, 0);
    ctx.restore();
  }

  if (mode === "ready" || mode === "paused" || mode === "ended") {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f4f4f5";
    ctx.font = "700 28px Roboto Condensed, sans-serif";
    ctx.fillText(mode === "ended" ? "Game Over" : mode === "paused" ? "Paused" : "Star Surge", width / 2, height / 2 - 16);
    ctx.font = "400 13px Roboto Mono, monospace";
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText("Move with WASD, arrows, or drag. Shift dashes.", width / 2, height / 2 + 20);
    ctx.restore();
  }

  ctx.restore();
}

function updateGame(game: GameState, dt: number, keys: Set<string>, dashRequested: boolean): GameState {
  const previousPlayerX = game.player.x;
  const previousPlayerY = game.player.y;
  const comboExpired = game.comboTimer <= 0 && game.combo > BASE_COMBO_MULTIPLIER;
  const decayedCombo = comboExpired ? clamp(game.combo - COMBO_DECAY_STEP, BASE_COMBO_MULTIPLIER, MAX_COMBO_MULTIPLIER) : game.combo;
  const next: GameState = {
    ...game,
    player: { ...game.player },
    target: { ...game.target },
    pointerActive: game.pointerActive,
    playerAngle: game.playerAngle,
    signals: game.signals,
    incidents: game.incidents,
    novaWave: game.novaWave
      ? {
          ...game.novaWave,
          age: game.novaWave.age + dt,
        }
      : null,
    floatingTexts: game.floatingTexts,
    combo: decayedCombo,
    comboTimer: comboExpired && decayedCombo > BASE_COMBO_MULTIPLIER ? COMBO_DURATION : Math.max(0, game.comboTimer - dt),
    phaseTimer: Math.max(0, game.phaseTimer - dt),
    focusTimer: Math.max(0, game.focusTimer - dt),
    purgeSlowTimer: Math.max(0, game.purgeSlowTimer - dt),
    multiplierTimer: Math.max(0, game.multiplierTimer - dt),
    dashCooldown: Math.max(0, game.dashCooldown - dt),
    dashTimer: Math.max(0, game.dashTimer - dt),
    invulnerableTimer: Math.max(0, game.invulnerableTimer - dt),
    dashVector: game.dashVector,
    shakeTimer: Math.max(0, game.shakeTimer - dt),
    elapsed: game.elapsed + dt,
    spawnTimer: game.spawnTimer - dt,
    signalTimer: game.signalTimer - dt,
  };

  if (next.floatingTexts.length > 0) {
    const activeFloatingTexts: FloatingText[] = [];
    for (const floatingText of next.floatingTexts) {
      const agedText = {
        ...floatingText,
        age: floatingText.age + dt,
      };
      if (agedText.age < agedText.duration) {
        activeFloatingTexts.push(agedText);
      }
    }
    next.floatingTexts = activeFloatingTexts;
  }

  let keyVelocityX = 0;
  let keyVelocityY = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) keyVelocityX -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) keyVelocityX += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) keyVelocityY -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) keyVelocityY += 1;
  const movementBoost = next.multiplierTimer > 0 ? OVERDRIVE_SPEED_MULTIPLIER : 1;

  if (dashRequested && next.dashCooldown <= 0) {
    let dashX = Math.cos(next.playerAngle);
    let dashY = Math.sin(next.playerAngle);

    if (keyVelocityX || keyVelocityY) {
      const length = Math.hypot(keyVelocityX, keyVelocityY);
      dashX = keyVelocityX / length;
      dashY = keyVelocityY / length;
    } else if (next.pointerActive) {
      const toTargetX = next.target.x - next.player.x;
      const toTargetY = next.target.y - next.player.y;
      const targetDistance = Math.hypot(toTargetX, toTargetY);
      if (targetDistance > 1) {
        dashX = toTargetX / targetDistance;
        dashY = toTargetY / targetDistance;
      }
    }

    next.dashVector = { x: dashX, y: dashY };
    next.dashTimer = DASH_DURATION;
    next.dashCooldown = DASH_COOLDOWN;
    next.invulnerableTimer = DASH_INVULNERABLE_DURATION;
  }

  if (keyVelocityX || keyVelocityY) {
    const length = Math.hypot(keyVelocityX, keyVelocityY);
    next.player.x += (keyVelocityX / length) * KEYBOARD_SPEED * movementBoost * dt;
    next.player.y += (keyVelocityY / length) * KEYBOARD_SPEED * movementBoost * dt;
    next.target = next.player;
    next.pointerActive = false;
  } else if (next.pointerActive) {
    const toTargetX = next.target.x - next.player.x;
    const toTargetY = next.target.y - next.player.y;
    const targetDistance = Math.hypot(toTargetX, toTargetY);
    const travel = Math.min(targetDistance, POINTER_SPEED * movementBoost * dt);

    if (targetDistance > 1) {
      next.player.x += (toTargetX / targetDistance) * travel;
      next.player.y += (toTargetY / targetDistance) * travel;
    }
  } else {
    next.player.x += (next.target.x - next.player.x) * Math.min(1, dt * 7);
    next.player.y += (next.target.y - next.player.y) * Math.min(1, dt * 7);
  }

  if (next.dashTimer > 0) {
    const dashEase = 0.7 + (next.dashTimer / DASH_DURATION) * 0.3;
    next.player.x += next.dashVector.x * DASH_SPEED * dashEase * dt;
    next.player.y += next.dashVector.y * DASH_SPEED * dashEase * dt;
  }

  next.player.x = clamp(next.player.x, PLAYER_RADIUS + 4, next.width - PLAYER_RADIUS - 4);
  next.player.y = clamp(next.player.y, PLAYER_RADIUS + 4, next.height - PLAYER_RADIUS - 4);

  const movementX = next.player.x - previousPlayerX;
  const movementY = next.player.y - previousPlayerY;
  if (Math.hypot(movementX, movementY) > 0.1) {
    next.playerAngle = lerpAngle(next.playerAngle, Math.atan2(movementY, movementX), Math.min(1, dt * 14));
  }

  if (next.spawnTimer <= 0) {
    if (next.incidents.length < getIncidentCap(next.elapsed)) {
      next.incidents.push(createIncident(next.width, next.height, next.elapsed, next.incidents));
    }
    next.spawnTimer = getIncidentSpawnDelay(next.elapsed);
  }

  if (!next.signals.some((signal) => signal.kind === "gain")) {
    next.signals.push(createSignal(next.width, next.height, "gain"));
  }

  if (next.signalTimer <= 0) {
    let powerupCount = 0;
    for (const signal of next.signals) {
      if (signal.kind !== "gain") powerupCount += 1;
    }
    if (powerupCount < 2 && Math.random() < 0.52) {
      next.signals.push(createPowerupSignal(next.width, next.height));
    }
    next.signalTimer = 5.4 + Math.random() * 4.2;
  }

  const focusScale = next.focusTimer > 0 ? 0.45 : next.purgeSlowTimer > 0 ? 0.78 : 1;
  const activeIncidents: Incident[] = [];
  const spawnedIncidents: Incident[] = [];
  for (const incident of next.incidents) {
    incident.age += dt;
    incident.spin += dt * (incident.kind === "sentinel" ? 2.2 : incident.kind === "splitter" ? 6.2 : incident.kind === "waver" ? 5.5 : 2.4);

    if (incident.kind === "tracker") {
      const desiredAngle = Math.atan2(next.player.y - incident.y, next.player.x - incident.x);
      const currentSpeed = Math.hypot(incident.velocity.x, incident.velocity.y);
      const desiredX = Math.cos(desiredAngle) * currentSpeed;
      const desiredY = Math.sin(desiredAngle) * currentSpeed;
      const turnRate = Math.min(1, dt * 0.44);
      incident.velocity.x += (desiredX - incident.velocity.x) * turnRate;
      incident.velocity.y += (desiredY - incident.velocity.y) * turnRate;
      const steeredSpeed = Math.hypot(incident.velocity.x, incident.velocity.y) || currentSpeed;
      incident.velocity.x = (incident.velocity.x / steeredSpeed) * currentSpeed;
      incident.velocity.y = (incident.velocity.y / steeredSpeed) * currentSpeed;
    }

    const heavyChargeScale = incident.kind === "heavy" && incident.age < 0.62 ? 0 : incident.kind === "heavy" ? 1.48 : 1;
    const sentinelPulseScale = incident.kind === "sentinel" && incident.age % 2.15 < 0.95 ? 0.25 : 1;

    incident.x += incident.velocity.x * dt * focusScale * heavyChargeScale * sentinelPulseScale;
    incident.y += incident.velocity.y * dt * focusScale * heavyChargeScale * sentinelPulseScale;

    if (incident.kind === "sentinel") {
      const pulseTime = incident.age % 2.15;
      if (pulseTime < 0.95) {
        const pullRadius = getIncidentCollisionRadius(incident) + SENTINEL_PULL_RADIUS_PADDING;
        const toSentinelX = incident.x - next.player.x;
        const toSentinelY = incident.y - next.player.y;
        const pullDistance = Math.hypot(toSentinelX, toSentinelY);
        if (pullDistance > 1 && pullDistance < pullRadius) {
          const pulseStrength = 1 - (1 - pulseTime / 0.95) ** 2;
          const distanceStrength = 1 - pullDistance / pullRadius;
          const pull = SENTINEL_PULL_SPEED * pulseStrength * distanceStrength * dt;
          next.player.x += (toSentinelX / pullDistance) * pull;
          next.player.y += (toSentinelY / pullDistance) * pull;
        }
      }
    }

    if (incident.kind === "heavy" && incident.age >= 0.62) {
      const speed = Math.hypot(incident.velocity.x, incident.velocity.y) || 1;
      const crushSweep = Math.sin((incident.age - 0.62) * 7.2) * 72 * dt * focusScale;
      incident.x += (-incident.velocity.y / speed) * crushSweep;
      incident.y += (incident.velocity.x / speed) * crushSweep;
    }

    if (incident.kind === "waver") {
      const speed = Math.hypot(incident.velocity.x, incident.velocity.y) || 1;
      const wave = Math.sin(incident.spin) * 124 * dt * focusScale;
      incident.x += (-incident.velocity.y / speed) * wave;
      incident.y += (incident.velocity.x / speed) * wave;
    }

    if (incident.kind === "splitter") {
      const desiredAngle = Math.atan2(next.player.y - incident.y, next.player.x - incident.x);
      const currentSpeed = Math.hypot(incident.velocity.x, incident.velocity.y);
      const desiredX = Math.cos(desiredAngle) * currentSpeed;
      const desiredY = Math.sin(desiredAngle) * currentSpeed;
      const turnRate = Math.min(1, dt * 0.22);
      incident.velocity.x += (desiredX - incident.velocity.x) * turnRate;
      incident.velocity.y += (desiredY - incident.velocity.y) * turnRate;
      const steeredSpeed = Math.hypot(incident.velocity.x, incident.velocity.y) || currentSpeed;
      incident.velocity.x = (incident.velocity.x / steeredSpeed) * currentSpeed;
      incident.velocity.y = (incident.velocity.y / steeredSpeed) * currentSpeed;
    }

    if (incident.kind === "splitter" && incident.age > 2.8 && getIncidentCap(next.elapsed) - activeIncidents.length - spawnedIncidents.length > 3) {
      const heading = Math.atan2(incident.velocity.y, incident.velocity.x);
      const speed = Math.hypot(incident.velocity.x, incident.velocity.y) * 1.28;
      for (const spread of [-Math.PI / 2, 0, Math.PI / 2, Math.PI]) {
        spawnedIncidents.push({
          x: incident.x,
          y: incident.y,
          kind: "waver",
          radius: 8,
          velocity: {
            x: Math.cos(heading + spread) * speed,
            y: Math.sin(heading + spread) * speed,
          },
          spin: Math.random() * Math.PI * 2,
          age: 0,
        });
      }
      continue;
    }

    const expired = incident.kind === "sentinel" && incident.age > 8.5;
    if (!expired && incident.x > -80 && incident.x < next.width + 80 && incident.y > -80 && incident.y < next.height + 80) {
      activeIncidents.push(incident);
    }
  }
  const incidentCap = getIncidentCap(next.elapsed);
  next.incidents = [...activeIncidents, ...spawnedIncidents].slice(-incidentCap);
  next.player.x = clamp(next.player.x, PLAYER_RADIUS + 4, next.width - PLAYER_RADIUS - 4);
  next.player.y = clamp(next.player.y, PLAYER_RADIUS + 4, next.height - PLAYER_RADIUS - 4);

  if (next.novaWave) {
    const progress = clamp(next.novaWave.age / next.novaWave.duration, 0, 1);
    const easedProgress = 1 - (1 - progress) * (1 - progress);
    next.novaWave.radius = next.novaWave.maxRadius * easedProgress;

    let cleared = 0;
    let clearScoreTotal = 0;
    next.incidents = next.incidents.filter((incident) => {
      const collisionRadius = (next.novaWave as NovaWave).radius + getIncidentCollisionRadius(incident);
      const hit = distanceSquared(incident, next.novaWave as NovaWave) <= collisionRadius * collisionRadius;
      if (hit) {
        cleared += 1;
        const clearScore = Math.round(NOVA_CLEAR_SCORE[incident.kind] * next.combo * (next.multiplierTimer > 0 ? 2 : 1));
        clearScoreTotal += clearScore;
        next.floatingTexts.push(createFloatingText(incident.x, incident.y, `+${clearScore}`, signalStyles.clear.color, next.combo >= MAX_COMBO_MULTIPLIER));
      }
      return !hit;
    });

    if (cleared > 0) {
      next.score += clearScoreTotal;
    }

    if (progress >= 1) {
      next.novaWave = null;
    }
  }

  next.signals = next.signals.filter((signal) => {
    if (isWithinDistance(signal, next.player, signal.radius + PLAYER_RADIUS)) {
      if (signal.kind === "gain") {
        const nextCombo = clamp(next.combo + getComboGain(next.combo), BASE_COMBO_MULTIPLIER, MAX_COMBO_MULTIPLIER);
        next.combo = nextCombo;
        next.comboTimer = COMBO_DURATION;
        const starScore = Math.round(100 * nextCombo * (next.multiplierTimer > 0 ? 2 : 1));
        const comboHeat = clamp((nextCombo - BASE_COMBO_MULTIPLIER) / (MAX_COMBO_MULTIPLIER - BASE_COMBO_MULTIPLIER), 0, 1);
        const scoreColor = nextCombo >= MAX_COMBO_MULTIPLIER ? "#f8fafc" : getComboColor(comboHeat);
        next.score += starScore;
        next.floatingTexts.push(createFloatingText(signal.x, signal.y, `+${starScore}`, scoreColor, nextCombo >= MAX_COMBO_MULTIPLIER));
      } else if (signal.kind === "repair") {
        if (next.combo > BASE_COMBO_MULTIPLIER) next.comboTimer = COMBO_DURATION;
        next.phaseTimer = PHASE_DURATION;
        next.floatingTexts.push(createFloatingText(signal.x, signal.y, "SHIELD", signalStyles.repair.color));
      } else if (signal.kind === "focus") {
        if (next.combo > BASE_COMBO_MULTIPLIER) next.comboTimer = COMBO_DURATION;
        next.focusTimer = FREEZE_DURATION;
        next.floatingTexts.push(createFloatingText(signal.x, signal.y, "FREEZE", signalStyles.focus.color));
      } else if (signal.kind === "clear") {
        if (next.combo > BASE_COMBO_MULTIPLIER) next.comboTimer = COMBO_DURATION;
        next.novaWave = createNovaWave(next.player, next.width, next.height);
        next.purgeSlowTimer = NOVA_SLOW_DURATION;
        next.floatingTexts.push(createFloatingText(signal.x, signal.y, "NOVA", signalStyles.clear.color));
      } else {
        if (next.combo > BASE_COMBO_MULTIPLIER) next.comboTimer = COMBO_DURATION;
        next.multiplierTimer = OVERDRIVE_DURATION;
        next.floatingTexts.push(createFloatingText(signal.x, signal.y, "2X", signalStyles.bonus.color));
      }
      return false;
    }
    return true;
  });

  if (!next.signals.some((signal) => signal.kind === "gain")) {
    next.signals.push(createSignal(next.width, next.height, "gain"));
  }

  for (const incident of next.incidents) {
    if (next.invulnerableTimer <= 0 && next.phaseTimer <= 0 && isWithinDistance(incident, next.player, getIncidentCollisionRadius(incident) + PLAYER_RADIUS - 2)) {
      next.lives = Math.max(0, next.lives - 1);
      next.invulnerableTimer = HIT_INVULNERABLE_DURATION;
      next.shakeTimer = 0.22;
      next.combo = BASE_COMBO_MULTIPLIER;
      next.comboTimer = 0;
      incident.x = -999;
      next.score = Math.max(0, next.score - 70);
    }
  }

  return next;
}

export default function ArcadeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const keysRef = useRef(new Set<string>());
  const dashQueuedRef = useRef(false);
  const pointerStartRef = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const [mode, setMode] = useState<GameMode>("ready");
  const modeRef = useRef<GameMode>("ready");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(BASE_COMBO_MULTIPLIER);
  const [comboTimer, setComboTimer] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [focusTimer, setFocusTimer] = useState(0);
  const [novaWaveTimer, setNovaWaveTimer] = useState(0);
  const [multiplierTimer, setMultiplierTimer] = useState(0);
  const [scoreBump, setScoreBump] = useState(0);
  const [livesBump, setLivesBump] = useState(0);
  const [lostLifeIndex, setLostLifeIndex] = useState<number | null>(null);
  const previousScoreRef = useRef(0);
  const previousComboRef = useRef(BASE_COMBO_MULTIPLIER);
  const previousComboTimerRef = useRef(0);
  const previousLivesRef = useRef(INITIAL_LIVES);
  const previousPhaseTimerRef = useRef(0);
  const previousFocusTimerRef = useRef(0);
  const previousNovaWaveTimerRef = useRef(0);
  const previousMultiplierTimerRef = useRef(0);
  const comboMultiplier = combo;
  const isMaxCombo = comboMultiplier >= MAX_COMBO_MULTIPLIER;
  const comboHeat = clamp((comboMultiplier - BASE_COMBO_MULTIPLIER) / (MAX_COMBO_MULTIPLIER - BASE_COMBO_MULTIPLIER), 0, 1);
  const comboColor = getComboColor(comboHeat);

  const renderActiveChip = (label: string, seconds: number, maxSeconds: number, color: string) => {
    const active = seconds > 0;
    const percent = active ? clamp((seconds / maxSeconds) * 100, 0, 100) : 0;

    return (
      <span
        className={`arcade-active-chip type-meta relative overflow-hidden rounded-md border px-2 py-1 text-[0.68rem] ${active ? "arcade-active-chip--on text-white" : "text-zinc-500"}`}
        style={{
          borderColor: active ? color : "rgb(63 63 70)",
          color: active ? color : undefined,
        }}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 transition-[width] duration-100"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
            opacity: active ? 0.88 : 0,
          }}
        />
        <span className={`relative z-10 ${active ? "text-white mix-blend-screen" : "text-zinc-500"}`}>
          {label}
        </span>
      </span>
    );
  };

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(360, Math.floor(rect.height));
    const pixelWidth = Math.floor(width * ratio);
    const pixelHeight = Math.floor(height * ratio);

    const ctx = ctxRef.current ?? canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const dimensionsChanged =
      canvas.width !== pixelWidth ||
      canvas.height !== pixelHeight ||
      canvas.style.width !== `${width}px` ||
      canvas.style.height !== `${height}px`;

    if (dimensionsChanged) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const current = gameRef.current;
    if (current && !dimensionsChanged) {
      drawGame(ctx, current, modeRef.current);
      return;
    }

    if (current) {
      const scaleX = current.width > 0 ? width / current.width : 1;
      const scaleY = current.height > 0 ? height / current.height : 1;
      gameRef.current = {
        ...current,
        width,
        height,
        player: {
          x: clamp(current.player.x * scaleX, PLAYER_RADIUS + 4, width - PLAYER_RADIUS - 4),
          y: clamp(current.player.y * scaleY, PLAYER_RADIUS + 4, height - PLAYER_RADIUS - 4),
        },
        target: {
          x: clamp(current.target.x * scaleX, PLAYER_RADIUS + 4, width - PLAYER_RADIUS - 4),
          y: clamp(current.target.y * scaleY, PLAYER_RADIUS + 4, height - PLAYER_RADIUS - 4),
        },
        pointerActive: current.pointerActive,
        signals: current.signals.map((signal) => ({
          ...signal,
          x: clamp(signal.x * scaleX, 16, width - 16),
          y: clamp(signal.y * scaleY, 16, height - 16),
        })),
        incidents: current.incidents.map((incident) => ({
          ...incident,
          x: incident.x * scaleX,
          y: incident.y * scaleY,
        })),
        floatingTexts: current.floatingTexts.map((floatingText) => ({
          ...floatingText,
          x: floatingText.x * scaleX,
          y: floatingText.y * scaleY,
        })),
        novaWave: current.novaWave
          ? createNovaWave(
              {
                x: current.novaWave.x * scaleX,
                y: current.novaWave.y * scaleY,
              },
              width,
              height,
            )
          : null,
        playerAngle: current.playerAngle,
      };
    } else {
      gameRef.current = createGameState(width, height);
    }

    drawGame(ctx, gameRef.current, modeRef.current);
  }, []);

  const restart = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current ?? canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctxRef.current = ctx;

    gameRef.current = createGameState(canvas.clientWidth, canvas.clientHeight);
    setScore(0);
    setCombo(BASE_COMBO_MULTIPLIER);
    setComboTimer(0);
    previousScoreRef.current = 0;
    previousComboRef.current = BASE_COMBO_MULTIPLIER;
    previousComboTimerRef.current = 0;
    previousLivesRef.current = INITIAL_LIVES;
    previousPhaseTimerRef.current = 0;
    previousFocusTimerRef.current = 0;
    previousNovaWaveTimerRef.current = 0;
    previousMultiplierTimerRef.current = 0;
    dashQueuedRef.current = false;
    setScoreBump(0);
    setLivesBump(0);
    setLostLifeIndex(null);
    setLives(INITIAL_LIVES);
    setPhaseTimer(0);
    setFocusTimer(0);
    setNovaWaveTimer(0);
    setMultiplierTimer(0);
    modeRef.current = "running";
    setMode("running");
  }, []);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    sizeCanvas();
    const container = containerRef.current;
    let resizeFrame: number | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(sizeCanvas);
    });

    if (container) {
      observer.observe(container);
    }

    window.addEventListener("resize", sizeCanvas);
    return () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      window.removeEventListener("resize", sizeCanvas);
    };
  }, [sizeCanvas]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight"].includes(event.code)) {
        event.preventDefault();
      }
      if (event.code === "Space") {
        setMode((current) => (current === "running" ? "paused" : current === "paused" ? "running" : current));
        return;
      }
      if ((event.code === "ShiftLeft" || event.code === "ShiftRight") && !event.repeat && modeRef.current === "running") {
        dashQueuedRef.current = true;
      }
      keysRef.current.add(event.code);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const frame = (time: number) => {
      const canvas = canvasRef.current;
      const game = gameRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx || !game) {
        animationRef.current = requestAnimationFrame(frame);
        return;
      }

      const last = lastFrameRef.current ?? time;
      const dt = Math.min(0.033, (time - last) / 1000);
      lastFrameRef.current = time;

      let frameGame = game;
      const shouldContinue = mode === "running" || game.shakeTimer > 0;
      if (mode === "running") {
        const dashRequested = dashQueuedRef.current;
        dashQueuedRef.current = false;
        const next = updateGame(game, dt, keysRef.current, dashRequested);
        gameRef.current = next;
        frameGame = next;
        const nextScore = Math.floor(next.score);
        if (nextScore !== previousScoreRef.current) {
          if (nextScore > previousScoreRef.current) {
            setScoreBump((value) => value + 1);
          }
          previousScoreRef.current = nextScore;
          setScore(nextScore);
        }

        const nextCombo = Math.round(next.combo * 100) / 100;
        if (nextCombo !== previousComboRef.current) {
          previousComboRef.current = nextCombo;
          setCombo(nextCombo);
        }

        const nextComboTimer = quantizeTimer(next.comboTimer);
        if (nextComboTimer !== previousComboTimerRef.current) {
          previousComboTimerRef.current = nextComboTimer;
          setComboTimer(nextComboTimer);
        }

        const nextLives = next.lives;
        if (nextLives !== previousLivesRef.current) {
          if (nextLives < previousLivesRef.current) {
            setLostLifeIndex(Math.max(0, previousLivesRef.current - 1));
            setLivesBump((value) => value + 1);
          }
          previousLivesRef.current = nextLives;
          setLives(nextLives);
        }

        const nextPhaseTimer = quantizeTimer(next.phaseTimer);
        if (nextPhaseTimer !== previousPhaseTimerRef.current) {
          previousPhaseTimerRef.current = nextPhaseTimer;
          setPhaseTimer(nextPhaseTimer);
        }

        const nextFocusTimer = quantizeTimer(next.focusTimer);
        if (nextFocusTimer !== previousFocusTimerRef.current) {
          previousFocusTimerRef.current = nextFocusTimer;
          setFocusTimer(nextFocusTimer);
        }

        const nextNovaWaveTimer = quantizeTimer(next.novaWave ? Math.max(0, next.novaWave.duration - next.novaWave.age) : 0);
        if (nextNovaWaveTimer !== previousNovaWaveTimerRef.current) {
          previousNovaWaveTimerRef.current = nextNovaWaveTimer;
          setNovaWaveTimer(nextNovaWaveTimer);
        }

        const nextMultiplierTimer = quantizeTimer(next.multiplierTimer);
        if (nextMultiplierTimer !== previousMultiplierTimerRef.current) {
          previousMultiplierTimerRef.current = nextMultiplierTimer;
          setMultiplierTimer(nextMultiplierTimer);
        }

        if (next.lives <= 0) {
          setMode("ended");
        }
      } else if (game.shakeTimer > 0) {
        frameGame = {
          ...game,
          shakeTimer: Math.max(0, game.shakeTimer - dt),
        };
        gameRef.current = frameGame;
      }

      drawGame(ctx, frameGame, mode);
      animationRef.current = shouldContinue ? requestAnimationFrame(frame) : null;
    };

    animationRef.current = requestAnimationFrame(frame);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastFrameRef.current = null;
    };
  }, [mode]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, PLAYER_RADIUS + 4, game.width - PLAYER_RADIUS - 4),
      y: clamp(event.clientY - rect.top, PLAYER_RADIUS + 4, game.height - PLAYER_RADIUS - 4),
    };
  };

  const setPointerTarget = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const game = gameRef.current;
    const point = getCanvasPoint(event);
    if (!game || !point) return;

    game.pointerActive = true;
    game.target = point;
  };

  const stopPointerControl = useCallback(() => {
    pointerStartRef.current = null;
    const game = gameRef.current;
    if (game) {
      game.pointerActive = false;
      game.target = { ...game.player };
    }
  }, []);

  useEffect(() => {
    const stop = () => stopPointerControl();
    const stopWhenHidden = () => {
      if (document.hidden) stopPointerControl();
    };

    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("mouseup", stop);
    window.addEventListener("blur", stop);
    window.addEventListener("contextmenu", stop);
    document.addEventListener("mouseleave", stop);
    document.addEventListener("visibilitychange", stopWhenHidden);

    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("blur", stop);
      window.removeEventListener("contextmenu", stop);
      document.removeEventListener("mouseleave", stop);
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, [stopPointerControl]);

  const renderPowerupIcon = (kind: Signal["kind"], color: string, index: number) => {
    const style = { color, animationDelay: `${index * 140}ms` };

    if (kind === "gain") {
      const starPath = "M0-10 L2.4-3.3 L9.5-3.1 L3.8 1.2 L5.9 8.4 L0 4.2 L-5.9 8.4 L-3.8 1.2 L-9.5-3.1 L-2.4-3.3 Z";
      return (
        <svg className="arcade-powerup-icon h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={style} aria-hidden>
          <path className="arcade-powerup-glow" d={starPath} fill="none" stroke="currentColor" strokeWidth="6.2" strokeLinejoin="round" opacity="0.34" />
          <path d={starPath} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    }

    if (kind === "repair") {
      const shieldPath = "M0-10 C7-8 8-5.5 7 0 C6 5.5 2.8 8.2 0 10 C-2.8 8.2-6 5.5-7 0 C-8-5.5-7-8 0-10 Z";
      return (
        <svg className="arcade-powerup-icon h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={style} aria-hidden>
          <path className="arcade-powerup-glow" d={shieldPath} fill="none" stroke="currentColor" strokeWidth="6.2" strokeLinejoin="round" opacity="0.34" />
          <path d={shieldPath} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    }

    if (kind === "focus") {
      const freezePath = "M-9 0 H9 M-4.5-7.8 L4.5 7.8 M4.5-7.8 L-4.5 7.8";
      return (
        <svg className="arcade-powerup-icon h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={style} aria-hidden>
          <path className="arcade-powerup-glow" d={freezePath} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.34" />
          <path d={freezePath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    }

    if (kind === "bonus") {
      const overdrivePath = "M-7-8 L0 0 L-7 8 M1-8 L8 0 L1 8";
      return (
        <svg className="arcade-powerup-icon h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={style} aria-hidden>
          <path className="arcade-powerup-glow" d={overdrivePath} fill="none" stroke="currentColor" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.34" />
          <path d={overdrivePath} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    const novaRayPath = "M7.5-7.5 L9.8-9.8 M7.5 7.5 L9.8 9.8 M-7.5 7.5 L-9.8 9.8 M-7.5-7.5 L-9.8-9.8";
    return (
      <svg className="arcade-powerup-icon h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={style} aria-hidden>
        <circle className="arcade-powerup-glow" cx="0" cy="0" r="6.5" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.34" />
        <path className="arcade-powerup-glow" d={novaRayPath} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.34" />
        <circle cx="0" cy="0" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d={novaRayPath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  };
  const renderHazardIcon = (kind: Incident["kind"], color: string, index: number) => {
    const style = {
      color,
      borderColor: color,
      backgroundColor: "transparent",
      animationDelay: `${index * 170}ms`,
    };

    if (kind === "drift") {
      return <span className="arcade-hazard-icon h-1 w-5 shrink-0 rounded-full border" style={style} />;
    }

    if (kind === "tracker") {
      return <span className="arcade-hazard-icon size-5 shrink-0 rounded-full border" style={style} />;
    }

    if (kind === "heavy") {
      return (
        <svg className="arcade-hazard-icon-svg h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={{ color, animationDelay: `${index * 170}ms` }} aria-hidden>
          <path d="M0-10 L10 0 L0 10 L-10 0 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    }

    if (kind === "waver") {
      return (
        <svg className="arcade-hazard-icon-svg h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={{ color, animationDelay: `${index * 170}ms` }} aria-hidden>
          <path d="M10 0 L5.4 2.2 L7.1 7.1 L2.2 5.4 L0 10 L-2.2 5.4 L-7.1 7.1 L-5.4 2.2 L-10 0 L-5.4-2.2 L-7.1-7.1 L-2.2-5.4 L0-10 L2.2-5.4 L7.1-7.1 L5.4-2.2 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    }

    if (kind === "splitter") {
      return (
        <svg className="arcade-hazard-icon-svg h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={{ color, animationDelay: `${index * 170}ms` }} aria-hidden>
          <path d="M10 0 L0 7.5 L-10 0 L0-7.5 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    }

    return (
      <svg className="arcade-hazard-icon-svg h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={{ color, animationDelay: `${index * 170}ms` }} aria-hidden>
        <path d="M0-10 L8.7-5 L8.7 5 L0 10 L-8.7 5 L-8.7-5 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="flex h-full max-h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden [@media(max-height:820px)]:gap-3 [@media(max-height:640px)]:gap-2 lg:flex-row">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-cyan-300/45 bg-[#080915] shadow-[0_0_0_1px_rgba(236,72,153,0.2),0_0_44px_rgba(34,211,238,0.16)]">
        <div className="flex items-center justify-between border-b border-cyan-300/20 bg-black/35 px-4 py-3 [@media(max-height:820px)]:py-2">
          <div>
            <h2 className="font-display text-xl font-bold text-cyan-100 [text-shadow:0_0_16px_rgba(34,211,238,0.7)] [@media(max-height:820px)]:text-lg">Star Surge</h2>
            <p className="type-meta mt-0.5 text-xs text-fuchsia-300 [@media(max-height:640px)]:hidden">dash, dodge, collect</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={mode === "running" ? "Pause" : "Play"}
              title={mode === "running" ? "Pause" : "Play"}
              onClick={() => {
                if (mode === "ended") {
                  restart();
                  return;
                }
                setMode((current) => (current === "running" ? "paused" : "running"));
              }}
              className="focus-accent grid size-9 place-items-center rounded-md border border-cyan-300/30 bg-cyan-300/5 text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10 [@media(max-height:820px)]:size-8"
            >
              {mode === "running" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              aria-label="Restart"
              title="Restart"
              onClick={restart}
              className="focus-accent grid size-9 place-items-center rounded-md border border-fuchsia-300/30 bg-fuchsia-300/5 text-fuchsia-100 transition hover:border-fuchsia-200 hover:bg-fuchsia-300/10 [@media(max-height:820px)]:size-8"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div ref={containerRef} className="relative min-h-0 flex-1 aspect-square lg:mx-auto lg:h-[clamp(22rem,62dvh,46rem)] lg:w-[clamp(22rem,62dvh,46rem)] [@media(min-height:900px)]:lg:h-[clamp(24rem,64dvh,48rem)] [@media(min-height:900px)]:lg:w-[clamp(24rem,64dvh,48rem)] lg:flex-none">
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none"
            onPointerDown={(event) => {
              if (event.pointerType !== "touch" && event.button !== 0) {
                event.preventDefault();
                stopPointerControl();
                return;
              }

              event.currentTarget.setPointerCapture(event.pointerId);
              if (mode === "ready" || mode === "ended") restart();
              stopPointerControl();
              pointerStartRef.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                dragging: false,
              };
            }}
            onPointerMove={(event) => {
              const start = pointerStartRef.current;
              if (!start || start.id !== event.pointerId) return;

              if (event.pointerType !== "touch" && event.buttons !== 1) {
                stopPointerControl();
                return;
              }

              const hasDragged = Math.hypot(event.clientX - start.x, event.clientY - start.y) >= POINTER_DRAG_THRESHOLD;
              if (start.dragging || hasDragged) {
                start.dragging = true;
                setPointerTarget(event);
              }
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              stopPointerControl();
            }}
            onPointerCancel={() => {
              stopPointerControl();
            }}
            onLostPointerCapture={stopPointerControl}
            onContextMenu={(event) => {
              event.preventDefault();
              stopPointerControl();
            }}
          />
        </div>
      </section>

      <aside className="flex h-full max-h-full min-h-0 flex-col gap-3 overflow-hidden [@media(max-height:820px)]:gap-2 lg:w-64">
        <div className="arcade-panel rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)] [@media(max-height:820px)]:p-3">
          <div className="type-meta text-xs text-cyan-300/80">Score</div>
          <div key={scoreBump} className="arcade-score arcade-score-bump font-display mt-1 text-4xl font-bold [@media(max-height:820px)]:text-3xl">{score}</div>
          <div className={`mt-3 h-1.5 overflow-hidden rounded-full bg-white/10 [@media(max-height:820px)]:mt-2 ${isMaxCombo ? "arcade-combo-meter--max" : ""}`}>
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-100 ${comboMultiplier > BASE_COMBO_MULTIPLIER ? "arcade-combo-bar--live" : ""} ${isMaxCombo ? "arcade-combo-bar--max" : ""}`}
              style={{
                width: `${comboMultiplier > BASE_COMBO_MULTIPLIER ? clamp((comboTimer / COMBO_DURATION) * 100, 0, 100) : 0}%`,
                backgroundColor: comboColor,
                backgroundImage: isMaxCombo
                  ? "linear-gradient(90deg, #22d3ee, #f8fafc 42%, #c084fc 70%, #f8fafc)"
                  : comboMultiplier > BASE_COMBO_MULTIPLIER
                    ? `linear-gradient(90deg, ${comboColor}, rgba(255,255,255,0.72), ${comboColor})`
                    : undefined,
                boxShadow: isMaxCombo
                  ? "0 0 18px rgb(248 250 252 / 0.95), 0 0 34px rgb(34 211 238 / 0.7), 0 0 58px rgb(192 132 252 / 0.45)"
                  : comboMultiplier > BASE_COMBO_MULTIPLIER
                    ? `0 0 ${10 + comboHeat * 14}px ${comboColor}`
                    : undefined,
                "--combo-color": comboColor,
                "--combo-heat": comboHeat,
              } as CSSProperties}
            />
          </div>
        </div>
        <div className="arcade-panel rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)] [@media(max-height:820px)]:p-3">
          <div className="type-meta text-xs text-cyan-300/80">Lives</div>
          <div className="mt-3 flex gap-2 [@media(max-height:820px)]:mt-2">
            {LIFE_INDICES.map((index) => {
              const active = index < lives;
              const justLost = index === lostLifeIndex && !active;

              return (
                <svg
                  key={`${index}-${justLost ? livesBump : "life"}`}
                  viewBox="0 0 24 24"
                  className={`arcade-life-icon ${active ? "arcade-life-icon--on" : "arcade-life-icon--off"} ${justLost ? "arcade-life-icon--lost" : ""}`}
                  aria-label={active ? "Life remaining" : "Life lost"}
                  role="img"
                >
                  <path d="M12 3.6 20.7 20.4 3.3 20.4Z" />
                </svg>
              );
            })}
          </div>
        </div>
        <div className="arcade-panel rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)] [@media(max-height:820px)]:p-3">
          <div className="type-meta text-xs text-cyan-300/80">Active</div>
          <div className="mt-3 flex flex-wrap gap-2 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:gap-1.5">
            {renderActiveChip("Shield", phaseTimer, PHASE_DURATION, signalStyles.repair.color)}
            {renderActiveChip("Freeze", focusTimer, FREEZE_DURATION, signalStyles.focus.color)}
            {renderActiveChip("Nova", novaWaveTimer, NOVA_WAVE_DURATION, signalStyles.clear.color)}
            {renderActiveChip("2x", multiplierTimer, OVERDRIVE_DURATION, signalStyles.bonus.color)}
          </div>
        </div>
        <details open className="arcade-guide-panel arcade-panel min-h-0 overflow-hidden rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)] [@media(max-height:820px)]:p-3">
          <summary className="type-meta cursor-pointer select-none text-xs text-cyan-300/80">Guide</summary>
          <div className="arcade-guide-content mt-4 space-y-5 [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:space-y-4">
            <div>
              <div className="type-meta text-xs text-cyan-300/60">Powerups</div>
              <div className="mt-3 space-y-3 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:space-y-2">
                {POWERUP_ENTRIES.map(([kind, signal], index) => (
                  <div key={kind} className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                      {renderPowerupIcon(kind, signal.color, index)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">{signal.label}</div>
                      <div className="type-meta text-[0.68rem] text-cyan-300/60">{signal.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="type-meta text-xs text-cyan-300/60">Hazards</div>
              <div className="mt-3 space-y-2.5 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:space-y-2">
                {HAZARD_ENTRIES.map(([kind, incident], index) => (
                  <div key={kind} className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                      {renderHazardIcon(kind, incident.color, index)}
                    </span>
                    <div>
                      <div className="text-[0.82rem] font-semibold leading-tight text-zinc-100">{incident.label}</div>
                      <div className="type-meta text-[0.68rem] text-cyan-300/60">{incident.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      </aside>
    </div>
  );
}
