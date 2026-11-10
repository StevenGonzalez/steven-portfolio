import assert from "node:assert/strict";
import { test } from "node:test";
import { createFramePacer } from "./index.js";

const HZ60 = 1000 / 60;
const HZ144 = 1000 / 144;

/** A pacer that has watched a screen refreshing every `interval` ms. */
function onScreen(interval, options) {
  const pacer = createFramePacer(options);
  for (let i = 0, now = 1000; i < 40; i++, now += interval) pacer.tick(now);
  return pacer;
}
const report = (pacer, ms, times = 60) => {
  for (let i = 0; i < times; i++) pacer.report(ms);
};

test("starts every refresh, assuming 60 Hz", () => {
  const pacer = createFramePacer();
  assert.equal(pacer.pace, 1);
  assert.equal(pacer.refresh, HZ60);
});

test("reads the refresh interval from the shortest recent gap", () => {
  const pacer = onScreen(HZ144);
  assert.ok(Math.abs(pacer.refresh - HZ144) < 1e-6);
  pacer.tick(1000 + 40 * HZ144 + 200);
  assert.ok(Math.abs(pacer.refresh - HZ144) < 1e-6, "one long gap changes nothing");
});

test("ignores callbacks that arrive a few milliseconds apart", () => {
  const pacer = onScreen(HZ60);
  const now = 1000 + 40 * HZ60;
  pacer.tick(now);
  pacer.tick(now + 1);
  assert.ok(Math.abs(pacer.refresh - HZ60) < 1e-6);
});

test("stays on every refresh while frames fit", () => {
  const pacer = onScreen(HZ60);
  report(pacer, 12);
  assert.equal(pacer.pace, 1);
});

test("takes the fewest refreshes that fit a frame on a fast screen", () => {
  const pacer = onScreen(HZ144);
  report(pacer, 10); // 10.5 ms with the handover is 1.5 refreshes at 144 Hz.
  assert.equal(pacer.pace, 2);
  report(pacer, 19); // 19.5 ms is 2.8 refreshes.
  assert.equal(pacer.pace, 3);
});

test("a rare slow frame drops only itself", () => {
  const pacer = onScreen(HZ60);
  report(pacer, 5);
  report(pacer, 40, 5);
  assert.equal(pacer.pace, 1);
});

test("slows down once more than one frame in ten runs long", () => {
  const pacer = onScreen(HZ60);
  report(pacer, 5);
  report(pacer, 25, 8);
  assert.equal(pacer.pace, 2);
});

test("speeds up only with room to spare", () => {
  const pacer = onScreen(HZ60);
  report(pacer, 25);
  assert.equal(pacer.pace, 2);
  report(pacer, 15); // 15.5 ms fits one refresh, but not with 8% to spare.
  assert.equal(pacer.pace, 2);
  report(pacer, 14);
  assert.equal(pacer.pace, 1);
});

test("restart forgets the old costs", () => {
  const pacer = onScreen(HZ60);
  report(pacer, 25);
  pacer.restart();
  pacer.report(5);
  assert.equal(pacer.pace, 1);
});

test("due waits out the pace, with half a refresh of slack", () => {
  const pacer = onScreen(HZ60);
  report(pacer, 25);
  assert.equal(pacer.due(1000 + HZ60, 1000), false);
  assert.equal(pacer.due(1000 + 2 * HZ60 - 2, 1000), true, "timestamps jitter around the refresh");
});

test("due respects a frame-rate limit, but never runs faster than the pace", () => {
  const pacer = onScreen(HZ144);
  assert.equal(pacer.due(1000 + 20, 1000, 30), false);
  assert.equal(pacer.due(1000 + 32, 1000, 30), true);
  report(pacer, 60); // 60.5 ms is 9 refreshes, slower than the 30 fps limit.
  assert.equal(pacer.due(1000 + 40, 1000, 30), false);
  assert.equal(pacer.due(1000 + 60, 1000, 30), true);
});

test("options change what counts as fitting", () => {
  const pacer = onScreen(HZ60, { percentile: 0.5, costSamples: 10, handover: 0 });
  report(pacer, 10, 10);
  report(pacer, 25, 4);
  assert.equal(pacer.pace, 1, "4 of 10 slow is under the median");
  report(pacer, 25, 3);
  assert.equal(pacer.pace, 2);
});
