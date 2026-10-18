// What the page's side of the world, the article's world and the project scenes all need from the screen they are on.

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
