// The postcard: a still of the world, framed on a cream card with a caption, the field guide's tally, a stamp cut
// around the lantern tree, and a postmark with the date and season, then saved as a download. Leaves the visitor pressed
// this autumn are tucked in over a corner of the picture, and a visitor who has found everything on the list gets a
// rubber stamp across the caption saying so. It loads only when a visitor asks for one.
// `img` is the renderer's flattened bitmap of every layer; `W` is the hero's width in CSS pixels, `pressed` is the
// leaves, as their colours and how far each is turned, and `display` and `mono` are the page's own font stacks.

import { mixc, rgba } from './core';
import { LEAVES, mapleLeaf } from './calendar';

// Where the pressed leaves lie over the picture's top left corner, and how big each is, in shares of its width.
const TUCKED = [[.03, .05, .048], [.078, .022, .04], [.066, .088, .034]];
// A pressed leaf's veins, from where the stalk joins out to the tip of each lobe, and its stalk.
const VEINS = [[0, -.86], [.84, -.46], [-.84, -.46], [.54, .3], [-.54, .3]];

export function savePostcard(img, { W, geo, season, night, tally, complete, display, mono, pressed = [] }) {
  const w = img.width, h = img.height, m = Math.round(w * .03), band = Math.round(w * .07), k = w / W;
  const cv = document.createElement('canvas'), c = cv.getContext('2d');
  cv.width = w + m * 2;
  cv.height = h + m + band;
  c.fillStyle = '#f2eadb';
  c.fillRect(0, 0, cv.width, cv.height);
  c.drawImage(img, m, m);
  c.strokeStyle = 'rgba(40,36,30,.25)';
  c.lineWidth = Math.max(1, k);
  c.strokeRect(m, m, w, h);

  // Pressed leaves dry a little paler and flatter than they fell, and cast a soft shadow on the picture.
  pressed.forEach(({ c: ci, r }, i) => {
    const [fx, fy, fr] = TUCKED[i], R = w * fr, col = mixc(LEAVES[ci], [242, 234, 219], .15);
    c.save();
    c.translate(m + w * fx, m + w * fy);
    c.rotate(r);
    c.scale(R, R);
    c.shadowColor = 'rgba(30,20,10,.3)';
    c.shadowBlur = 5 * k;
    c.shadowOffsetY = 2 * k;
    c.fillStyle = rgba(col);
    c.fill(mapleLeaf());
    c.shadowColor = 'transparent';
    c.strokeStyle = rgba(mixc(col, [60, 24, 12], .45), .6);
    c.lineCap = 'round';
    c.lineWidth = (1.1 * k) / R;
    c.beginPath();
    for (const [vx, vy] of VEINS) {
      c.moveTo(0, .3);
      c.lineTo(vx, vy);
    }
    c.moveTo(0, .3);
    c.quadraticCurveTo(.02, .6, .1, .78);
    c.stroke();
    c.restore();
  });

  const cy = h + m + band / 2;
  c.fillStyle = '#2b2721';
  c.textBaseline = 'middle';
  c.font = `italic 500 ${Math.round(band * .42)}px ${display}`;
  c.fillText('Greetings from the sky islands', m, cy);
  c.textAlign = 'right';
  c.font = `500 ${Math.round(band * .17)}px ${mono}`;
  c.fillText(`FIELD GUIDE ${tally}`, m + w, cy - band * .14);
  c.fillStyle = 'rgba(43,39,33,.6)';
  c.fillText('STEVENGONZALEZ.DEV', m + w, cy + band * .16);

  // The stamp: the lantern tree, cut from the scene, inside a perforated edge.
  const sw = Math.round(w * .1), sh = Math.round(sw * 1.2), sx = m + w - sw - m, sy = m + m, r = sw * .035;
  c.save();
  c.shadowColor = 'rgba(0,0,0,.3)';
  c.shadowBlur = 8 * k;
  c.fillStyle = '#f7f1e4';
  c.beginPath();
  c.rect(sx, sy, sw, sh);
  c.fill();
  c.restore();
  // Perforations: small bites of the card's colour along every edge.
  const bite = (x, y) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); };
  c.beginPath();
  for (let x = sx; x <= sx + sw; x += r * 3) { bite(x, sy); bite(x, sy + sh); }
  for (let y = sy; y <= sy + sh; y += r * 3) { bite(sx, y); bite(sx + sw, y); }
  c.fillStyle = '#f2eadb';
  c.fill();
  const pad = sw * .09, tx = geo.tree[0] * geo.U * k, ty = geo.tree[1] * geo.U * k, cw = (sw - pad * 2) * 2.2, ch = (sh - pad * 2) * 2.2;
  c.drawImage(img, tx - cw / 2, ty - ch * .55, cw, ch, sx + pad, sy + pad, sw - pad * 2, sh - pad * 2);
  img.close?.();

  // The postmark, half over the stamp. Dark ink by day, pale ink over the night sky.
  const px = sx - sw * .15, py = sy + sh * .62, pr = sw * .42, ink = night ? '242,234,219' : '52,44,70';
  c.save();
  c.strokeStyle = `rgba(${ink},.55)`;
  c.fillStyle = `rgba(${ink},.65)`;
  c.lineWidth = 1.6 * k;
  c.beginPath();
  c.arc(px, py, pr, 0, Math.PI * 2);
  c.stroke();
  c.textAlign = 'center';
  c.font = `500 ${Math.round(pr * .2)}px ${mono}`;
  c.fillText('SKY ISLANDS', px, py - pr * .32);
  c.fillText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase(), px, py + pr * .02);
  c.fillText(season.toUpperCase(), px, py + pr * .36);
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    for (let x = px + pr * 1.1; x < px + pr * 3.4; x += 2 * k) c.lineTo(x, py - pr * .45 + i * pr * .3 + Math.sin(x / (6 * k)) * pr * .06);
    c.stroke();
  }
  c.restore();

  // The rubber stamp: FIELD GUIDE over COMPLETE in red ink, in a double box, stamped on a little crooked and not quite
  // evenly inked. It is inked on a sheet of its own, so the worn patches don't wear through the card.
  if (complete) {
    const bw = band * 2.9, bh = band * .78, ink = 'rgba(176,44,38,.78)', st = document.createElement('canvas'), s = st.getContext('2d');
    st.width = Math.ceil(bw + band * .1);
    st.height = Math.ceil(bh + band * .1);
    s.translate(st.width / 2, st.height / 2);
    s.strokeStyle = ink;
    s.fillStyle = ink;
    s.lineWidth = band * .045;
    s.strokeRect(-bw / 2, -bh / 2, bw, bh);
    s.lineWidth = band * .018;
    s.strokeRect(-bw / 2 + band * .07, -bh / 2 + band * .07, bw - band * .14, bh - band * .14);
    s.textAlign = 'center';
    s.textBaseline = 'middle';
    s.font = `600 ${Math.round(band * .13)}px ${mono}`;
    s.fillText('F I E L D   G U I D E', 0, -bh * .2);
    s.font = `700 ${Math.round(band * .3)}px ${mono}`;
    s.fillText('COMPLETE', 0, bh * .14);
    s.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) {
      s.globalAlpha = .25 + Math.random() * .5;
      s.beginPath();
      s.arc((Math.random() - .5) * bw, (Math.random() - .5) * bh, band * (.01 + Math.random() * .03), 0, Math.PI * 2);
      s.fill();
    }
    c.save();
    c.translate(m + w * .62, cy - band * .04);
    c.rotate(-.1);
    c.drawImage(st, -st.width / 2, -st.height / 2);
    c.restore();
  }

  cv.toBlob(b => {
    if (!b) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'sky-islands-postcard.jpg';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/jpeg', .92);
}
