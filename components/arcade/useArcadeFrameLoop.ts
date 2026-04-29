import { Dispatch, MutableRefObject, SetStateAction, useEffect } from "react";
import { updateGame } from "./engine";
import { clamp, GameMode, GameState, lerpAngle } from "./core";
import { drawGame } from "./renderer";

const SIMULATION_STEP = 1 / 60;
const MAX_FRAME_DT = 0.05;
const MAX_CATCH_UP_STEPS = 4;

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function extrapolate(from: number, to: number, amount: number, maxLead = Number.POSITIVE_INFINITY) {
  const lead = clamp((to - from) * amount, -maxLead, maxLead);
  return to + lead;
}

function cloneRenderState(game: GameState): GameState {
  return {
    ...game,
    player: { ...game.player },
    target: { ...game.target },
    dashVector: { ...game.dashVector },
    signals: game.signals.map((signal) => ({ ...signal })),
    incidents: game.incidents.map((incident) => ({
      ...incident,
      velocity: { ...incident.velocity },
    })),
    floatingTexts: game.floatingTexts.map((floatingText) => ({ ...floatingText })),
    novaWave: game.novaWave ? { ...game.novaWave } : null,
  };
}

function createSmoothedRenderState(previous: GameState, current: GameState, alpha: number): GameState {
  const predictiveAlpha = Math.min(0.9, alpha);

  return {
    ...current,
    elapsed: extrapolate(previous.elapsed, current.elapsed, predictiveAlpha, SIMULATION_STEP),
    playerAngle: lerpAngle(previous.playerAngle, current.playerAngle, 1 + predictiveAlpha * 0.6),
    shakeTimer: lerp(previous.shakeTimer, current.shakeTimer, alpha),
    phaseTimer: lerp(previous.phaseTimer, current.phaseTimer, alpha),
    focusTimer: lerp(previous.focusTimer, current.focusTimer, alpha),
    purgeSlowTimer: lerp(previous.purgeSlowTimer, current.purgeSlowTimer, alpha),
    multiplierTimer: lerp(previous.multiplierTimer, current.multiplierTimer, alpha),
    dashCooldown: lerp(previous.dashCooldown, current.dashCooldown, alpha),
    dashTimer: lerp(previous.dashTimer, current.dashTimer, alpha),
    invulnerableTimer: lerp(previous.invulnerableTimer, current.invulnerableTimer, alpha),
    player: {
      x: extrapolate(previous.player.x, current.player.x, predictiveAlpha, 10),
      y: extrapolate(previous.player.y, current.player.y, predictiveAlpha, 10),
    },
    target: {
      x: extrapolate(previous.target.x, current.target.x, predictiveAlpha, 10),
      y: extrapolate(previous.target.y, current.target.y, predictiveAlpha, 10),
    },
    dashVector: {
      x: lerp(previous.dashVector.x, current.dashVector.x, alpha),
      y: lerp(previous.dashVector.y, current.dashVector.y, alpha),
    },
    signals:
      previous.signals.length === current.signals.length
        ? current.signals.map((signal, index) => {
            const previousSignal = previous.signals[index];
            return previousSignal && previousSignal.kind === signal.kind
              ? {
                  ...signal,
                  x: extrapolate(previousSignal.x, signal.x, predictiveAlpha, 8),
                  y: extrapolate(previousSignal.y, signal.y, predictiveAlpha, 8),
                }
              : signal;
          })
        : current.signals,
    incidents:
      previous.incidents.length === current.incidents.length
        ? current.incidents.map((incident, index) => {
            const previousIncident = previous.incidents[index];
            return previousIncident && previousIncident.kind === incident.kind
              ? {
                  ...incident,
                  x: extrapolate(previousIncident.x, incident.x, predictiveAlpha, 16),
                  y: extrapolate(previousIncident.y, incident.y, predictiveAlpha, 16),
                  spin: extrapolate(previousIncident.spin, incident.spin, predictiveAlpha, 0.18),
                  age: extrapolate(previousIncident.age, incident.age, predictiveAlpha, SIMULATION_STEP),
                }
              : incident;
          })
        : current.incidents,
    floatingTexts:
      previous.floatingTexts.length === current.floatingTexts.length
        ? current.floatingTexts.map((floatingText, index) => {
            const previousText = previous.floatingTexts[index];
            return previousText && previousText.text === floatingText.text
              ? {
                  ...floatingText,
                  x: extrapolate(previousText.x, floatingText.x, predictiveAlpha, 12),
                  y: extrapolate(previousText.y, floatingText.y, predictiveAlpha, 12),
                  age: extrapolate(previousText.age, floatingText.age, predictiveAlpha, SIMULATION_STEP),
                }
              : floatingText;
          })
        : current.floatingTexts,
    novaWave:
      previous.novaWave && current.novaWave
        ? {
            ...current.novaWave,
            x: extrapolate(previous.novaWave.x, current.novaWave.x, predictiveAlpha, 12),
            y: extrapolate(previous.novaWave.y, current.novaWave.y, predictiveAlpha, 12),
            age: extrapolate(previous.novaWave.age, current.novaWave.age, predictiveAlpha, SIMULATION_STEP),
            radius: extrapolate(previous.novaWave.radius, current.novaWave.radius, predictiveAlpha, 18),
          }
        : current.novaWave,
  };
}

