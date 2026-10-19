// The field guide's map, after the rumour web in a ship's log. Each entry is a point roughly where it is in the world,
// and a line joins two entries when one's line in the guide mentions the other. A found entry is a lit point; one not
// found yet is a "?" with its hint, and a line from something found leads to it. Entries not on the list stay off the
// map until they are found, or until something found mentions them.

import { MAP, RUMOURS, RUMOUR_HINTS } from "./guide";

const SVG = "http://www.w3.org/2000/svg";
const and = new Intl.ListFormat("en");

// The entries a line joins `k` to.
const near = (k) => RUMOURS.flatMap(([a, b]) => (a === k ? [b] : b === k ? [a] : []));

/**
 * The map, drawn into `box`, with a line under it about the point picked. A point is picked by hovering, focusing or
 * tapping it, and the arrow keys step from point to point as they do in the world, so the map is one stop for Tab.
 * @param {HTMLElement} box
 * @param {AbortSignal} signal
 */
export function makeMap(box, signal) {
  const plot = document.createElement("div"),
    lines = document.createElementNS(SVG, "svg"),
    said = document.createElement("p");
  plot.className = "plot";
  plot.setAttribute("role", "group");
  plot.setAttribute("aria-label", "Map of the field guide");
  lines.setAttribute("viewBox", "0 0 100 100");
  lines.setAttribute("preserveAspectRatio", "none");
  lines.setAttribute("aria-hidden", "true");
  said.className = "said";
  said.id = "guide-said";
  box.append(plot, said);

  let at = "tree",
    /** @type {string[]} */ shown = [],
    /** @type {Map<string, HTMLButtonElement>} */ points = new Map(),
    /** @type {{ found: Set<string>, order: [string, string, boolean?][], entry: (k: string) => string[] } | null} */ g =
      null;
  const hint = (k) => g?.order.find(([o]) => o === k)?.[1] ?? RUMOUR_HINTS[k];
  // The found entries that mention `k`.
  const told = (k) => near(k).filter((n) => g?.found.has(n));

  /** @param {{ found: Set<string>, order: [string, string, boolean?][], entry: (k: string) => string[] }} next */
  function draw(next) {
    g = next;
    const { found, order, entry } = g,
      on = new Set(order.map(([k]) => k)),
      had = plot.contains(document.activeElement);
    shown = Object.keys(MAP).filter((k) => found.has(k) || on.has(k) || (k in RUMOUR_HINTS && told(k).length > 0));
    if (!shown.includes(at)) at = shown.find((k) => found.has(k)) ?? shown[0];
    // A rumour between two finds is a line; one that leads to something not found yet is dashed.
    const heard = RUMOURS.filter(([a, b]) => shown.includes(a) && shown.includes(b) && (found.has(a) || found.has(b)));
    lines.innerHTML = heard
      .map(
        ([a, b]) =>
          `<line x1="${MAP[a][0]}" y1="${MAP[a][1]}" x2="${MAP[b][0]}" y2="${MAP[b][1]}" vector-effect="non-scaling-stroke"${found.has(a) && found.has(b) ? "" : ' class="toward"'}/>`,
      )
      .join("");
    points = new Map(
      shown.map((k) => {
        const p = document.createElement("button"),
          got = found.has(k);
        p.type = "button";
        p.dataset.k = k;
        p.className = got ? (on.has(k) ? "got" : "got extra") : told(k).length ? "heard" : "";
        p.textContent = got ? "" : "?";
        p.style.left = `${MAP[k][0]}%`;
        p.style.top = `${MAP[k][1]}%`;
        p.setAttribute("aria-label", got ? entry(k)[1] : `Unrecorded: ${hint(k)}`);
        p.setAttribute("aria-describedby", said.id);
        return [k, p];
      }),
    );
    plot.replaceChildren(lines, ...points.values());
    pick(at);
    if (had) points.get(at)?.focus();
  }

  // Picks `k`: it takes the map's one stop for Tab, and the line under the map tells about it.
  function pick(k) {
    if (!g) return;
    points.get(at)?.classList.remove("on");
    at = k;
    for (const [o, p] of points) p.tabIndex = o === k ? 0 : -1;
    points.get(k)?.classList.add("on");
    const line = (tag, text, cls) => {
      const e = document.createElement(tag);
      e.textContent = text;
      if (cls) e.className = cls;
      return e;
    };
    // An entry's name, as it reads inside a sentence.
    const name = (n) => {
      const t = g?.entry(n)[1] ?? "";
      return t[0].toLowerCase() + t.slice(1);
    };
    said.className = g.found.has(k) ? "said got" : "said";
    if (g.found.has(k)) {
      // The words themselves are in the list. Here a find says what its lines join it to.
      const [latin, title] = g.entry(k),
        to = near(k).filter((n) => shown.includes(n)),
        got = to.filter((n) => g?.found.has(n)).map(name),
        not = to.length - got.length,
        joined = [...got, ...(not ? [`${not} unrecorded`] : [])];
      said.replaceChildren(
        line("i", latin),
        line("b", title),
        ...(joined.length ? [line("small", `Joined to ${and.format(joined)}`)] : []),
      );
    } else {
      const by = told(k).map(name);
      said.replaceChildren(
        line("b", "Unrecorded"),
        line("small", hint(k)),
        ...(by.length ? [line("small", `Mentioned by ${and.format(by)}`, "by")] : []),
      );
    }
  }

  const pointAt = (e) => /** @type {HTMLElement | null} */ (/** @type {Element} */ (e.target).closest("[data-k]"));
  const onPoint = (e) => {
    const p = pointAt(e);
    if (p?.dataset.k && p.dataset.k !== at) pick(p.dataset.k);
  };
  plot.addEventListener("pointerover", onPoint, { signal });
  plot.addEventListener("focusin", onPoint, { signal });
  plot.addEventListener("click", onPoint, { signal });
  // The arrow keys step to the nearest point that way, scored as the world's own keyboard steps are: how far along,
  // and twice how far off to the side.
  plot.addEventListener(
    "keydown",
    (e) => {
      const d = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
      if (!d) return;
      e.preventDefault();
      const [x, y] = MAP[at];
      let best = null,
        score = Infinity;
      for (const k of shown) {
        const dx = MAP[k][0] - x,
          dy = MAP[k][1] - y,
          along = dx * d[0] + dy * d[1],
          off = Math.abs(dx * d[1] - dy * d[0]);
        if (along < 1 || along + off * 2 >= score) continue;
        score = along + off * 2;
        best = k;
      }
      if (best) {
        pick(best);
        points.get(best)?.focus();
      }
    },
    { signal },
  );

  return { draw };
}
