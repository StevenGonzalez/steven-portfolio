import {
  BASE_COMBO_MULTIPLIER,
  COMBO_DECAY_STEP,
  COMBO_DURATION,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_INVULNERABLE_DURATION,
  DASH_SPEED,
  FREEZE_DURATION,
  FloatingText,
  GameState,
  HIT_INVULNERABLE_DURATION,
  Incident,
  KEYBOARD_SPEED,
  MAX_COMBO_MULTIPLIER,
  NOVA_CLEAR_SCORE,
  NOVA_SLOW_DURATION,
  NovaWave,
  OVERDRIVE_DURATION,
  OVERDRIVE_SPEED_MULTIPLIER,
  PHASE_DURATION,
  PLAYER_RADIUS,
  POINTER_SPEED,
  SENTINEL_PULL_RADIUS_PADDING,
  SENTINEL_PULL_SPEED,
  clamp,
  createFloatingText,
  createIncident,
  createNovaWave,
  createPowerupSignal,
  createSignal,
  distanceSquared,
  getComboColor,
  getComboGain,
  getIncidentCap,
  getIncidentCollisionRadius,
  getIncidentSpawnDelay,
  isWithinDistance,
  lerpAngle,
  signalStyles,
} from "./core";

export function updateGame(game: GameState, dt: number, keys: Set<string>, dashRequested: boolean): GameState {
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
