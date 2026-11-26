/* Pellet → busbar → EV scroll story.
   One canvas, one continuous world. Scroll position drives the staging (camera, bag pose, tear, hopper level,
   mold, the part's fall); the flows that should feel alive (pellet stream, screw, idle spin) run on the clock. */
(() => {
'use strict';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const story = document.getElementById('story');
const stage = cv.parentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ASSETS = document.currentScript && document.currentScript.src ? new URL('assets/', document.currentScript.src).href : 'assets/';

/* ---------- helpers ---------- */
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const lin = (a, b, x) => clamp((x - a) / (b - a));
const sm = (a, b, x) => { const t = lin(a, b, x); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - (1 - t) ** 3;
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

/* ---------- world (units = the machine render at 1600 wide) ---------- */
const MACHINE = { x: 50, y: 114.24, w: 1476.74, h: 711.34 };
const PLATEN = { x: 509.59, y: 277.33, w: 96.8, h: 257.56, travel: 143.6 };
const HOP = { rimY: 134, xl: 1138, xr: 1321, cylY: 214, tl: 1207, tr: 1252, coneY: 343, throatY: 389, hitX: 1218 };
const BORE = { x0: 886, x1: 1262, cy: 410, r: 21, pitch: 34 };
const MOLD = { part: 749.7, cy: 406, T: 12, faceOpen: 606.1 };
const HEATERS = [922, 973, 1022, 1048, 1078, 1106, 1134, 1162];
const BAG = { w: 183, h: 300, tearY: 128 };          // tearY in image px
const LAND = { x: 690, y: 1040 };
const K = 0.74;                                       // share of the scroll spent on pellet → part; the rest is part → EV
const PART = { asp: 1400 / 419, moldL: 56, heroL: 280, seatL: 76, body: 0.53 };   // L = half length; body = share of it the resin covers
const EV = { x: 10, y: 1700, w: 1500 }; EV.k = EV.w / 1600; EV.h = EV.w * 1358 / 3200;
const evp = (px, py) => [EV.x + px * EV.k, EV.y + py * EV.k];     // points measured on the car render at 1600 wide
const SEAT = { x: evp(800, 463)[0], y: evp(800, 463)[1] };        // on the line between the two module rows
const HV = [[432, 404], [468, 409], [486, 442], [500, 462], [1112, 463], [1148, 432], [1164, 382], [1196, 368]].map(([a, b]) => evp(a, b));
const G = 1150;                                       // gravity, units / s²

/* camera keys: [progress, x, y, zoom, screen offset x (fraction of width, wide screens only), zoom on narrow screens if different] */
const CAM = [
  [0.00, 1060, -120, 2.30, 0.17],
  [0.17, 1062, -116, 2.15, 0.17],
  [0.31, 1175, 118, 1.38, 0.11],
  [0.47, 1185, 150, 1.46, 0.11],
  [0.56, 1120, 330, 2.00, 0.10],
  [0.635, 985, 405, 2.35, 0.12],
  [0.70, 790, 405, 2.70, 0.13],
  [0.80, 770, 405, 2.70, 0.13],
  [0.865, 690, 420, 2.25, 0.13],
  [0.975, LAND.x, LAND.y, 1.45, 0.17, 1.1],
  [1.00, LAND.x, LAND.y, 1.45, 0.17, 1.1],
];
/* the second leg, keyed on its own 0–1 */
const CAM2 = [
  [0.00, LAND.x, LAND.y, 1.45, 0.17, 1.1],
  [0.10, LAND.x, LAND.y, 1.45, 0.17, 1.1],
  [0.46, SEAT.x, SEAT.y - 12, 2.2, 0.17],
  [0.58, SEAT.x, SEAT.y - 12, 2.2, 0.17],
  [0.84, EV.x + 800 * EV.k, EV.y + 348 * EV.k, 0.66, 0.17, 0.5],
  [1.00, EV.x + 800 * EV.k, EV.y + 348 * EV.k, 0.66, 0.17, 0.5],
];

/* ---------- assets ---------- */
const IM = {};
const SRC = { machine: 'machine.webp', platen: 'platen.webp', bag: 'bag.webp', busbar: 'busbar.webp', evPhantom: 'ev-phantom.webp', evSolid: 'ev-solid.webp', pellets: 'pellets.webp', pile: 'pile.webp' };
let partSide = null, pilePat = null;
const ATLAS = { cell: 96, cols: 5, rows: 5 };

function load() {
  return Promise.all(Object.entries(SRC).map(([k, f]) => new Promise((res, rej) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { IM[k] = im; res(); };
    im.onerror = () => rej(new Error('missing ' + f));
    im.src = ASSETS + f;
  })));
}

/* ---------- tear line (bag image px) ---------- */
const tear = [];
{
  const r = rng(7), iw = 547;
  let y = BAG.tearY, drift = 0;
  for (let x = -12; x <= iw + 12; x += 7) {
    drift = drift * 0.82 + (r() - 0.5) * 9;
    tear.push([x + (r() - 0.5) * 3, y + drift + (r() - 0.5) * 6]);
  }
}
const tearBack = tear.map(([x, y], i) => { const r = rng(900 + i)(); return [x, y + (r - 0.5) * 8]; });

/* ---------- state ---------- */
let vw = 0, vh = 0, dpr = 1, base = 1, wide = true;
let pT = 0, pS = 0;                 // target / smoothed progress
let phase = 0;                      // screw phase, in pitches
let last = 0, clock = 0;
const parts = [];                   // falling pellets
let emitAcc = 0;

function resize() {
  vw = stage.clientWidth; vh = stage.clientHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  while (vw * vh * dpr * dpr > 5.2e6 && dpr > 1) dpr -= 0.25;
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  wide = vw / vh > 1.05 && vw >= 832;
  base = wide ? Math.min(vw / 1600, vh / 900) : vw / 800;
}
let held = null;                    // ?p=0.4&hold pins the story at one moment without scrolling (for captures)
const px = (el, prop) => parseFloat(getComputedStyle(el)[prop]) || 0;
const stickGap = () => px(stage, 'top') - px(story, 'paddingTop');      // where the stage pins, relative to the section's top
const storyMax = () => story.clientHeight - px(story, 'paddingTop') - stage.clientHeight;
const storyTop = () => window.scrollY + story.getBoundingClientRect().top - stickGap();
function readScroll() {
  if (held !== null) { pT = held; return; }
  const max = storyMax();
  pT = max > 0 ? clamp((stickGap() - story.getBoundingClientRect().top) / max) : 0;
}

function camAt(p, e) {
  const keys = e > 0 ? CAM2 : CAM, v = e > 0 ? e : p;
  let i = 0;
  while (i < keys.length - 2 && v > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], t = sm(a[0], b[0], v);
  const zoom = k => Math.log((!wide && k[5]) || k[3]);
  return { x: lerp(a[1], b[1], t), y: lerp(a[2], b[2], t), z: Math.exp(lerp(zoom(a), zoom(b), t)), ox: lerp(a[4], b[4], t) };
}

/* ---------- scroll-driven quantities ---------- */
const moldOpen = p => 1 - sm(0.635, 0.69, p) + sm(0.80, 0.855, p);
const hopLevel = p => 0.9 * sm(0.315, 0.50, p) - 0.3 * sm(0.52, 0.80, p);
const pourAmt = p => sm(0.285, 0.325, p) * (1 - sm(0.465, 0.50, p));
const runAmt = p => sm(0.33, 0.38, p) * (1 - sm(0.70, 0.71, p) + sm(0.755, 0.77, p)) * (1 - sm(0.84, 0.88, p));
const heatAmt = p => sm(0.35, 0.50, p) * (1 - sm(0.86, 0.90, p));

function bagPose(p) {
  const k = sm(0.17, 0.31, p), e = sm(0.50, 0.585, p);
  const pour = pourAmt(p);
  return {
    x: lerp(1060, 1140, k) - 150 * e,
    y: lerp(-120, -60, k) - 260 * e,
    th: (125 * k - 55 * e) * DEG + Math.sin(clock * 21) * 0.007 * pour,
    a: 1 - sm(0.2, 1, e),
    sx: 1 - 0.07 * sm(0.32, 0.50, p),
  };
}
function bagToWorld(pose, lx, ly) {
  const sc = BAG.w / 547;
  const dx = (lx - 273.5) * sc * pose.sx, dy = (ly - 448.5) * sc;
  const c = Math.cos(pose.th), s = Math.sin(pose.th);
  return [pose.x + dx * c - dy * s, pose.y + dx * s + dy * c];
}

/* ---------- hopper ---------- */
function hopperPath() {
  const h = HOP;
  ctx.beginPath();
  ctx.moveTo(h.xl, h.rimY); ctx.lineTo(h.xr, h.rimY); ctx.lineTo(h.xr, h.cylY); ctx.lineTo(h.tr, h.coneY);
  ctx.lineTo(h.tr, h.throatY); ctx.lineTo(h.tl, h.throatY); ctx.lineTo(h.tl, h.coneY); ctx.lineTo(h.xl, h.cylY); ctx.closePath();
}
function hopWalls(y) {
  const h = HOP;
  if (y <= h.cylY) return [h.xl, h.xr];
  if (y >= h.coneY) return [h.tl, h.tr];
  const t = (y - h.cylY) / (h.coneY - h.cylY);
  return [lerp(h.xl, h.tl, t), lerp(h.xr, h.tr, t)];
}
function surfaceY(x, level) {
  const h = HOP;
  const flat = lerp(h.throatY, h.rimY + 20, Math.pow(clamp(level), 0.75));
  return flat - 13 * clamp(level * 3) * Math.exp(-(((x - h.hitX) / 46) ** 2)) + Math.sin(x * 0.21) * 1.6;
}
function drawHopper(a, p) {
  if (a <= 0.003) return;
  const h = HOP, level = hopLevel(p);
  ctx.save(); ctx.globalAlpha = a;
  hopperPath();
  let g = ctx.createLinearGradient(h.xl, 0, h.xr, 0);
  g.addColorStop(0, '#0f1214'); g.addColorStop(0.45, '#2b3136'); g.addColorStop(1, '#0d1012');
  ctx.fillStyle = g; ctx.fill();
  if (level > 0.004) {
    ctx.save(); hopperPath(); ctx.clip();
    ctx.beginPath(); ctx.moveTo(h.xl - 4, h.throatY + 4);
    for (let x = h.xl - 4; x <= h.xr + 4; x += 6) ctx.lineTo(x, surfaceY(x, level));
    ctx.lineTo(h.xr + 4, h.throatY + 4); ctx.closePath();
    pilePat.setTransform(new DOMMatrix([0.42, 0, 0, 0.42, 1100, (clock * 5 * runAmt(p)) % (396 * 0.42)]));
    ctx.fillStyle = pilePat; ctx.fill();
    g = ctx.createLinearGradient(h.xl, 0, h.xr, 0);
    g.addColorStop(0, 'rgba(8,10,12,.5)'); g.addColorStop(0.3, 'rgba(8,10,12,0)'); g.addColorStop(0.7, 'rgba(8,10,12,0)'); g.addColorStop(1, 'rgba(8,10,12,.5)');
    ctx.fillStyle = g; ctx.fill();
    g = ctx.createLinearGradient(0, h.cylY, 0, h.throatY);
    g.addColorStop(0, 'rgba(8,10,12,0)'); g.addColorStop(1, 'rgba(8,10,12,.45)');
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
  }
  hopperPath(); ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = 'rgba(236,241,243,.8)'; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.restore();
}

/* ---------- pellet stream ---------- */
function emit(pose, n) {
  for (let i = 0; i < n; i++) {
    const u = 0.52 + 0.46 * Math.pow(Math.random(), 0.7);
    const [x, y] = bagToWorld(pose, 547 * u, BAG.tearY + 6);
    const sp = 70 + Math.random() * 80, c = Math.cos(pose.th), s = Math.sin(pose.th);
    parts.push({
      x, y, vx: s * sp + (Math.random() - 0.5) * 34, vy: -c * sp + (Math.random() - 0.5) * 30,
      r: Math.random() * TAU, vr: (Math.random() - 0.5) * 9, i: (Math.random() * 25) | 0, s: 11.5 + Math.random() * 3.5, t: 0,
    });
  }
}
function stepParts(dt, p) {
  const level = hopLevel(p);
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i];
    q.vy += G * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt; q.t += dt;
    let dead = q.t > 2.5 || q.y > 520;
    if (q.y > HOP.rimY && q.x > HOP.xl - 30 && q.x < HOP.xr + 30) {
      const [l, r] = hopWalls(q.y);
      if (q.x < l + 4) { q.x = l + 4; q.vx = Math.abs(q.vx) * 0.25; }
      if (q.x > r - 4) { q.x = r - 4; q.vx = -Math.abs(q.vx) * 0.25; }
      if (q.y >= surfaceY(q.x, level) - 2) dead = true;
    }
    if (dead) parts.splice(i, 1);
  }
}
function drawParts() {
  if (!parts.length) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(-4000, -4000, 9000, 4000 + HOP.rimY);
  const h = HOP;
  ctx.moveTo(h.xl, h.rimY - 1); ctx.lineTo(h.xr, h.rimY - 1); ctx.lineTo(h.xr, h.cylY); ctx.lineTo(h.tr, h.coneY);
  ctx.lineTo(h.tr, h.throatY); ctx.lineTo(h.tl, h.throatY); ctx.lineTo(h.tl, h.coneY); ctx.lineTo(h.xl, h.cylY); ctx.closePath();
  ctx.clip();
  const c = ATLAS.cell;
  for (const q of parts) {
    const co = Math.cos(q.r), si = Math.sin(q.r);
    ctx.setTransform(T.a * co, T.a * si, -T.a * si, T.a * co, T.a * q.x + T.e, T.a * q.y + T.f);
    ctx.drawImage(IM.pellets, (q.i % 5) * c, ((q.i / 5) | 0) * c, c, c, -q.s / 2, -q.s / 2, q.s, q.s);
  }
  ctx.restore();
  applyT();
}

