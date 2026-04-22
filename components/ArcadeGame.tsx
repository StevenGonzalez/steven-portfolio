"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  kind: "drift" | "tracker" | "heavy";
  radius: number;
  velocity: Vector;
  spin: number;
};

type NovaWave = Vector & {
  age: number;
  duration: number;
  radius: number;
  maxRadius: number;
};

type GameState = {
  player: Vector;
  target: Vector;
  pointerActive: boolean;
  playerAngle: number;
  signals: Signal[];
  incidents: Incident[];
  novaWave: NovaWave | null;
  score: number;
  stability: number;
  focusTimer: number;
  purgeSlowTimer: number;
  multiplierTimer: number;
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
const INITIAL_STABILITY = 100;
const MAX_INCIDENTS = 15;
const HAZARD_COLOR = "#f43f5e";
const FREEZE_DURATION = 4.8;
const NOVA_SLOW_DURATION = 1.5;
const NOVA_WAVE_DURATION = 0.9;
const OVERDRIVE_DURATION = 5.5;
const HAZARD_DAMAGE: Record<Incident["kind"], number> = {
  drift: 18,
  tracker: 24,
  heavy: 36,
};

const TIMER_UI_STEP = 0.1;

const signalStyles = {
  gain: {
    label: "Star",
    description: "+100 score",
    color: "#f8fafc",
  },
  repair: {
    label: "Shield",
    description: "+30 shield",
    color: "#22c55e",
  },
  focus: {
    label: "Freeze",
    description: "slows hazards",
    color: "#38bdf8",
  },
  bonus: {
    label: "Overdrive",
    description: "double score",
    color: "#14b8a6",
  },
  clear: {
    label: "Nova",
    description: "clears hazards",
    color: "#8b5cf6",
  },
} satisfies Record<Signal["kind"], { label: string; description: string; color: string }>;

const incidentStyles = {
  drift: {
    label: "Laser",
    description: "straight",
    color: HAZARD_COLOR,
  },
  tracker: {
    label: "Orb",
    description: "turns",
    color: HAZARD_COLOR,
  },
  heavy: {
    label: "Crusher",
    description: "slow",
    color: HAZARD_COLOR,
  },
} satisfies Record<Incident["kind"], { label: string; description: string; color: string }>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: Vector, b: Vector) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerpAngle(from: number, to: number, amount: number) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * amount;
}

function quantizeTimer(value: number) {
  return value <= 0 ? 0 : Math.ceil(value / TIMER_UI_STEP) / (1 / TIMER_UI_STEP);
}

