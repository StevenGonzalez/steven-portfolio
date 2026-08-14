import { clamp } from "./core";

export function ActiveChip({
  label,
  seconds,
  maxSeconds,
  color,
}: {
  label: string;
  seconds: number;
  maxSeconds: number;
  color: string;
}) {
  const active = seconds > 0;
  const percent = active ? clamp((seconds / maxSeconds) * 100, 0, 100) : 0;

  return (
    <span
      className={`arcade-active-chip type-meta relative overflow-hidden rounded-md border px-2 py-1 text-[0.68rem] ${active ? "arcade-active-chip--on" : "text-zinc-500"}`}
      style={{
        borderColor: active ? color : "var(--arcade-chip-off-border)",
        color: active ? color : undefined,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 transition-[width] duration-100"
        style={{
          width: `${percent}%`,
          backgroundColor: color,
          opacity: active ? 0.88 : 0,
        }}
      />
      <span className={`relative z-10 ${active ? "arcade-active-chip-label" : "text-zinc-500"}`}>
        {label}
      </span>
    </span>
  );
}
