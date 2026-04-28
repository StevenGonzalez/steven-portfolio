import { Dispatch, MutableRefObject, SetStateAction, useEffect } from "react";
import { updateGame } from "./engine";
import { GameMode, GameState } from "./core";
import { drawGame } from "./renderer";

type UseArcadeFrameLoopArgs = {
  mode: GameMode;
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
        syncHudFromGame(next);

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
  }, [animationRef, canvasRef, ctxRef, dashQueuedRef, gameRef, keysRef, lastFrameRef, mode, setMode, syncHudFromGame]);
}
