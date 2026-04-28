import { HazardLegendIcon, PowerupLegendIcon } from "./LegendIcons";
import { HAZARD_ENTRIES, POWERUP_ENTRIES } from "./core";

export function ArcadeGuidePanel() {
  return (
    <div className="arcade-guide-panel arcade-panel min-h-0 overflow-hidden rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)] [@media(max-height:820px)]:p-3 lg:flex lg:flex-1 lg:flex-col">
      <div className="type-meta select-none text-xs text-cyan-300/80">Guide</div>
      <div className="arcade-guide-content mt-4 space-y-5 [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        <div>
          <div className="type-meta text-xs text-cyan-300/60">Powerups</div>
          <div className="mt-3 space-y-3 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:space-y-2">
            {POWERUP_ENTRIES.map(([kind, signal], index) => (
              <div key={kind} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-visible">
                  <PowerupLegendIcon kind={kind} color={signal.color} index={index} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-zinc-100">{signal.label}</div>
                  <div className="type-meta text-[0.68rem] text-cyan-300/60">{signal.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="type-meta text-xs text-cyan-300/60">Hazards</div>
          <div className="mt-3 space-y-2.5 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:space-y-2">
            {HAZARD_ENTRIES.map(([kind, incident], index) => (
              <div key={kind} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-visible">
                  <HazardLegendIcon kind={kind} color={incident.color} index={index} />
                </span>
                <div>
                  <div className="text-[0.82rem] font-semibold leading-tight text-zinc-100">{incident.label}</div>
                  <div className="type-meta text-[0.68rem] text-cyan-300/60">{incident.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