/* ---------- bag ---------- */
function tearLine(pts, rev) {
  if (rev) for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1]);
  else for (let i = 0; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}
function bagLocal(pose) {
  const sc = BAG.w / 547;
  ctx.translate(pose.x, pose.y); ctx.rotate(pose.th); ctx.scale(sc * pose.sx, sc); ctx.translate(-273.5, -448.5);
}
/* the opening: back wall and the pellets inside, seen between the two torn edges */
function drawBagInside(pose, p) {
  const tT = lin(0.07, 0.17, p);
  if (tT <= 0 || pose.a <= 0) return;
  const open = 52 * sm(0, 0.7, tT) + 26 * sm(0.17, 0.31, p);
  const up = i => open * (0.2 + 0.8 * Math.sin(Math.PI * clamp(i / (tear.length - 1))));
  ctx.save(); ctx.globalAlpha = pose.a; bagLocal(pose);
  ctx.beginPath();
  ctx.moveTo(tear[0][0], tear[0][1]); tearLine(tear);
  for (let i = tearBack.length - 1; i >= 0; i--) ctx.lineTo(tearBack[i][0], tearBack[i][1] - up(i));
  ctx.closePath();
  let g = ctx.createLinearGradient(0, BAG.tearY - open, 0, BAG.tearY + 8);
  g.addColorStop(0, '#b7a183'); g.addColorStop(1, '#4a3d2e');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.beginPath(); ctx.moveTo(tear[0][0], tear[0][1] + 10); tearLine(tear);
  ctx.lineTo(tear[tear.length - 1][0], tear[tear.length - 1][1] + 10);
  for (let i = tearBack.length - 1; i >= 0; i--) ctx.lineTo(tearBack[i][0], tearBack[i][1] - up(i) * 0.62 + Math.sin(i * 1.7) * 3);
  ctx.closePath();
  pilePat.setTransform(new DOMMatrix([1.25, 0, 0, 1.25, 30, 60]));
  ctx.fillStyle = pilePat; ctx.fill();
  g = ctx.createLinearGradient(0, BAG.tearY - open, 0, BAG.tearY + 10);
  g.addColorStop(0, 'rgba(20,16,12,.55)'); g.addColorStop(0.6, 'rgba(20,16,12,.1)'); g.addColorStop(1, 'rgba(20,16,12,.4)');
  ctx.fillStyle = g; ctx.fillRect(-20, BAG.tearY - open - 20, 600, open + 60);
  ctx.restore();
  ctx.restore();
}
function tornEdge(sign) {
  ctx.beginPath(); ctx.moveTo(tear[0][0], tear[0][1]); tearLine(tear);
  ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(0, -1.6 * sign); ctx.strokeStyle = '#bfa67e'; ctx.lineWidth = 2.2; ctx.stroke(); ctx.restore();
  ctx.strokeStyle = '#f6f3ec'; ctx.lineWidth = 2.6; ctx.stroke();
}
function drawBag(pose, p) {
  if (pose.a <= 0) return;
  const im = IM.bag, tT = lin(0.07, 0.17, p);
  ctx.save(); ctx.globalAlpha = pose.a; bagLocal(pose);
  if (tT <= 0) { ctx.drawImage(im, 0, 0); ctx.restore(); return; }
  // body
  ctx.save();
  ctx.beginPath(); ctx.moveTo(tear[0][0], tear[0][1]); tearLine(tear);
  ctx.lineTo(600, 960); ctx.lineTo(-60, 960); ctx.closePath(); ctx.clip();
  ctx.drawImage(im, 0, 0);
  ctx.restore();
  tornEdge(1);
  // strip: hinges on its right end while it rips, then flies off
  const fly = lin(0.125, 0.225, p);
  const sa = pose.a * (1 - sm(0.45, 1, fly));
  if (sa > 0.003) {
    const hinge = tear[tear.length - 1];
    const e = easeOut(fly);
    ctx.globalAlpha = sa;
    ctx.translate(hinge[0] + 260 * e, hinge[1] - 430 * e);
    ctx.rotate(0.27 * sm(0, 0.75, tT) + 1.15 * e);
    ctx.translate(-hinge[0], -hinge[1]);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(tear[0][0], tear[0][1]); tearLine(tear);
    ctx.lineTo(600, -60); ctx.lineTo(-60, -60); ctx.closePath(); ctx.clip();
    ctx.drawImage(im, 0, 0);
    ctx.restore();
    tornEdge(-1);
  }
  ctx.restore();
}

