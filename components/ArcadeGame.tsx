"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GlowPanel from "./GlowPanel";
import { ArcadeActiveEffectsPanel } from "./arcade/ArcadeActiveEffectsPanel";
import { ArcadeGuidePanel } from "./arcade/ArcadeGuidePanel";
import { ArcadeLivesPanel } from "./arcade/ArcadeLivesPanel";
import { ArcadeScorePanel } from "./arcade/ArcadeScorePanel";
import { useArcadeCanvas } from "./arcade/useArcadeCanvas";
import { useArcadeFrameLoop } from "./arcade/useArcadeFrameLoop";
import { useArcadeHudState } from "./arcade/useArcadeHudState";
import { useArcadeKeyboardControls } from "./arcade/useArcadeKeyboardControls";
import { useArcadePointerControls } from "./arcade/useArcadePointerControls";
import {
  BASE_COMBO_MULTIPLIER,
  GameMode,
  GameState,
  MAX_COMBO_MULTIPLIER,
  clamp,
  createGameState,
  getComboColor,
} from "./arcade/core";

export default function ArcadeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const keysRef = useRef(new Set<string>());
  const dashQueuedRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const [mode, setMode] = useState<GameMode>("ready");
  const modeRef = useRef<GameMode>("ready");
  const { hud, resetHud, syncHudFromGame } = useArcadeHudState();
  const { score, combo, comboTimer, lives, phaseTimer, focusTimer, novaWaveTimer, multiplierTimer, scoreBump, livesBump, lostLifeIndex } = hud;
  const comboMultiplier = combo;
  const comboHeat = clamp((comboMultiplier - BASE_COMBO_MULTIPLIER) / (MAX_COMBO_MULTIPLIER - BASE_COMBO_MULTIPLIER), 0, 1);
  const comboColor = getComboColor(comboHeat);

  const restart = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current ?? canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctxRef.current = ctx;

    gameRef.current = createGameState(canvas.clientWidth, canvas.clientHeight);
    resetHud();
    dashQueuedRef.current = false;
    modeRef.current = "running";
    setMode("running");
  }, [resetHud]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useArcadeCanvas({
    canvasRef,
    ctxRef,
    containerRef,
    gameRef,
    modeRef,
  });

  useArcadeKeyboardControls({
    setMode,
    modeRef,
    keysRef,
    dashQueuedRef,
  });

  const canvasPointerHandlers = useArcadePointerControls({
    canvasRef,
    gameRef,
    mode,
    setMode,
    restart,
  });

  useArcadeFrameLoop({
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
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden [@media(max-height:820px)]:gap-3 [@media(max-height:640px)]:gap-2 lg:flex-row">
      <GlowPanel className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-cyan-300/45 bg-[#080915] shadow-[0_0_0_1px_rgba(236,72,153,0.2),0_0_44px_rgba(34,211,238,0.16)]">
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
        <div ref={containerRef} className="relative min-h-0 flex-1 w-full">
          <canvas
            ref={canvasRef}
            className="block h-full w-full touch-none"
            onPointerDown={canvasPointerHandlers.onPointerDown}
            onPointerMove={canvasPointerHandlers.onPointerMove}
            onPointerUp={canvasPointerHandlers.onPointerUp}
            onPointerCancel={canvasPointerHandlers.onPointerCancel}
            onLostPointerCapture={canvasPointerHandlers.onLostPointerCapture}
            onContextMenu={canvasPointerHandlers.onContextMenu}
          />
        </div>
      </GlowPanel>

      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain [@media(max-height:820px)]:gap-2 lg:w-60">
        <ArcadeScorePanel score={score} scoreBump={scoreBump} combo={comboMultiplier} comboTimer={comboTimer} comboColor={comboColor} comboHeat={comboHeat} />
        <ArcadeLivesPanel lives={lives} livesBump={livesBump} lostLifeIndex={lostLifeIndex} />
        <ArcadeActiveEffectsPanel phaseTimer={phaseTimer} focusTimer={focusTimer} novaWaveTimer={novaWaveTimer} multiplierTimer={multiplierTimer} />
        <ArcadeGuidePanel />
      </aside>
    </div>
  );
}
