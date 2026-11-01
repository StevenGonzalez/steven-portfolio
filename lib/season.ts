import { occasionOf, seasonOf } from "./world/calendar";

export type Season = "spring" | "summer" | "autumn" | "winter";
export type Occasion = "halloween" | "newyear";

const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];
// The season each occasion falls in, as the world has it (OCCASIONS in lib/world/stage.js).
const OCCASIONS: Record<Occasion, Season> = { halloween: "autumn", newyear: "winter" };

/** The season and any occasion the pages dress for: the visitor's own date, or the one the address asks for, by the
 *  same ?season= the world reads (winter, spring, summer, autumn, halloween or newyear). */
export function seasonNow(): { season: Season; occasion: Occasion | null } {
  const asked = new URLSearchParams(location.search).get("season") ?? "";
  if (asked in OCCASIONS) return { season: OCCASIONS[asked as Occasion], occasion: asked as Occasion };
  if (SEASONS.includes(asked as Season)) return { season: asked as Season, occasion: null };
  const now = new Date();
  return { season: seasonOf(now) as Season, occasion: occasionOf(now) as Occasion | null };
}
