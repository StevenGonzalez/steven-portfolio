import GlowPanel from "../GlowPanel";
import { ActiveChip } from "./ActiveChip";
import { FREEZE_DURATION, NOVA_WAVE_DURATION, OVERDRIVE_DURATION, PHASE_DURATION, signalStyles } from "./core";

type ArcadeActiveEffectsPanelProps = {
  phaseTimer: number;
  focusTimer: number;
  novaWaveTimer: number;
  multiplierTimer: number;
};

export function ArcadeActiveEffectsPanel({ phaseTimer, focusTimer, novaWaveTimer, multiplierTimer }: ArcadeActiveEffectsPanelProps) {
  return (
    <GlowPanel className="arcade-panel rounded-lg p-4 [@media(max-height:820px)]:p-3">
      <div className="type-meta arcade-label text-xs">Active</div>
      <div className="mt-3 flex flex-wrap gap-2 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:gap-1.5">
        <ActiveChip label="Shield" seconds={phaseTimer} maxSeconds={PHASE_DURATION} color={signalStyles.repair.color} />
        <ActiveChip label="Freeze" seconds={focusTimer} maxSeconds={FREEZE_DURATION} color={signalStyles.focus.color} />
        <ActiveChip label="Nova" seconds={novaWaveTimer} maxSeconds={NOVA_WAVE_DURATION} color={signalStyles.clear.color} />
        <ActiveChip label="2x" seconds={multiplierTimer} maxSeconds={OVERDRIVE_DURATION} color={signalStyles.bonus.color} />
      </div>
    </GlowPanel>
  );
}
