import { LIFE_INDICES } from "./core";

type ArcadeLivesPanelProps = {
  lives: number;
  livesBump: number;
  lostLifeIndex: number | null;
};

export function ArcadeLivesPanel({ lives, livesBump, lostLifeIndex }: ArcadeLivesPanelProps) {
  return (
    <div className="arcade-panel rounded-lg border border-cyan-300/25 bg-[#080915]/85 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)] [@media(max-height:820px)]:p-3">
      <div className="type-meta text-xs text-cyan-300/80">Lives</div>
      <div className="mt-3 flex gap-2 [@media(max-height:820px)]:mt-2">
        {LIFE_INDICES.map((index) => {
          const active = index < lives;
          const justLost = index === lostLifeIndex && !active;

          return (
            <svg
              key={`${index}-${justLost ? livesBump : "life"}`}
              viewBox="0 0 24 24"
              className={`arcade-life-icon ${active ? "arcade-life-icon--on" : "arcade-life-icon--off"} ${justLost ? "arcade-life-icon--lost" : ""}`}
              aria-label={active ? "Life remaining" : "Life lost"}
              role="img"
            >
              <path d="M12 3.6 20.7 20.4 3.3 20.4Z" />
            </svg>
          );
        })}
      </div>
    </div>
  );
}
