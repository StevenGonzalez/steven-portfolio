import {
  DASH_COLOR,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_EDGE_LENGTHS,
  DASH_PERIMETER,
  DASH_SHIP_POINTS,
  GameMode,
  GameState,
  HIT_INVULNERABLE_DURATION,
  PLAYER_BASE_COLOR,
  PLAYER_RADIUS,
  PLAYER_READY_COLOR,
  SHIP_POINTS,
  Signal,
  clamp,
  getIncidentCollisionRadius,
  incidentStyles,
  signalStyles,
} from "./core";

export function drawSignalIcon(ctx: CanvasRenderingContext2D, kind: Signal["kind"], radius: number) {
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

export function drawGame(ctx: CanvasRenderingContext2D, game: GameState, mode: GameMode) {
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