/* ---------- barrel cutaway ---------- */
const borePellets = [];
{ const r = rng(42); for (let i = 0; i < 170; i++) borePellets.push({ u: r(), v: r(), side: r() < 0.5 ? -1 : 1, i: (r() * 25) | 0, rot: r() * TAU }); }
const MELT_FULL = 1000, MELT_NONE = 1120;
const rootHalf = x => lerp(15.5, 8.5, lin(BORE.x0 + 30, BORE.x1, x));
const MELT = [255, 228, 190];

function drawBarrel(a, p) {
  if (a <= 0.003) return;
  const { x0, x1, cy, r, pitch } = BORE;
  const ram = 20 * (sm(0.705, 0.745, p) - sm(0.75, 0.80, p));
  const front = lerp(1240, x0, lin(0.34, 0.60, p));
  const has = p > 0.335, heat = heatAmt(p), shot = sm(0.55, 0.62, p);
  const xs = x0 + 26;
  ctx.save(); ctx.globalAlpha = a;
  // nozzle channel
  ctx.fillStyle = '#07090a'; ctx.fillRect(846, cy - 3.2, x0 - 846 + 2, 6.4);
  if (shot > 0) { ctx.fillStyle = `rgba(${MELT},${shot})`; ctx.fillRect(846, cy - 2.2, x0 - 846 + 2, 4.4); }
  rr(x0 - 3, cy - r - 3, x1 - x0 + 6, 2 * r + 6, 8); ctx.fillStyle = 'rgba(6,8,9,.92)'; ctx.fill();
  ctx.save(); rr(x0, cy - r, x1 - x0, 2 * r, 5); ctx.clip();
  let g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, '#262c30'); g.addColorStop(0.5, '#0f1214'); g.addColorStop(1, '#21272b');
  ctx.fillStyle = g; ctx.fillRect(x0, cy - r, x1 - x0, 2 * r);

  if (has) {
    // melt, building toward the nozzle
    if (front < MELT_NONE) {
      g = ctx.createLinearGradient(MELT_FULL, 0, MELT_NONE, 0);
      g.addColorStop(0, `rgba(${MELT},1)`); g.addColorStop(1, `rgba(${MELT},0)`);
      ctx.fillStyle = g; ctx.fillRect(front, cy - r, MELT_NONE - front, 2 * r);
    }
    // pellets riding the channels
    const L = x1 + 12 - xs, c = ATLAS.cell;
    for (const q of borePellets) {
      const x = x1 + 12 - ((q.u * L + phase * pitch) % L);
      if (x < front) continue;
      const al = sm(MELT_FULL - 12, MELT_NONE, x);
      if (al <= 0.02) continue;
      const rh = rootHalf(x), y = cy + q.side * (rh + 3.5 + q.v * Math.max(0, r - 7 - rh));
      ctx.globalAlpha = a * al;
      ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot + phase * 0.6 * q.side);
      ctx.drawImage(IM.pellets, (q.i % 5) * c, ((q.i / 5) | 0) * c, c, c, -5.2, -5.2, 10.4, 10.4);
      ctx.restore();
    }
    ctx.globalAlpha = a;
  }
  // shot in front of the screw tip
  if (shot > 0) { ctx.fillStyle = `rgba(${MELT},${shot})`; ctx.fillRect(x0, cy - r, xs - ram + 12 - x0, 2 * r); }
  if (heat > 0 && has) {
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createLinearGradient(x0, 0, MELT_NONE + 30, 0);
    g.addColorStop(0, `rgba(255,120,30,${0.3 * heat})`); g.addColorStop(0.7, `rgba(255,120,30,${0.2 * heat})`); g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g; ctx.fillRect(Math.max(front, x0), cy - r, MELT_NONE + 30 - x0, 2 * r);
    ctx.globalCompositeOperation = 'source-over';
  }

  // screw: root, tip, flights
  ctx.save(); ctx.translate(-ram, 0);
  g = ctx.createLinearGradient(0, cy - 16, 0, cy + 16);
  g.addColorStop(0, '#59626a'); g.addColorStop(0.3, '#dfe5e9'); g.addColorStop(0.55, '#929ba1'); g.addColorStop(1, '#3d454b');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x1 + 30, cy - 8.5); ctx.lineTo(xs + 4, cy - 15.5); ctx.lineTo(xs - 4, cy - 12); ctx.lineTo(xs - 20, cy);
  ctx.lineTo(xs - 4, cy + 12); ctx.lineTo(xs + 4, cy + 15.5); ctx.lineTo(x1 + 30, cy + 8.5); ctx.closePath(); ctx.fill();
  const n = Math.ceil((x1 + 40 - xs) / pitch), Lf = n * pitch;
  g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, '#f1f5f7'); g.addColorStop(0.45, '#a9b2b8'); g.addColorStop(1, '#565f65');
  ctx.fillStyle = g;
  for (let k = 0; k < n; k++) {
    const fx = xs + ((((k - phase) * pitch) % Lf) + Lf) % Lf;
    const fa = lin(xs, xs + 12, fx); if (fa <= 0) continue;
    ctx.globalAlpha = a * fa;
    ctx.beginPath(); ctx.moveTo(fx + 5, cy - r + 1); ctx.lineTo(fx + 11.5, cy - r + 1); ctx.lineTo(fx + 1.5, cy + r - 1); ctx.lineTo(fx - 5, cy + r - 1); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = a;
  g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(0.2, 'rgba(0,0,0,0)'); g.addColorStop(0.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = g; ctx.fillRect(x0, cy - r, x1 - x0, 2 * r);
  ctx.restore();
  rr(x0, cy - r, x1 - x0, 2 * r, 5); ctx.strokeStyle = 'rgba(236,241,243,.8)'; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.restore();
}

function drawHeat(p) {
  const heat = heatAmt(p); if (heat <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  HEATERS.forEach((x, i) => {
    const k = heat * (0.75 + 0.25 * Math.sin(clock * 2.3 + i * 1.3));
    const g = ctx.createRadialGradient(x, BORE.cy, 4, x, BORE.cy, 58);
    g.addColorStop(0, `rgba(255,110,30,${0.34 * k})`); g.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 60, BORE.cy - 60, 120, 120);
  });
  // control panel wakes up
  const on = sm(0.30, 0.36, p) * (1 - sm(0.88, 0.92, p));
  const g = ctx.createRadialGradient(1341, 529, 4, 1341, 529, 70);
  g.addColorStop(0, `rgba(110,205,255,${0.42 * on})`); g.addColorStop(1, 'rgba(110,205,255,0)');
  ctx.fillStyle = g; ctx.fillRect(1260, 455, 165, 150);
  ctx.restore();
}

/* ---------- the part: an insert-molded busbar ---------- */
function copperBar(x, y, L, hw) {     // the copper insert seen on edge
  const g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
  g.addColorStop(0, '#8f4e2e'); g.addColorStop(0.45, '#f3b792'); g.addColorStop(1, '#a85c38');
  ctx.fillStyle = g; rr(x - hw, y - L, hw * 2, 2 * L, Math.min(hw, 1)); ctx.fill();
}
function bodyRect(x, y, L, hw) { rr(x - hw, y - L * PART.body, hw * 2, 2 * L * PART.body, 1.5); }

/* one photo of the part, turned by squashing it: phi about the vertical axis, psi about the horizontal one */
function drawPart(st) {
  if (st.a <= 0.003) return;
  const { x, y, L } = st, c = Math.cos(st.phi), si = Math.sin(st.phi), w = Math.abs(c), cy = Math.cos(st.psi), sy = Math.sin(st.psi);
  const edge = 1 - sm(0.06, 0.24, w), face = sm(0.02, 0.16, w);
  ctx.save();
  if (edge > 0) {       // standing in the mold, seen on edge: copper running through the resin body
    ctx.globalAlpha = st.a * edge;
    const hw = MOLD.T / 2 * (L / PART.moldL) * Math.max(0.4, Math.abs(si));
    copperBar(x, y, L, hw * 0.3);
    const g = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
    g.addColorStop(0, '#cfcbbb'); g.addColorStop(0.42, '#f8f5ea'); g.addColorStop(1, '#c2beae');
    ctx.fillStyle = g; bodyRect(x, y, L, hw); ctx.fill();
    ctx.strokeStyle = 'rgba(110,106,92,.5)'; ctx.lineWidth = 0.55; ctx.beginPath();
    for (const f of [-0.42, -0.2, 0.2, 0.42]) { ctx.moveTo(x - hw, y + f * L); ctx.lineTo(x + hw, y + f * L); }
    ctx.stroke();
  }
  if (face > 0) {
    ctx.globalAlpha = st.a * face;
    const n = 8, th = L * 0.06, nx = th / 2 * Math.abs(si) * (c * si >= 0 ? 1 : -1), ny = th / 2 * sy, h = L / PART.asp;
    for (let i = 0; i <= n; i++) {
      ctx.save(); ctx.translate(x + lerp(-nx, nx, i / n), y + lerp(ny, -ny, i / n));
      ctx.scale(Math.max(w, 0.02), Math.max(cy, 0.02)); ctx.rotate(st.spin);
      ctx.drawImage(i === n ? IM.busbar : partSide, -L, -h, 2 * L, 2 * h);
      ctx.restore();
    }
  }
  ctx.restore();
}
function partState(p, e) {
  if (p < 0.80) return null;
  const face = MOLD.faceOpen + PLATEN.travel * (1 - moldOpen(p));
  const xe = face + 3 + 20 * sm(0.855, 0.875, p);
  const u = lin(0.875, 0.975, p);
  if (u <= 0) return { x: xe, y: MOLD.cy, L: PART.moldL, phi: 90 * DEG, psi: 0, spin: 90 * DEG, u, a: 1 };
  const f = lin(0, 0.7, u);
  let y = lerp(MOLD.cy, LAND.y, f * f);
  if (u > 0.7) { const b = (u - 0.7) / 0.3; y = LAND.y - 26 * Math.abs(Math.sin(b * Math.PI * 2)) * (1 - b) ** 2; }
  const st = {
    x: lerp(xe, LAND.x, sm(0, 0.75, u)), y, L: lerp(PART.moldL, PART.heroL, sm(0.05, 0.85, u)),
    phi: (90 - 450 * easeOut(lin(0, 0.82, u))) * DEG, psi: 0, spin: 90 * DEG * (1 - sm(0.1, 0.8, u)), u, a: 1,
  };
  if (!reduce) st.y += Math.sin(clock * 1.3) * 5 * sm(0.95, 1, u) * (1 - sm(0, 0.12, e));
  if (e > 0) {          // on to the car: shrink, lie flat, drop onto the pack
    const m = sm(0.10, 0.46, e), drop = 1 - sm(0.46, 0.52, e);
    st.x = lerp(LAND.x, SEAT.x, m);
    st.y = lerp(st.y, SEAT.y - 30 * drop, m) - 60 * Math.sin(Math.PI * m);
    st.L = lerp(PART.heroL, PART.seatL, m);
    st.psi = 74 * DEG * sm(0.18, 0.46, e);
    st.spin = -0.14 * Math.sin(Math.PI * m);
    st.a = 1 - sm(0.70, 0.84, e);
  }
  return st;
}

/* ---------- mold cutaway ---------- */
function drawMoldCut(a, p) {
  if (a <= 0.003) return;
  const x = MOLD.part, y = MOLD.cy, L = PART.moldL, hw = MOLD.T / 2;
  const sprue = lin(0.705, 0.717, p), cav = sm(0.715, 0.75, p), cool = sm(0.75, 0.785, p);
  const col = `rgb(${Math.round(lerp(255, 246, cool))},${Math.round(lerp(214, 243, cool))},${Math.round(lerp(160, 232, cool))})`;
  const spruePath = () => { ctx.beginPath(); ctx.moveTo(848, BORE.cy - 2.4); ctx.lineTo(x + 5, y - 4.2); ctx.lineTo(x + 5, y + 4.2); ctx.lineTo(848, BORE.cy + 2.4); ctx.closePath(); };
  ctx.save(); ctx.globalAlpha = a;
  rr(x - 24, y - 66, 48, 132, 8); ctx.fillStyle = 'rgba(6,8,9,.92)'; ctx.fill();
  ctx.strokeStyle = 'rgba(236,241,243,.8)'; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 66); ctx.lineTo(x, y + 66); ctx.strokeStyle = 'rgba(236,241,243,.18)'; ctx.lineWidth = 0.8; ctx.stroke();
  spruePath(); ctx.fillStyle = '#07090a'; ctx.fill();
  bodyRect(x, y, L, hw); ctx.fillStyle = '#1f2529'; ctx.fill();
  if (sprue > 0) {
    ctx.save(); spruePath(); ctx.clip(); ctx.fillStyle = col;
    const xl = lerp(848, x + 5, sprue); ctx.fillRect(xl, y - 8, 848 - xl, 16); ctx.restore();
  }
  if (cav > 0) {
    const half = L * PART.body * cav;
    ctx.save(); bodyRect(x, y, L, hw); ctx.clip();
    ctx.fillStyle = col; ctx.fillRect(x - 20, y - half, 40, 2 * half);
    ctx.restore();
  }
  copperBar(x, y, L, hw * 0.3);      // the insert sits in the mold before the shot and stays through it
  const glow = (1 - cool) * cav;
  if (glow > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 2, x, y, 80);
    g.addColorStop(0, `rgba(255,130,40,${0.4 * glow})`); g.addColorStop(1, 'rgba(255,130,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 80, y - 80, 160, 160);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/* ---------- the car ---------- */
/* the see-through render sits on black and is added onto the dark page; the finished car is a cutout drawn the plain way */
function drawEV(e) {
  const solid = sm(0.70, 0.86, e), ph = sm(0.12, 0.30, e) * (1 - solid);
  if (ph <= 0.003 && solid <= 0.003) return;
  ctx.save();
  const vis = Math.max(ph, solid), [gx, gy] = evp(800, 638);
  ctx.save(); ctx.translate(gx, gy); ctx.scale(1, 0.05);      // shadow on the floor
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 720);
  sg.addColorStop(0, `rgba(0,0,0,${0.7 * vis})`); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.fillRect(-720, -720, 1440, 1440); ctx.restore();
  if (ph > 0.003) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ph; ctx.drawImage(IM.evPhantom, EV.x, EV.y, EV.w, EV.h); ctx.globalCompositeOperation = 'source-over'; }
  if (solid > 0.003) { ctx.globalAlpha = solid; ctx.drawImage(IM.evSolid, EV.x, EV.y, EV.w, EV.h); }
  ctx.globalCompositeOperation = 'lighter';
  const live = sm(0.52, 0.57, e) * (1 - solid);       // current running through the high-voltage line
  if (live > 0.003) {
    ctx.globalAlpha = live; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); HV.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = 'rgba(110,205,255,.32)'; ctx.lineWidth = 10; ctx.stroke();
    ctx.setLineDash([26, 58]); ctx.lineDashOffset = reduce ? 0 : -clock * 150;
    ctx.strokeStyle = 'rgba(200,242,255,.95)'; ctx.lineWidth = 3.2; ctx.stroke(); ctx.setLineDash([]);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 320);
    g.addColorStop(0, 'rgba(110,205,255,.2)'); g.addColorStop(1, 'rgba(110,205,255,0)');
    ctx.save(); ctx.translate(SEAT.x, SEAT.y); ctx.scale(1, 0.3); ctx.fillStyle = g; ctx.fillRect(-320, -320, 640, 640); ctx.restore();
  }
  const fl = sm(0.50, 0.525, e) * (1 - sm(0.525, 0.61, e));     // the moment it seats
  if (fl > 0.003) {
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(SEAT.x, SEAT.y, 2, SEAT.x, SEAT.y, 130);
    g.addColorStop(0, `rgba(255,214,170,${0.8 * fl})`); g.addColorStop(1, 'rgba(255,214,170,0)');
    ctx.fillStyle = g; ctx.fillRect(SEAT.x - 130, SEAT.y - 130, 260, 260);
  }
  const hl = sm(0.86, 0.95, e);
  if (hl > 0.003) {
    ctx.globalAlpha = 1;
    const lamp = ([x, y], r, rgb, k) => {
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${k * hl})`); g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    };
    lamp(evp(1469, 343), 58, '205,232,255', 0.7);
    lamp(evp(136, 306), 52, '255,48,36', 0.55);
  }
  ctx.restore();
}

/* ---------- frame ---------- */
const T = { a: 1, e: 0, f: 0 };      // world → device transform
function applyT() { ctx.setTransform(T.a, 0, 0, T.a, T.e, T.f); }

function draw(p, e) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cam = camAt(p, e), ox = wide ? cam.ox : 0, oy = wide ? 0.5 : 0.41;   // narrow screens keep the bottom for text
  let g = ctx.createRadialGradient(vw * (0.5 + ox), vh * (oy - 0.04), 0, vw * (0.5 + ox), vh * (oy - 0.04), Math.max(vw, vh) * 0.72);
  g.addColorStop(0, '#2a3236'); g.addColorStop(0.55, '#1a1f22'); g.addColorStop(1, '#14181a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);

  const k = base * cam.z;
  T.a = dpr * k; T.e = dpr * (vw * (0.5 + ox) - cam.x * k); T.f = dpr * (vh * oy - cam.y * k);
  applyT();

  const mA = 1 - sm(0.905, 0.965, p);
  if (mA > 0.003) {
    ctx.globalAlpha = mA;
    // ground shadow
    g = ctx.createRadialGradient(790, 0, 0, 790, 0, 760);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(0, 826); ctx.scale(1, 0.045); ctx.fillStyle = g; ctx.fillRect(0, -760, 1600, 1520); ctx.restore();
    ctx.drawImage(IM.machine, MACHINE.x, MACHINE.y, MACHINE.w, MACHINE.h);
    const shift = PLATEN.travel * (1 - moldOpen(p));
    ctx.drawImage(IM.platen, PLATEN.x + shift, PLATEN.y, PLATEN.w, PLATEN.h);
    ctx.globalAlpha = 1;
    drawHeat(p);
    const xr = mA * (1 - sm(0.885, 0.92, p));
    drawHopper(xr * sm(0.245, 0.295, p), p);
    drawBarrel(xr * sm(0.30, 0.35, p), p);
    drawMoldCut(sm(0.685, 0.705, p) * (1 - sm(0.787, 0.80, p)), p);
  }

  const pose = bagPose(p);
  drawBagInside(pose, p);
  drawParts();
  drawBag(pose, p);

  drawEV(e);
  const st = partState(p, e);
  if (st) {
    const sh = (1 - sm(0, 0.12, e)) * sm(0.35, 0.9, st.u);
    if (sh > 0.003) {   // contact shadow under the part at rest
      const d = clamp(1 - (LAND.y - st.y) / 420), r = st.L * 1.05;
      ctx.save(); ctx.translate(st.x, LAND.y + PART.heroL / PART.asp + 34); ctx.scale(1, 0.09);
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(0,0,0,${0.6 * d * d * sh})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r); ctx.restore();
    }
    drawPart(st);
  }
}

/* ---------- captions + rail ---------- */
const caps = [...document.querySelectorAll('.cap')].map(el => ({ el, a: +el.dataset.from, b: +el.dataset.to }));
const rail = [...document.querySelectorAll('.rail li')].map(el => ({ el, at: +el.dataset.at }));
const hint = document.getElementById('hint');
const scrim = document.querySelector('.scrim');
function ui(p) {
  const fw = 0.014;
  let top = 0;
  for (const c of caps) {
    const i = sm(c.a, c.a + fw, p), o = sm(c.b - fw, c.b, p), op = i * (1 - o);
    c.el.style.opacity = op.toFixed(3);
    c.el.style.setProperty('--dy', ((1 - i) * 18 - o * 18).toFixed(1) + 'px');
    c.el.classList.toggle('on', op > 0.01);
    if (op > top) top = op;
  }
  scrim.style.opacity = top.toFixed(3);   // the scrim is only there to carry the text
  rail.forEach((r, i) => {
    const end = i < rail.length - 1 ? rail[i + 1].at : 0.97;
    r.el.style.setProperty('--f', lin(r.at, end, p).toFixed(3));
    r.el.classList.toggle('on', p >= r.at);
  });
  if (hint) hint.style.opacity = p < 0.015 ? 1 : 0;
}

/* ---------- loop ---------- */
let live = false, looping = false;     // the loop only runs while the story is on screen
function frame(now) {
  if (!live) { looping = false; return; }
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; clock += dt;
  autoStep(dt);
  readScroll();
  pS = reduce ? pT : pS + (pT - pS) * (1 - Math.exp(-dt * 8));
  if (Math.abs(pT - pS) < 0.00005) pS = pT;
  const p = Math.min(pS / K, 1), e = clamp((pS - K) / (1 - K));   // first leg, second leg
  phase += dt * 1.5 * runAmt(p);
  const pour = pourAmt(p);
  if (pour > 0.01) {
    emitAcc += dt * 460 * pour;
    const n = emitAcc | 0; emitAcc -= n;
    if (n) emit(bagPose(p), Math.min(n, 40));
  }
  stepParts(dt, p);
  draw(p, e);
  ui(pS);
  requestAnimationFrame(frame);
}

/* ---------- auto play ---------- */
const playBtn = document.getElementById('play');
let auto = false;
function setAuto(on) {
  auto = on;
  if (!playBtn) return;
  playBtn.setAttribute('aria-pressed', String(on));
  playBtn.querySelector('.play-tx').textContent = on ? '일시 정지' : '자동 재생';
}
function autoStep(dt) {
  if (!auto) return;
  const max = storyMax(), top = storyTop();
  const y = window.scrollY + (max / 46) * dt;
  if (y >= top + max) { window.scrollTo(0, top + max); setAuto(false); return; }
  window.scrollTo(0, y);
}
if (playBtn) playBtn.addEventListener('click', () => {
  if (!auto && pT > 0.985) window.scrollTo(0, storyTop());
  setAuto(!auto);
});
['wheel', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, e => {
  if (!auto || (playBtn && playBtn.contains(e.target))) return;   // the button's own tap must not cancel what it is about to toggle
  if (!(ev === 'keydown' && (e.key === 'Enter' || e.key === ' ' || e.key === 'Tab'))) setAuto(false);
}, { passive: true }));
const replay = document.getElementById('replay');
if (replay) replay.addEventListener('click', () => {
  setAuto(false); window.scrollTo({ top: storyTop(), behavior: reduce ? 'auto' : 'smooth' });
});

/* ---------- boot ---------- */
/* the images are fetched when the story comes near, and nothing is drawn while it is out of sight */
const loading = document.getElementById('loading');
const HOLD = new URLSearchParams(location.search).has('hold');
let ready = false, asked = false;
function wake() {
  if (!ready || !live || looping) return;
  looping = true;
  requestAnimationFrame(t => { last = t; frame(t); });
}
function boot() {
  if (asked) return;
  asked = true;
  load().then(() => {
    const s = document.createElement('canvas'); s.width = IM.busbar.width; s.height = IM.busbar.height;
    const sc = s.getContext('2d'); sc.drawImage(IM.busbar, 0, 0);
    sc.globalCompositeOperation = 'source-atop'; sc.fillStyle = 'rgba(70,62,54,.5)'; sc.fillRect(0, 0, s.width, s.height);
    partSide = s;
    pilePat = ctx.createPattern(IM.pile, 'repeat');
    resize();
    const q = parseFloat(new URLSearchParams(location.search).get('p'));   // ?p=0.4 opens at that moment
    if (q >= 0 && q <= 1) {
      if (new URLSearchParams(location.search).has('hold')) held = q;
      else { history.scrollRestoration = 'manual'; window.__molding.go(q); }
    }
    readScroll(); pS = pT;
    ready = true;
    if (loading) loading.classList.add('done');
    wake();
  }).catch(err => { if (loading) loading.textContent = '이미지를 불러오지 못했습니다. (' + err.message + ')'; });
}
window.addEventListener('resize', () => { if (ready) resize(); });
new IntersectionObserver(([en]) => { if (en.isIntersecting) boot(); }, { rootMargin: '150% 0px' }).observe(story);
new IntersectionObserver(([en]) => {
  live = en.isIntersecting || HOLD;
  document.documentElement.classList.toggle('in-story', live);     // lets the host page relax its scroll snapping meanwhile
  if (live) wake(); else setAuto(false);
}).observe(story);
if (HOLD) { live = true; boot(); }

// test hook: jump to a progress value from the console or automation
window.__molding = { go: p => { window.scrollTo(0, storyTop() + storyMax() * p); readScroll(); pS = pT; } };
})();
