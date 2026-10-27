// Plays the edge of the world off the page's main thread, in canvases the page handed over. The first message brings
// the canvases; every later one goes straight to the player, and what the player has to say goes back to the page.

import { playEdge } from "./play";

let receive = null;
self.onmessage = ({ data }) => {
  if (receive) receive(data);
  else receive = playEdge(data.canvases, data.reduce, (m) => self.postMessage(m));
};
