import { useCallback, useRef, useState } from "react";
import {
  BASE_COMBO_MULTIPLIER,
  GameState,
  INITIAL_LIVES,
  quantizeTimer,
} from "./core";

type ArcadeHudState = {
  score: number;
  combo: number;
  comboTimer: number;
  lives: number;
  phaseTimer: number;
  focusTimer: number;
  novaWaveTimer: number;
  multiplierTimer: number;
  scoreBump: number;
  livesBump: number;
  lostLifeIndex: number | null;
};

export function useArcadeHudState() {
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

  const resetHud = useCallback(() => {
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
    setScoreBump(0);
    setLivesBump(0);
    setLostLifeIndex(null);
    setLives(INITIAL_LIVES);
    setPhaseTimer(0);
    setFocusTimer(0);
    setNovaWaveTimer(0);
    setMultiplierTimer(0);
  }, []);

  const syncHudFromGame = useCallback((next: GameState) => {
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
  }, []);

  const hud: ArcadeHudState = {
    score,
    combo,
    comboTimer,
    lives,
    phaseTimer,
    focusTimer,
    novaWaveTimer,
    multiplierTimer,
    scoreBump,
    livesBump,
    lostLifeIndex,
  };

  return {
    hud,
    resetHud,
    syncHudFromGame,
  };
}