function createNovaWave(origin: Vector, width: number, height: number): NovaWave {
  const maxRadius = Math.max(
    distance(origin, { x: 0, y: 0 }),
    distance(origin, { x: width, y: 0 }),
    distance(origin, { x: width, y: height }),
    distance(origin, { x: 0, y: height }),
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

function createSignal(width: number, height: number): Signal {
  const roll = Math.random();
  const kind: Signal["kind"] =
    roll < 0.84 ? "gain" : roll < 0.9 ? "repair" : roll < 0.95 ? "focus" : roll < 0.985 ? "clear" : "bonus";

  return {
    kind,
    x: 48 + Math.random() * Math.max(1, width - 96),
    y: 48 + Math.random() * Math.max(1, height - 96),
    radius: 9 + Math.random() * 4,
    pulse: Math.random() * Math.PI * 2,
  };
}

function createIncident(width: number, height: number, elapsed: number): Incident {
  const side = Math.floor(Math.random() * 4);
  const roll = Math.random();
  const kind: Incident["kind"] = roll < 0.62 ? "drift" : roll < 0.84 ? "tracker" : "heavy";
  const baseSpeed = kind === "heavy" ? 66 : kind === "tracker" ? 96 : 132;
  const speed = baseSpeed + Math.min(170, elapsed * 4) + Math.random() * 44;
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
    radius: kind === "heavy" ? 22 + Math.random() * 8 : kind === "tracker" ? 13 + Math.random() * 5 : 10 + Math.random() * 9,
    velocity,
    spin: (Math.random() - 0.5) * (kind === "heavy" ? 2 : 5),
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
    score: 0,
    stability: INITIAL_STABILITY,
    focusTimer: 0,
    purgeSlowTimer: 0,
    multiplierTimer: 0,
    shakeTimer: 0,
    elapsed: 0,
    spawnTimer: 0.38,
    signalTimer: 0.95,
    width,
    height,
  };
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
  for (let x = (game.elapsed * 12) % grid; x < width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = (game.elapsed * 8) % grid; y < height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
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
    ctx.save();
    ctx.globalAlpha = game.focusTimer > 0 ? 0.36 : 0.24;
    ctx.strokeStyle = game.focusTimer > 0 ? signalStyles.focus.color : signalStyles.clear.color;
    ctx.lineWidth = 2;
    const inset = 16;
    const length = 46;
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

  for (const signal of game.signals) {
    const glowPulse = 0.5 + Math.sin(game.elapsed * 5 + signal.pulse) * 0.5;
    const style = signalStyles[signal.kind];
    ctx.save();
    ctx.translate(signal.x, signal.y);
    ctx.shadowBlur = 8 + glowPulse * 8;
    ctx.shadowColor = style.color;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#0e1022";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const incident of game.incidents) {
    ctx.save();
    ctx.translate(incident.x, incident.y);
    const heading = Math.atan2(incident.velocity.y, incident.velocity.x);
    if (incident.kind === "drift") {
      ctx.rotate(heading);
    }
    ctx.strokeStyle = HAZARD_COLOR;
    ctx.fillStyle = "#0e1022";
    ctx.shadowBlur = 9;
    ctx.shadowColor = ctx.strokeStyle;
    if (incident.kind === "tracker") {
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (incident.kind === "heavy") {
      const size = Math.max(22, incident.radius * 0.98);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(-size / 2, -size / 2, size, size);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.lineCap = "round";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-incident.radius * 0.95, 0);
      ctx.lineTo(incident.radius * 0.95, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (game.novaWave) {
    const progress = clamp(game.novaWave.age / game.novaWave.duration, 0, 1);
    const fade = 1 - progress;
    ctx.save();
    ctx.translate(game.novaWave.x, game.novaWave.y);
    ctx.globalAlpha = 0.2 + fade * 0.55;
    ctx.strokeStyle = signalStyles.clear.color;
    ctx.shadowBlur = 24 + fade * 22;
    ctx.shadowColor = signalStyles.clear.color;
    ctx.lineWidth = 2 + fade * 2;
    ctx.beginPath();
    ctx.arc(0, 0, game.novaWave.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.12 * fade;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0, game.novaWave.radius - 8), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(game.player.x, game.player.y);
  ctx.rotate(game.playerAngle);
  ctx.fillStyle = "#050816";
  ctx.strokeStyle = "#67e8f9";
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#67e8f9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PLAYER_RADIUS * 1.05, 0);
  ctx.lineTo(-PLAYER_RADIUS * 0.72, PLAYER_RADIUS * 0.72);
  ctx.lineTo(-PLAYER_RADIUS * 0.72, -PLAYER_RADIUS * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

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
    ctx.fillText("Move with WASD, arrows, or drag", width / 2, height / 2 + 20);
    ctx.restore();
  }

  ctx.restore();
}

function updateGame(game: GameState, dt: number, keys: Set<string>): GameState {
  const previousPlayer = { ...game.player };
  const next: GameState = {
    ...game,
    player: { ...game.player },
    target: { ...game.target },
    pointerActive: game.pointerActive,
    playerAngle: game.playerAngle,
    signals: game.signals.map((signal) => ({ ...signal })),
    incidents: game.incidents.map((incident) => ({ ...incident, velocity: { ...incident.velocity } })),
    novaWave: game.novaWave
      ? {
          ...game.novaWave,
          age: game.novaWave.age + dt,
        }
      : null,
    focusTimer: Math.max(0, game.focusTimer - dt),
    purgeSlowTimer: Math.max(0, game.purgeSlowTimer - dt),
    multiplierTimer: Math.max(0, game.multiplierTimer - dt),
    shakeTimer: Math.max(0, game.shakeTimer - dt),
    elapsed: game.elapsed + dt,
    spawnTimer: game.spawnTimer - dt,
    signalTimer: game.signalTimer - dt,
  };

  const keyVelocity = { x: 0, y: 0 };
  if (keys.has("ArrowLeft") || keys.has("KeyA")) keyVelocity.x -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) keyVelocity.x += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) keyVelocity.y -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) keyVelocity.y += 1;

  if (keyVelocity.x || keyVelocity.y) {
    const length = Math.hypot(keyVelocity.x, keyVelocity.y);
    next.player.x += (keyVelocity.x / length) * KEYBOARD_SPEED * dt;
    next.player.y += (keyVelocity.y / length) * KEYBOARD_SPEED * dt;
    next.target = next.player;
    next.pointerActive = false;
  } else if (next.pointerActive) {
    const toTarget = {
      x: next.target.x - next.player.x,
      y: next.target.y - next.player.y,
    };
    const targetDistance = Math.hypot(toTarget.x, toTarget.y);
    const travel = Math.min(targetDistance, POINTER_SPEED * dt);

    if (targetDistance > 1) {
      next.player.x += (toTarget.x / targetDistance) * travel;
      next.player.y += (toTarget.y / targetDistance) * travel;
    }
  } else {
    next.player.x += (next.target.x - next.player.x) * Math.min(1, dt * 7);
    next.player.y += (next.target.y - next.player.y) * Math.min(1, dt * 7);
  }

  next.player.x = clamp(next.player.x, PLAYER_RADIUS + 4, next.width - PLAYER_RADIUS - 4);
  next.player.y = clamp(next.player.y, PLAYER_RADIUS + 4, next.height - PLAYER_RADIUS - 4);

  const movement = {
    x: next.player.x - previousPlayer.x,
    y: next.player.y - previousPlayer.y,
  };
  if (Math.hypot(movement.x, movement.y) > 0.1) {
    next.playerAngle = lerpAngle(next.playerAngle, Math.atan2(movement.y, movement.x), Math.min(1, dt * 14));
  }

  if (next.spawnTimer <= 0) {
    next.incidents.push(createIncident(next.width, next.height, next.elapsed));
    next.spawnTimer = Math.max(0.23, 0.84 - next.elapsed * 0.0085);
  }

  if (next.signalTimer <= 0 && next.signals.length < 4) {
    next.signals.push(createSignal(next.width, next.height));
    next.signalTimer = 1.2 + Math.random() * 1.05;
  }

  next.incidents = next.incidents
    .map((incident) => {
      const focusScale = next.focusTimer > 0 ? 0.55 : next.purgeSlowTimer > 0 ? 0.78 : 1;
      const updated = { ...incident, velocity: { ...incident.velocity } };

      if (updated.kind === "tracker") {
        const desiredAngle = Math.atan2(next.player.y - updated.y, next.player.x - updated.x);
        const currentSpeed = Math.hypot(updated.velocity.x, updated.velocity.y);
        const desired = {
          x: Math.cos(desiredAngle) * currentSpeed,
          y: Math.sin(desiredAngle) * currentSpeed,
        };
        const turnRate = Math.min(1, dt * 0.82);
        updated.velocity.x += (desired.x - updated.velocity.x) * turnRate;
        updated.velocity.y += (desired.y - updated.velocity.y) * turnRate;
        const steeredSpeed = Math.hypot(updated.velocity.x, updated.velocity.y) || currentSpeed;
        updated.velocity.x = (updated.velocity.x / steeredSpeed) * currentSpeed;
        updated.velocity.y = (updated.velocity.y / steeredSpeed) * currentSpeed;
      }

      return {
        ...updated,
        x: updated.x + updated.velocity.x * dt * focusScale,
        y: updated.y + updated.velocity.y * dt * focusScale,
      };
    })
    .filter((incident) => incident.x > -80 && incident.x < next.width + 80 && incident.y > -80 && incident.y < next.height + 80)
    .slice(-MAX_INCIDENTS);

  if (next.novaWave) {
    const progress = clamp(next.novaWave.age / next.novaWave.duration, 0, 1);
    const easedProgress = 1 - (1 - progress) * (1 - progress);
    next.novaWave.radius = next.novaWave.maxRadius * easedProgress;

    let cleared = 0;
    next.incidents = next.incidents.filter((incident) => {
      const hit = distance(incident, next.novaWave as NovaWave) <= (next.novaWave as NovaWave).radius + incident.radius;
      if (hit) {
        cleared += 1;
      }
      return !hit;
    });

    if (cleared > 0) {
      next.score += cleared * 35 * (next.multiplierTimer > 0 ? 2 : 1);
    }

    if (progress >= 1) {
      next.novaWave = null;
    }
  }

  next.signals = next.signals.filter((signal) => {
    if (distance(signal, next.player) < signal.radius + PLAYER_RADIUS) {
      if (signal.kind === "gain") {
        next.score += 100 * (next.multiplierTimer > 0 ? 2 : 1);
      } else if (signal.kind === "repair") {
        next.stability = clamp(next.stability + 30, 0, INITIAL_STABILITY);
      } else if (signal.kind === "focus") {
        next.score += 75 * (next.multiplierTimer > 0 ? 2 : 1);
        next.focusTimer = FREEZE_DURATION;
      } else if (signal.kind === "clear") {
        next.score += 140 * (next.multiplierTimer > 0 ? 2 : 1);
        next.novaWave = createNovaWave(next.player, next.width, next.height);
        next.purgeSlowTimer = NOVA_SLOW_DURATION;
      } else {
        next.score += 175;
        next.multiplierTimer = OVERDRIVE_DURATION;
      }
      return false;
    }
    return true;
  });

  for (const incident of next.incidents) {
    if (distance(incident, next.player) < incident.radius + PLAYER_RADIUS - 2) {
      next.stability -= HAZARD_DAMAGE[incident.kind];
      next.shakeTimer = 0.22;
      incident.x = -999;
      next.score = Math.max(0, next.score - 70);
    }
  }

  next.stability = clamp(next.stability, 0, INITIAL_STABILITY);
  return next;
}

export default function ArcadeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const keysRef = useRef(new Set<string>());
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const [mode, setMode] = useState<GameMode>("ready");
  const [score, setScore] = useState(0);
  const [stability, setStability] = useState(INITIAL_STABILITY);
  const [focusTimer, setFocusTimer] = useState(0);
  const [novaWaveTimer, setNovaWaveTimer] = useState(0);
  const [multiplierTimer, setMultiplierTimer] = useState(0);
  const [scoreBump, setScoreBump] = useState(0);
  const [shieldBump, setShieldBump] = useState(0);
  const previousScoreRef = useRef(0);
  const previousStabilityRef = useRef(INITIAL_STABILITY);
  const previousFocusTimerRef = useRef(0);
  const previousNovaWaveTimerRef = useRef(0);
  const previousMultiplierTimerRef = useRef(0);

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

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const current = gameRef.current;
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

    drawGame(ctx, gameRef.current, mode);
  }, [mode]);

  const restart = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current ?? canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctxRef.current = ctx;

    gameRef.current = createGameState(canvas.clientWidth, canvas.clientHeight);
    setScore(0);
    previousScoreRef.current = 0;
    previousStabilityRef.current = INITIAL_STABILITY;
    previousFocusTimerRef.current = 0;
    previousNovaWaveTimerRef.current = 0;
    previousMultiplierTimerRef.current = 0;
    setScoreBump(0);
    setShieldBump(0);
    setStability(INITIAL_STABILITY);
    setFocusTimer(0);
    setNovaWaveTimer(0);
    setMultiplierTimer(0);
    setMode("running");
  }, []);

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
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
        event.preventDefault();
      }
      if (event.code === "Space") {
        setMode((current) => (current === "running" ? "paused" : current === "paused" ? "running" : current));
        return;
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
      if (mode === "running") {
        const next = updateGame(game, dt, keysRef.current);
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

        const nextStability = Math.round(next.stability);
        if (nextStability !== previousStabilityRef.current) {
          if (nextStability < previousStabilityRef.current) {
            setShieldBump((value) => value + 1);
          }
          previousStabilityRef.current = nextStability;
          setStability(nextStability);
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

        if (next.stability <= 0) {
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
      animationRef.current = requestAnimationFrame(frame);
    };

    animationRef.current = requestAnimationFrame(frame);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastFrameRef.current = null;
    };
  }, [mode]);

  const setPointerTarget = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game) return;

    const rect = canvas.getBoundingClientRect();
    game.pointerActive = true;
    game.target = {
      x: clamp(event.clientX - rect.left, PLAYER_RADIUS + 4, game.width - PLAYER_RADIUS - 4),
      y: clamp(event.clientY - rect.top, PLAYER_RADIUS + 4, game.height - PLAYER_RADIUS - 4),
    };
  };

  const powerupEntries = Object.entries(signalStyles) as Array<[Signal["kind"], (typeof signalStyles)[Signal["kind"]]]>;
  const hazardEntries = Object.entries(incidentStyles) as Array<[Incident["kind"], (typeof incidentStyles)[Incident["kind"]]]>;

  return (
    <div className="flex h-full max-h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
      <section className="flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-lg border border-cyan-300/45 bg-[#080915] shadow-[0_0_0_1px_rgba(236,72,153,0.2),0_0_44px_rgba(34,211,238,0.16)]">
        <div className="flex items-center justify-between border-b border-cyan-300/20 bg-black/35 px-4 py-3">
          <div>
            <h2 className="font-display text-xl font-bold text-cyan-100 [text-shadow:0_0_16px_rgba(34,211,238,0.7)]">Star Surge</h2>
            <p className="type-meta mt-0.5 text-xs text-fuchsia-300">neon star cabinet</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={mode === "running" ? "Pause" : "Play"}
              title={mode === "running" ? "Pause" : "Play"}
              onClick={() => setMode((current) => (current === "running" ? "paused" : "running"))}
              className="focus-accent grid size-9 place-items-center rounded-md border border-cyan-300/30 bg-cyan-300/5 text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/10"
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
              className="focus-accent grid size-9 place-items-center rounded-md border border-fuchsia-300/30 bg-fuchsia-300/5 text-fuchsia-100 transition hover:border-fuchsia-200 hover:bg-fuchsia-300/10"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div ref={containerRef} className="relative min-h-0 flex-1">
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              if (mode === "ready" || mode === "ended") restart();
              setPointerTarget(event);
            }}
            onPointerMove={(event) => {
              if (event.buttons > 0 || event.pointerType === "touch") {
                setPointerTarget(event);
              }
            }}
            onPointerUp={() => {
              const game = gameRef.current;
              if (game) game.pointerActive = false;
            }}
            onPointerCancel={() => {
              const game = gameRef.current;
              if (game) game.pointerActive = false;
            }}
          />
        </div>
      </section>

      <aside className="flex h-full max-h-full min-h-0 flex-col gap-3 overflow-hidden lg:w-64">
        <div className="arcade-panel rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          <div className="type-meta text-xs text-cyan-300/80">Score</div>
          <div key={scoreBump} className="arcade-score arcade-score-bump font-display mt-1 text-4xl font-bold">{score}</div>
        </div>
        <div className="arcade-panel rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          <div className="type-meta text-xs text-cyan-300/80">Shield</div>
          <div key={shieldBump} className="arcade-shield-bump mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="arcade-shield relative h-full overflow-hidden rounded-full shadow-[0_0_14px_rgba(34,197,94,0.75)] transition-[width]"
              style={{ width: `${stability}%`, backgroundColor: signalStyles.repair.color }}
            >
              <span className="arcade-shield-sweep" />
            </div>
          </div>
          <div className="type-meta mt-2 text-xs text-cyan-300/70">{stability}%</div>
        </div>
        <div className="arcade-panel rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          <div className="type-meta text-xs text-cyan-300/80">Active</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {renderActiveChip("Freeze", focusTimer, FREEZE_DURATION, signalStyles.focus.color)}
            {renderActiveChip("Nova", novaWaveTimer, NOVA_WAVE_DURATION, signalStyles.clear.color)}
            {renderActiveChip("2x", multiplierTimer, OVERDRIVE_DURATION, signalStyles.bonus.color)}
          </div>
        </div>
        <details className="arcade-guide-panel arcade-panel min-h-0 overflow-hidden rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          <summary className="type-meta cursor-pointer select-none text-xs text-cyan-300/80">Guide</summary>
          <div className="arcade-guide-content mt-4 space-y-5">
            <div>
              <div className="type-meta text-xs text-cyan-300/60">Powerups</div>
              <div className="mt-3 space-y-3">
                {powerupEntries.map(([kind, signal], index) => (
                  <div key={kind} className="flex items-start gap-3">
                    <span
                      className="arcade-powerup-icon mt-1 size-4 shrink-0 rounded-full border shadow-[0_0_10px_currentColor]"
                      style={{
                        color: signal.color,
                        borderColor: signal.color,
                        backgroundColor: `${signal.color}22`,
                        animationDelay: `${index * 140}ms`,
                      }}
                    />
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
              <div className="mt-3 space-y-3">
                {hazardEntries.map(([kind, incident], index) => (
                  <div key={kind} className="flex items-start gap-3">
                    <span className="flex h-6 w-5 shrink-0 items-center justify-center">
                      <span
                        className={`arcade-hazard-icon shrink-0 border ${kind === "tracker" ? "size-5 rounded-full" : kind === "heavy" ? "size-6 rounded-sm" : "h-1 w-5 rounded-full"}`}
                        style={{
                          color: incident.color,
                          borderColor: incident.color,
                          backgroundColor: `${incident.color}12`,
                          animationDelay: `${index * 170}ms`,
                        }}
                      />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">{incident.label}</div>
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
