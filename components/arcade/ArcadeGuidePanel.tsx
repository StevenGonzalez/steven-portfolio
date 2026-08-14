import GlowPanel from "../GlowPanel";
import { HazardLegendIcon, PowerupLegendIcon } from "./LegendIcons";
import { HAZARD_ENTRIES, POWERUP_ENTRIES } from "./core";

export function ArcadeGuidePanel() {
  return (
    <GlowPanel className="arcade-guide-panel arcade-panel min-h-0 overflow-hidden rounded-lg p-4 [@media(max-height:820px)]:p-3 lg:flex lg:flex-1 lg:flex-col">
      <div className="type-meta arcade-label select-none text-xs">Guide</div>
      <div className="arcade-guide-content mt-4 space-y-5 [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:space-y-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        <div>
          <div className="type-meta arcade-label-quiet text-xs">Powerups</div>
          <div className="mt-3 space-y-3 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:space-y-2">
            {POWERUP_ENTRIES.map(([kind, signal], index) => (
              <div key={kind} className="flex items-center gap-2.5">
                <span className="arcade-legend-swatch flex h-6 w-6 shrink-0 items-center justify-center overflow-visible">
                  <PowerupLegendIcon kind={kind} color={signal.color} index={index} />
                </span>
                <div>
                  <div className="arcade-ink text-sm font-semibold">{signal.label}</div>
                  <div className="type-meta arcade-label-quiet text-[0.68rem]">{signal.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="type-meta arcade-label-quiet text-xs">Hazards</div>
          <div className="mt-3 space-y-2.5 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:space-y-2">
            {HAZARD_ENTRIES.map(([kind, incident], index) => (
              <div key={kind} className="flex items-center gap-2.5">
                <span className="arcade-legend-swatch flex h-6 w-6 shrink-0 items-center justify-center overflow-visible">
                  <HazardLegendIcon kind={kind} color={incident.color} index={index} />
                </span>
                <div>
                  <div className="arcade-ink text-[0.82rem] font-semibold leading-tight">{incident.label}</div>
                  <div className="type-meta arcade-label-quiet text-[0.68rem]">{incident.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlowPanel>
  );
}
