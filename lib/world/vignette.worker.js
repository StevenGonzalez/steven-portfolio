// Plays a project's scene off the page's main thread, in a canvas the page handed over. The first message brings the
// canvas; every later one goes straight to the player.

import { playScene } from './vignette';

let receive = null;
self.onmessage = ({ data }) => {
  if (receive) receive(data);
  else receive = playScene(data.canvas, data.slug, data.reduce);
};
