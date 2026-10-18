// The static layers' painters by name. The renderer and the paint worker share this table, and messages to the paint
// worker carry these names: a function's own name doesn't survive minification.

import { paintSky, paintFar, paintMid, paintIsland, paintFront, paintFg } from './scene';
import { paintRidge, paintFlanks } from './land';

export const PAINTERS = {
  sky: paintSky,
  far: paintFar,
  ridge: paintRidge,
  mid: paintMid,
  flanks: paintFlanks,
  island: paintIsland,
  front: paintFront,
  fg: paintFg,
};
