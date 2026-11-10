# frame-pacer

Keeps a slow canvas animation on an even rhythm by stepping it every N screen refreshes.

Say a frame takes 11 ms to draw on a 144 Hz screen, where a refresh is 6.9 ms. If you draw whenever the last frame has finished, frames land two refreshes apart, then one, then two, because the cost wobbles around the boundary. The average frame rate looks fine, and the motion stutters. Stepping every second refresh gives 72 fps with even gaps, which looks smoother than an uneven 90.

`frame-pacer` works out that step. It has no dependencies and uses no browser APIs, so it runs anywhere you can pass it timestamps, and it is about 1 KB. It came out of the renderer for the animated world on [stevengonzalez.dev](https://stevengonzalez.dev), which draws in a Web Worker.

## How it decides

- The refresh interval is the shortest of the last 30 gaps between `requestAnimationFrame` callbacks. Gaps of 3 ms or less are ignored, because those are the browser catching up.
- The pace is the fewest refreshes that nine in ten of the last 60 frames fit into, plus 0.5 ms to hand the frame over. A rare slow frame drops only itself.
- The pace slows at once. It speeds up only when frames fit the faster pace with 8% to spare, so it doesn't flip between two paces.

## Usage

```js
import { createFramePacer } from "frame-pacer";

const pacer = createFramePacer();
let lastFrame = 0;
let busy = false;

function onAnimationFrame(now) {
  requestAnimationFrame(onAnimationFrame);
  pacer.tick(now);
  if (busy || !pacer.due(now, lastFrame)) return;
  lastFrame = now;
  busy = true;
  worker.postMessage({ type: "frame" });
}
requestAnimationFrame(onAnimationFrame);

worker.onmessage = ({ data }) => {
  // The worker timed its own drawing with performance.now().
  busy = false;
  pacer.report(data.ms);
};
```

## API

### `createFramePacer(options?)`

| Option           | Default | Meaning                                                       |
| ---------------- | ------- | ------------------------------------------------------------- |
| `refreshSamples` | `30`    | How many recent gaps to read the refresh interval from.       |
| `costSamples`    | `60`    | How many recent frame costs to set the pace from.             |
| `percentile`     | `0.9`   | The share of recent frames, from 0 to 1, the pace must fit.   |
| `handover`       | `0.5`   | Milliseconds added to a frame's cost for reaching the screen. |

It returns a pacer:

- `tick(now)`: call once per `requestAnimationFrame` callback.
- `report(ms)`: call when a frame has finished, with what it cost.
- `due(now, lastFrame, maxFps?)`: whether a new frame should start. `maxFps` limits the rate, for example while the animation idles.
- `restart()`: forgets the frame costs. Call it after lowering your drawing quality, since the old costs no longer apply.
- `pace`: refreshes per frame, from 1 up.
- `refresh`: the refresh interval in milliseconds.

## Tests

```bash
node --test
```
