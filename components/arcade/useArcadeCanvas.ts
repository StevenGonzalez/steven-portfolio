import { MutableRefObject, useCallback, useEffect } from "react";
import { GameMode, GameState, PLAYER_RADIUS, clamp, createGameState, createNovaWave } from "./core";
import { drawGame } from "./renderer";

type UseArcadeCanvasArgs = {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  ctxRef: MutableRefObject<CanvasRenderingContext2D | null>;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  gameRef: MutableRefObject<GameState | null>;
  modeRef: MutableRefObject<GameMode>;
};

export function useArcadeCanvas({ canvasRef, ctxRef, containerRef, gameRef, modeRef }: UseArcadeCanvasArgs) {
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
  }, [canvasRef, containerRef, ctxRef, gameRef, modeRef]);

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
  }, [containerRef, sizeCanvas]);

  return {
    sizeCanvas,
  };
}