type UseArcadeFrameLoopArgs = {
  mode: GameMode;
  modeRef: MutableRefObject<GameMode>;
  setMode: Dispatch<SetStateAction<GameMode>>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  ctxRef: MutableRefObject<CanvasRenderingContext2D | null>;
  gameRef: MutableRefObject<GameState | null>;
  keysRef: MutableRefObject<Set<string>>;
  dashQueuedRef: MutableRefObject<boolean>;
  animationRef: MutableRefObject<number | null>;
  lastFrameRef: MutableRefObject<number | null>;
  syncHudFromGame: (next: GameState) => void;
};

export function useArcadeFrameLoop({
  mode,
  modeRef,
  setMode,
  canvasRef,
  ctxRef,
  gameRef,
  keysRef,
  dashQueuedRef,
  animationRef,
  lastFrameRef,
  syncHudFromGame,
}: UseArcadeFrameLoopArgs) {
  useEffect(() => {
    let accumulator = 0;
    let previousRenderState: GameState | null = null;

    const frame = (time: number) => {
      const canvas = canvasRef.current;
      const game = gameRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx || !game) {
        animationRef.current = requestAnimationFrame(frame);
        return;
      }

      const last = lastFrameRef.current ?? time;
      const dt = Math.min(MAX_FRAME_DT, Math.max(0, (time - last) / 1000));
      lastFrameRef.current = time;

      let frameGame = game;
      const currentMode = modeRef.current;
      const shouldContinue = currentMode === "running" || game.shakeTimer > 0;
      if (currentMode === "running") {
        accumulator = Math.min(accumulator + dt, SIMULATION_STEP * MAX_CATCH_UP_STEPS);

        const dashRequested = dashQueuedRef.current;
        let dashConsumed = false;
        let steps = 0;

        while (accumulator >= SIMULATION_STEP && steps < MAX_CATCH_UP_STEPS) {
          previousRenderState = cloneRenderState(gameRef.current ?? frameGame);
          const next = updateGame(gameRef.current ?? frameGame, SIMULATION_STEP, keysRef.current, dashRequested && !dashConsumed);
          gameRef.current = next;
          frameGame = next;
          dashConsumed = dashConsumed || dashRequested;
          accumulator -= SIMULATION_STEP;
          steps += 1;

          if (next.lives <= 0) {
            modeRef.current = "ended";
            setMode("ended");
            accumulator = 0;
            break;
          }
        }

        if (dashConsumed) {
          dashQueuedRef.current = false;
        }

        syncHudFromGame(frameGame);
      } else {
        accumulator = 0;
        previousRenderState = null;
        if (dashQueuedRef.current) {
          dashQueuedRef.current = false;
        }
      }

      if (modeRef.current !== "running" && game.shakeTimer > 0) {
        frameGame = {
          ...game,
          shakeTimer: Math.max(0, game.shakeTimer - dt),
        };
        gameRef.current = frameGame;
      }

      const interpolationAlpha = SIMULATION_STEP > 0 ? accumulator / SIMULATION_STEP : 0;
      const renderedGame =
        modeRef.current === "running" && previousRenderState
          ? createSmoothedRenderState(previousRenderState, frameGame, interpolationAlpha)
          : frameGame;

      drawGame(ctx, renderedGame, modeRef.current);
      animationRef.current = shouldContinue ? requestAnimationFrame(frame) : null;
    };

    animationRef.current = requestAnimationFrame(frame);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastFrameRef.current = null;
    };
  }, [animationRef, canvasRef, ctxRef, dashQueuedRef, gameRef, keysRef, lastFrameRef, mode, modeRef, setMode, syncHudFromGame]);
}
