// What the page's side of the world, the article's world and the project scenes all need from the screen they are on.

// Firefox resisting fingerprinting, as LibreWolf and the Tor Browser do by default, rounds its clock to a sixtieth of
// a second and reports a pixel ratio of 2 whatever the screen. Other browsers tick every millisecond or finer. So the
// clock is read until it moves, a bounded number of times, once: if it has not moved, or moved by more than a few
// milliseconds, it is the coarse one.
let coarse = /** @type {boolean | undefined} */ (undefined);
export function coarseClock() {
  if (coarse === undefined) {
    const a = performance.now();
    let b = a;
    for (let i = 0; i < 1e5 && b === a; i++) b = performance.now();
    coarse = b - a === 0 || b - a > 5;
  }
  return coarse;
}

// The screen's pixel ratio, or 1 where the browser makes it up: drawing for a made-up ratio of 2 on an ordinary screen
// costs the canvases up to four times the pixels, for nothing.
export const pixelRatio = () => (coarseClock() ? 1 : devicePixelRatio || 1);

// Calls `fn` each time the page moves to a screen with a different pixel ratio, as when its window is dragged to
// another monitor, which changes no size for a ResizeObserver to see. A query that matches only the ratio there is now
// is watched, and replaced by one for the new ratio each time it stops matching. Stops when `signal` aborts.
export function onPixelRatio(fn, signal) {
  const watch = () => {
    matchMedia(`(resolution: ${devicePixelRatio || 1}dppx)`).addEventListener(
      "change",
      () => {
        watch();
        fn();
      },
      { once: true, signal },
    );
  };
  watch();
}
