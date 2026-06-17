import { type CSSProperties } from "react";
import GlowPanel from "../GlowPanel";
import { BASE_COMBO_MULTIPLIER, COMBO_DURATION, MAX_COMBO_MULTIPLIER, clamp } from "./core";

type ArcadeScorePanelProps = {
  score: number;
  scoreBump: number;
  combo: number;
  comboTimer: number;
  comboColor: string;
  comboHeat: number;
};

export function ArcadeScorePanel({ score, scoreBump, combo, comboTimer, comboColor, comboHeat }: ArcadeScorePanelProps) {
  const isMaxCombo = combo >= MAX_COMBO_MULTIPLIER;

  return (
    <GlowPanel className="arcade-panel rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)] [@media(max-height:820px)]:p-3">
      <div className="type-meta text-xs text-cyan-300/80">Score</div>
      <div key={scoreBump} className="arcade-score arcade-score-bump font-display mt-1 text-4xl font-bold [@media(max-height:820px)]:text-3xl">{score}</div>
      <div className={`mt-3 h-1.5 overflow-hidden rounded-full bg-white/10 [@media(max-height:820px)]:mt-2 ${isMaxCombo ? "arcade-combo-meter--max" : ""}`}>
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-100 ${combo > BASE_COMBO_MULTIPLIER ? "arcade-combo-bar--live" : ""} ${isMaxCombo ? "arcade-combo-bar--max" : ""}`}
          style={{
            width: `${combo > BASE_COMBO_MULTIPLIER ? clamp((comboTimer / COMBO_DURATION) * 100, 0, 100) : 0}%`,
            backgroundColor: comboColor,
            backgroundImage: isMaxCombo
              ? "linear-gradient(90deg, #22d3ee, #f8fafc 42%, #c084fc 70%, #f8fafc)"
              : combo > BASE_COMBO_MULTIPLIER
                ? `linear-gradient(90deg, ${comboColor}, rgba(255,255,255,0.72), ${comboColor})`
                : undefined,
            boxShadow: isMaxCombo
              ? "0 0 18px rgb(248 250 252 / 0.95), 0 0 34px rgb(34 211 238 / 0.7), 0 0 58px rgb(192 132 252 / 0.45)"
              : combo > BASE_COMBO_MULTIPLIER
                ? `0 0 ${10 + comboHeat * 14}px ${comboColor}`
                : undefined,
            "--combo-color": comboColor,
            "--combo-heat": comboHeat,
          } as CSSProperties}
        />
      </div>
    </GlowPanel>
  );
}
