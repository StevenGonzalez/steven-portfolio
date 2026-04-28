export type GameMode = "ready" | "running" | "paused" | "ended";

export type Vector = {
  x: number;
  y: number;
};

export type Signal = Vector & {
  kind: "gain" | "repair" | "focus" | "bonus" | "clear";
  radius: number;
  pulse: number;
};

export type Incident = Vector & {
  kind: "drift" | "tracker" | "heavy" | "waver" | "splitter" | "sentinel";
  radius: number;
  velocity: Vector;
  spin: number;
  age: number;
};

export type NovaWave = Vector & {
  age: number;
  duration: number;
  radius: number;
  maxRadius: number;
};

export type FloatingText = Vector & {
  text: string;
  color: string;
  surge: boolean;
  age: number;
  duration: number;
};

export type GameState = {
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

export const PLAYER_RADIUS = 14;
export const KEYBOARD_SPEED = 260;
export const POINTER_SPEED = 220;
export const POINTER_DRAG_THRESHOLD = 8;
export const DASH_SPEED = 780;
export const DASH_DURATION = 0.16;
export const DASH_COOLDOWN = 1.35;
export const DASH_INVULNERABLE_DURATION = 0.22;
export const HIT_INVULNERABLE_DURATION = 1.8;
export const INITIAL_LIVES = 3;
export const MAX_INCIDENTS = 14;
export const SENTINEL_PULL_RADIUS_PADDING = 150;
export const SENTINEL_PULL_SPEED = 230;
export const SURGE_CYCLE_DURATION = 34;
export const SURGE_PHASE_START = 18;
export const RECOVERY_PHASE_START = 26;
export const PHASE_DURATION = 6;
export const FREEZE_DURATION = 7.5;
export const NOVA_SLOW_DURATION = 3.5;
export const NOVA_WAVE_DURATION = 1.1;
export const FLOATING_TEXT_DURATION = 0.9;
export const OVERDRIVE_DURATION = 10.5;
export const OVERDRIVE_SPEED_MULTIPLIER = 1.25;
export const COMBO_DURATION = 4.2;
export const BASE_COMBO_MULTIPLIER = 1;
export const COMBO_DECAY_STEP = 0.2;
export const MAX_COMBO_MULTIPLIER = 3;
export const COMBO_COLORS = ["#67e8f9", "#38bdf8", "#a78bfa", "#f97316", "#f8fafc"] as const;
export const NOVA_CLEAR_SCORE: Record<Incident["kind"], number> = {
  drift: 30,
  tracker: 40,
  heavy: 55,
  waver: 65,
  splitter: 75,
  sentinel: 90,
};
export const TIMER_UI_STEP = 0.1;
export const DASH_COLOR = "#22d3ee";
export const PLAYER_BASE_COLOR = "#2f7f8e";
export const PLAYER_READY_COLOR = "#67e8f9";
export const SHIP_POINTS = [
  { x: PLAYER_RADIUS * 1.05, y: 0 },
  { x: -PLAYER_RADIUS * 0.72, y: PLAYER_RADIUS * 0.72 },
  { x: -PLAYER_RADIUS * 0.72, y: -PLAYER_RADIUS * 0.72 },
  { x: PLAYER_RADIUS * 1.05, y: 0 },
] as const;
export const DASH_SHIP_SCALE = 1.08;
export const DASH_SHIP_POINTS = SHIP_POINTS.map((point) => ({
  x: point.x * DASH_SHIP_SCALE,
  y: point.y * DASH_SHIP_SCALE,
}));
export const DASH_EDGE_LENGTHS = DASH_SHIP_POINTS.slice(0, -1).map((point, index) => {
  const next = DASH_SHIP_POINTS[index + 1];
  return Math.hypot(point.x - next.x, point.y - next.y);
});
export const DASH_PERIMETER = DASH_EDGE_LENGTHS.reduce((total, length) => total + length, 0);
export const LIFE_INDICES = Array.from({ length: INITIAL_LIVES }, (_, index) => index);

export const signalStyles = {
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
export const POWERUP_ENTRIES = Object.entries(signalStyles) as Array<[Signal["kind"], (typeof signalStyles)[Signal["kind"]]]>;

export const incidentStyles = {
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
export const HAZARD_ENTRIES = Object.entries(incidentStyles) as Array<[Incident["kind"], (typeof incidentStyles)[Incident["kind"]]]>;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function distanceSquared(a: Vector, b: Vector) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function isWithinDistance(a: Vector, b: Vector, radius: number) {
  return distanceSquared(a, b) < radius * radius;
}

export function lerpAngle(from: number, to: number, amount: number) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * amount;
}

export function quantizeTimer(value: number) {
  return value <= 0 ? 0 : Math.ceil(value / TIMER_UI_STEP) / (1 / TIMER_UI_STEP);
}

export function getComboGain(multiplier: number) {
  const heat = clamp((multiplier - BASE_COMBO_MULTIPLIER) / (MAX_COMBO_MULTIPLIER - BASE_COMBO_MULTIPLIER), 0, 1);
  return clamp(0.24 * (1 - heat) ** 1.55 + 0.04, 0.05, 0.24);
}

export function getComboColor(heat: number) {
  const index = Math.min(COMBO_COLORS.length - 1, Math.floor(heat * COMBO_COLORS.length));
  return COMBO_COLORS[index];
}

export function getSurgePhase(elapsed: number) {
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

export function getIncidentCap(elapsed: number) {
  return Math.min(MAX_INCIDENTS, 6 + Math.floor(elapsed / 22));
}

export function getIncidentSpawnDelay(elapsed: number) {
  const surge = getSurgePhase(elapsed);
  const cyclePressure = Math.min(0.18, surge.cycle * 0.03);
  return clamp(0.86 - cyclePressure + surge.spawnOffset, 0.46, 1.05);
}

export function getIncidentCollisionRadius(incident: Incident) {
  if (incident.kind === "sentinel") {
    const pulseTime = incident.age % 2.15;
    if (pulseTime > 0.95) return incident.radius;
    return incident.radius + (1 - (1 - pulseTime / 0.95) ** 2) * 54;
  }
  return incident.radius;
}

export function createFloatingText(x: number, y: number, text: string, color: string, surge = false): FloatingText {
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

export function createNovaWave(origin: Vector, width: number, height: number): NovaWave {
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

export function createSignal(width: number, height: number, kind: Signal["kind"]): Signal {
  return {
    kind,
    x: 48 + Math.random() * Math.max(1, width - 96),
    y: 48 + Math.random() * Math.max(1, height - 96),
    radius: kind === "gain" ? 12 + Math.random() * 3 : 14 + Math.random() * 4,
    pulse: Math.random() * Math.PI * 2,
  };
}

export function createPowerupSignal(width: number, height: number): Signal {
  const roll = Math.random();
  const kind: Signal["kind"] = roll < 0.42 ? "repair" : roll < 0.67 ? "focus" : roll < 0.88 ? "clear" : "bonus";

  return createSignal(width, height, kind);
}

export function getIncidentWeights(elapsed: number): Array<[Incident["kind"], number]> {
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

export function getIncidentKindLimit(kind: Incident["kind"], elapsed: number) {
  if (kind === "sentinel") return elapsed > 130 ? 2 : 1;
  if (kind === "tracker") return 2;
  if (kind === "drift") return elapsed > 155 ? 2 : 5;
  return MAX_INCIDENTS;
}

export function chooseIncidentKind(elapsed: number, activeIncidents: Incident[]): Incident["kind"] {
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

export function createIncident(width: number, height: number, elapsed: number, activeIncidents: Incident[]): Incident {
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

export function createGameState(width: number, height: number): GameState {
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
