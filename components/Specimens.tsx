"use client";

import { useMemo, useSyncExternalStore } from "react";
import { GUIDE, GUIDE_ORDER, RARE } from "@/lib/world/guide";

type Key = keyof typeof GUIDE;

// What the field guide has recorded, as the guide keeps it in this browser. The guide tells this page when it records
// something (stage.js), and other tabs say so through the storage event.
function subscribe(onChange: () => void) {
  addEventListener("field-guide", onChange);
  addEventListener("storage", onChange);
  return () => {
    removeEventListener("field-guide", onChange);
    removeEventListener("storage", onChange);
  };
}
const kept = () => {
  try {
    return localStorage.getItem("field-guide");
  } catch {
    return null;
  }
};

// The guide lists fewer landmarks on a phone-sized world and no storm when motion is reduced, so this page does too.
const media = (q: string) =>
  [
    (onChange: () => void) => {
      const m = matchMedia(q);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => matchMedia(q).matches,
    () => false,
  ] as const;
const PHONE = media("(max-width: 759.98px)"),
  STILL = media("(prefers-reduced-motion: reduce)");

// The finds off the guide's list, in the order the guide gives them.
const EXTRAS: Key[] = ["desk", "lifter", "sapling", "leaves", "pressed", "gatesong", ...(RARE as Key[]), "loop"];

/** A small number from a word, so each specimen is pressed the same way on every visit. */
function hash(s: string) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Faded colours, as pressed flowers go.
const BLOOMS = ["#c9826b", "#d2a95c", "#9a86b8", "#c47f95", "#7fa3b8", "#e0c27a"];

/** A pressed sprig, drawn from the find's name: a bent stem with pairs of leaves, and a flower, a leafy tip or a seed
 *  head on top. */
function Sprig({ name }: { name: string }) {
  const h = hash(name),
    bend = ((h % 13) - 6) * 2,
    pairs = 2 + (h % 3),
    kind = (h >> 4) % 3,
    bloom = BLOOMS[(h >> 7) % BLOOMS.length],
    tilt = ((h >> 10) % 21) - 10,
    top: [number, number] = [30 + bend, 16];
  const leaves = Array.from({ length: pairs }, (_, i) => {
    const u = 0.3 + (i / pairs) * 0.55,
      y = 76 - u * 60,
      x = 30 + bend * u * u,
      size = 9 - i * 1.5;
    return [-1, 1].map((side) => (
      <ellipse
        key={`${i}${side}`}
        cx={x + side * size * 0.8}
        cy={y - 2}
        rx={size}
        ry={size * 0.38}
        transform={`rotate(${side * -32} ${x} ${y})`}
      />
    ));
  });
  return (
    <svg viewBox="0 0 60 84" aria-hidden="true" style={{ transform: `rotate(${tilt}deg)` }}>
      <path className="stem" d={`M30 80 Q${30 + bend * 0.2} 44 ${top[0]} ${top[1]}`} />
      <g className="leaf">{leaves}</g>
      {kind === 0 ? (
        <g fill={bloom}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx={top[0]}
              cy={top[1] - 6}
              rx={3.6}
              ry={6.5}
              transform={`rotate(${a + tilt} ${top[0]} ${top[1]})`}
            />
          ))}
          <circle cx={top[0]} cy={top[1]} r={2.6} className="eye" />
        </g>
      ) : kind === 1 ? (
        <ellipse className="leaf" cx={top[0]} cy={top[1] - 4} rx={4.5} ry={9} />
      ) : (
        <g fill={bloom}>
          {Array.from({ length: 9 }, (_, i) => (
            <circle
              key={i}
              cx={top[0] + Math.cos(i * 0.7) * (2 + i * 0.7)}
              cy={top[1] - 4 + Math.sin(i * 0.7) * (2 + i * 0.7)}
              r={1.6}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

/** The island's finds, pressed like flowers on a page of the book, with an empty space for each one still out there.
 *  It reads what the field guide has recorded in this browser, so before the page has loaded every space is empty. */
export default function Specimens() {
  const raw = useSyncExternalStore(subscribe, kept, () => null);
  const phone = useSyncExternalStore(...PHONE);
  const still = useSyncExternalStore(...STILL);
  const found = useMemo(() => {
    try {
      const list: unknown = JSON.parse(raw ?? "null");
      return new Set(Array.isArray(list) ? list.filter((k): k is Key => typeof k === "string" && k in GUIDE) : []);
    } catch {
      return new Set<Key>();
    }
  }, [raw]);

  const order = GUIDE_ORDER.map(([k, , far]) => [k as Key, far] as const).filter(
      ([k, far]) => !(phone && far) && !(still && k === "storm"),
    ),
    got = order.filter(([k]) => found.has(k)).map(([k]) => k),
    missing = order.length - got.length,
    extras = EXTRAS.filter((k) => found.has(k)),
    all = missing === 0,
    more = extras.length ? `, plus ${extras.length} that ${extras.length > 1 ? "were" : "was"} never on the list` : "";

  return (
    <div className="specimens" data-rv>
      <h3>Pressed from the island</h3>
      <p className="specimens-count">
        {got.length === 0
          ? "Nothing pressed yet. Whatever you find in the world up top is pressed here."
          : `${all ? `All ${got.length}` : `${got.length} of ${order.length}`} found${more}.`}
      </p>
      {got.length + extras.length ? (
        <ol>
          {got.map((k) => (
            <Specimen key={k} k={k} />
          ))}
          {extras.map((k) => (
            <Specimen key={k} k={k} extra />
          ))}
        </ol>
      ) : null}
      {/* An empty space for each find still out there. The count above says how many. */}
      {missing ? (
        <div className="specimens-left" aria-hidden="true">
          <small>Still out there</small>
          {Array.from({ length: missing }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Specimen({ k, extra }: { k: Key; extra?: boolean }) {
  const [latin, common] = GUIDE[k];
  return (
    <li className={extra ? "found extra" : "found"}>
      <Sprig name={k} />
      <i>{latin}</i>
      <b>{common}</b>
    </li>
  );
}
