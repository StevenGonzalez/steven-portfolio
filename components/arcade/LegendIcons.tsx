import type { Incident, Signal } from "./core";

export function PowerupLegendIcon({
  kind,
  color,
  index,
}: {
  kind: Signal["kind"];
  color: string;
  index: number;
}) {
  const style = { color, animationDelay: `${index * 140}ms` };

  if (kind === "gain") {
    const starPath = "M0-10 L2.4-3.3 L9.5-3.1 L3.8 1.2 L5.9 8.4 L0 4.2 L-5.9 8.4 L-3.8 1.2 L-9.5-3.1 L-2.4-3.3 Z";
    return (
      <svg className="arcade-powerup-icon h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={style} aria-hidden>
        <path className="arcade-powerup-glow" d={starPath} fill="none" stroke="currentColor" strokeWidth="6.2" strokeLinejoin="round" opacity="0.34" />
        <path d={starPath} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "repair") {
    const shieldPath = "M0-10 C7-8 8-5.5 7 0 C6 5.5 2.8 8.2 0 10 C-2.8 8.2-6 5.5-7 0 C-8-5.5-7-8 0-10 Z";
    return (
      <svg className="arcade-powerup-icon h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={style} aria-hidden>
        <path className="arcade-powerup-glow" d={shieldPath} fill="none" stroke="currentColor" strokeWidth="6.2" strokeLinejoin="round" opacity="0.34" />
        <path d={shieldPath} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "focus") {
    const freezePath = "M-9 0 H9 M-4.5-7.8 L4.5 7.8 M4.5-7.8 L-4.5 7.8";
    return (
      <svg className="arcade-powerup-icon h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={style} aria-hidden>
        <path className="arcade-powerup-glow" d={freezePath} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.34" />
        <path d={freezePath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "bonus") {
    const overdrivePath = "M-7-8 L0 0 L-7 8 M1-8 L8 0 L1 8";
    return (
      <svg className="arcade-powerup-icon h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={style} aria-hidden>
        <path className="arcade-powerup-glow" d={overdrivePath} fill="none" stroke="currentColor" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.34" />
        <path d={overdrivePath} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  const novaRayPath = "M7.5-7.5 L9.8-9.8 M7.5 7.5 L9.8 9.8 M-7.5 7.5 L-9.8 9.8 M-7.5-7.5 L-9.8-9.8";
  return (
    <svg className="arcade-powerup-icon h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={style} aria-hidden>
      <circle className="arcade-powerup-glow" cx="0" cy="0" r="6.5" fill="none" stroke="currentColor" strokeWidth="6" opacity="0.34" />
      <path className="arcade-powerup-glow" d={novaRayPath} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.34" />
      <circle cx="0" cy="0" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d={novaRayPath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HazardLegendIcon({
  kind,
  color,
  index,
}: {
  kind: Incident["kind"];
  color: string;
  index: number;
}) {
  const style = {
    color,
    borderColor: color,
    backgroundColor: "transparent",
    animationDelay: `${index * 170}ms`,
  };

  if (kind === "drift") {
    return <span className="arcade-hazard-icon h-1 w-5 shrink-0 rounded-full border" style={style} />;
  }

  if (kind === "tracker") {
    return <span className="arcade-hazard-icon size-5 shrink-0 rounded-full border" style={style} />;
  }

  if (kind === "heavy") {
    return (
      <svg className="arcade-hazard-icon-svg h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={{ color, animationDelay: `${index * 170}ms` }} aria-hidden>
        <path d="M0-10 L10 0 L0 10 L-10 0 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "waver") {
    return (
      <svg className="arcade-hazard-icon-svg h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={{ color, animationDelay: `${index * 170}ms` }} aria-hidden>
        <path d="M10 0 L5.4 2.2 L7.1 7.1 L2.2 5.4 L0 10 L-2.2 5.4 L-7.1 7.1 L-5.4 2.2 L-10 0 L-5.4-2.2 L-7.1-7.1 L-2.2-5.4 L0-10 L2.2-5.4 L7.1-7.1 L5.4-2.2 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "splitter") {
    return (
      <svg className="arcade-hazard-icon-svg h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={{ color, animationDelay: `${index * 170}ms` }} aria-hidden>
        <path d="M10 0 L0 7.5 L-10 0 L0-7.5 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg className="arcade-hazard-icon-svg h-6 w-6 shrink-0 overflow-visible" viewBox="-12 -12 24 24" style={{ color, animationDelay: `${index * 170}ms` }} aria-hidden>
      <path d="M0-10 L8.7-5 L8.7 5 L0 10 L-8.7 5 L-8.7-5 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
