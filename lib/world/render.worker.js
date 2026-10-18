// Runs the renderer off the page's main thread, drawing into canvases the page handed over. The first message brings
// the canvases; every later one goes straight to the renderer. Whatever the renderer lists to hand over with an answer,
// such as a postcard's bitmap, moves to the page rather than being copied.

import { makeRenderer } from "./render";

let receive = null;
self.onmessage = ({ data }) => {
  if (receive) receive(data);
  else receive = makeRenderer(data.canvases, data.reduce, (m, transfer) => self.postMessage(m, transfer));
};
