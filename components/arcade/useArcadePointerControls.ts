import { Dispatch, MutableRefObject, PointerEvent as ReactPointerEvent, SetStateAction, useCallback, useEffect, useRef } from "react";
import { GameMode, GameState, PLAYER_RADIUS, POINTER_DRAG_THRESHOLD, clamp } from "./core";

type PointerStart = {
  id: number;
  x: number;
  y: number;
  dragging: boolean;
};

type UseArcadePointerControlsArgs = {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  gameRef: MutableRefObject<GameState | null>;
  mode: GameMode;
  setMode: Dispatch<SetStateAction<GameMode>>;
  restart: () => void;
};

export function useArcadePointerControls({ canvasRef, gameRef, mode, setMode, restart }: UseArcadePointerControlsArgs) {
  const pointerStartRef = useRef<PointerStart | null>(null);

  const getCanvasPoint = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const game = gameRef.current;
      if (!canvas || !game) return null;

      const rect = canvas.getBoundingClientRect();
      return {
        x: clamp(event.clientX - rect.left, PLAYER_RADIUS + 4, game.width - PLAYER_RADIUS - 4),
        y: clamp(event.clientY - rect.top, PLAYER_RADIUS + 4, game.height - PLAYER_RADIUS - 4),
      };
    },
    [canvasRef, gameRef],
  );

  const setPointerTarget = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const game = gameRef.current;
      const point = getCanvasPoint(event);
      if (!game || !point) return;

      game.pointerActive = true;
      game.target = point;
    },
    [gameRef, getCanvasPoint],
  );

  const stopPointerControl = useCallback(() => {
    pointerStartRef.current = null;
    const game = gameRef.current;
    if (game) {
      game.pointerActive = false;
      game.target = { ...game.player };
    }
  }, [gameRef]);

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

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType !== "touch" && event.button !== 0) {
        event.preventDefault();
        stopPointerControl();
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      if (mode === "ready" || mode === "ended") {
        restart();
      } else if (mode === "paused") {
        setMode("running");
      }
      stopPointerControl();
      pointerStartRef.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        dragging: false,
      };
    },
    [mode, restart, setMode, stopPointerControl],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
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
    },
    [setPointerTarget, stopPointerControl],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      stopPointerControl();
    },
    [stopPointerControl],
  );

  const onPointerCancel = useCallback(() => {
    stopPointerControl();
  }, [stopPointerControl]);

  const onContextMenu = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      stopPointerControl();
    },
    [stopPointerControl],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture: stopPointerControl,
    onContextMenu,
  };
}
