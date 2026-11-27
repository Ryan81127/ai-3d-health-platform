/**
 * 8-bit 像素科普動畫引擎。
 * 192×108 低解析畫布、PICO-8 16 色調色盤；所有圖形以整數像素繪製，放大時不平滑化。
 * 場景由多個圖層組成，數值參數可寫成 [起, 迄]，會依場景進度自動內插。
 */
export const W = 192, H = 108;
export const PAL = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'];
export const FONT = 'Cubic11';

export type Num = number | [number, number];
export type Layer = [string, Record<string, unknown>?];
export interface Scene { cap: string; d?: number; layers: Layer[] }
export interface Movie { title: string; scenes: Scene[] }

const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
export function v(n: unknown, p: number, def = 0): number {
  if (Array.isArray(n)) return n[0] + (n[1] - n[0]) * ease(p);
  return typeof n === 'number' ? n : def;
}
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export class G {
  t = 0; // 場景內秒數
  p = 0; // 場景進度 0–1
  constructor(public ctx: CanvasRenderingContext2D) {}
  c(i: number) { return PAL[((i % 16) + 16) % 16]; }
  px(x: number, y: number, c: number) { this.ctx.fillStyle = this.c(c); this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  rect(x: number, y: number, w: number, h: number, c: number) { this.ctx.fillStyle = this.c(c); this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  /** 填滿橢圓（逐列掃描，邊緣為像素階梯） */
  ell(cx: number, cy: number, rx: number, ry: number, c: number) {
    if (rx <= 0 || ry <= 0) return;
    this.ctx.fillStyle = this.c(c);
    const r = Math.round(ry);
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + .3)) ** 2)));
      this.ctx.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1);
    }
  }
  circ(cx: number, cy: number, r: number, c: number) { this.ell(cx, cy, r, r, c); }
  /** 外框＋填色（先畫大一圈的外框色） */
  blob(cx: number, cy: number, rx: number, ry: number, fill: number, edge: number) { this.ell(cx, cy, rx + 1, ry + 1, edge); this.ell(cx, cy, rx, ry, fill); }
  line(x0: number, y0: number, x1: number, y1: number, c: number, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy, n = 0;
    this.ctx.fillStyle = this.c(c);
    for (;;) {
      this.ctx.fillRect(x0 - (w >> 1), y0 - (w >> 1), w, w);
      if ((x0 === x1 && y0 === y1) || n++ > 600) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  /** 有序抖色填滿（8-bit 漸層、淡入） */
  dither(x: number, y: number, w: number, h: number, c: number, amount: number) {
    this.ctx.fillStyle = this.c(c);
    const th = amount * 16;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const X = Math.round(x) + i, Y = Math.round(y) + j;
      if (BAYER[(X & 3) + (Y & 3) * 4] < th) this.ctx.fillRect(X, Y, 1, 1);
    }
  }
  /** 橢圓抖色光暈：越靠中心越密 */
  halo(cx: number, cy: number, rx: number, ry: number, c: number, amount: number) {
    this.ctx.fillStyle = this.c(c);
    for (let j = -Math.round(ry); j <= ry; j++) for (let i = -Math.round(rx); i <= rx; i++) {
      const d = (i / rx) ** 2 + (j / ry) ** 2; if (d > 1) continue;
      const X = Math.round(cx) + i, Y = Math.round(cy) + j;
      if (BAYER[(X & 3) + (Y & 3) * 4] < amount * 16 * (1 - d)) this.ctx.fillRect(X, Y, 1, 1);
    }
  }
  text(s: string, x: number, y: number, c: number, align: CanvasTextAlign = 'left', shadow = 0) {
    const ctx = this.ctx;
    ctx.font = `11px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'top';
    if (shadow >= 0) { ctx.fillStyle = this.c(shadow); ctx.fillText(s, Math.round(x) + 1, Math.round(y) + 1); }
    ctx.fillStyle = this.c(c); ctx.fillText(s, Math.round(x), Math.round(y));
  }
}

/* ------------------------------------------------------------------ */
/* 粒子：小型像素圖樣                                                    */
/* ------------------------------------------------------------------ */
type PDraw = (g: G, x: number, y: number, i: number) => void;
const PART: Record<string, PDraw> = {
  rbc: (g, x, y) => { g.rect(x - 1, y - 1, 3, 3, 8); g.px(x, y, 2); },
  pale: (g, x, y) => { g.rect(x - 1, y - 1, 3, 2, 14); g.px(x, y, 15); },
  glucose: (g, x, y) => { g.rect(x - 1, y - 1, 2, 2, 10); g.px(x + 1, y + 1, 9); },
  insulin: (g, x, y) => { g.rect(x - 1, y, 3, 1, 12); g.px(x - 1, y - 1, 12); g.px(x + 1, y + 1, 12); },
  ldl: (g, x, y) => { g.rect(x - 1, y - 1, 3, 3, 9); g.px(x - 1, y - 1, 10); },
  hdl: (g, x, y) => { g.rect(x, y, 2, 2, 12); g.px(x, y, 7); },
  fat: (g, x, y) => { g.ell(x, y, 2, 2, 10); g.px(x - 1, y - 1, 7); },
  virus: (g, x, y, i) => { g.rect(x - 1, y - 1, 3, 3, 11); const a = (i % 2) ? 0 : 1; g.px(x - 2, y - a, 3); g.px(x + 2, y + a, 3); g.px(x + a, y - 2, 3); g.px(x - a, y + 2, 3); },
  bacteria: (g, x, y, i) => { if (i % 2) { g.rect(x - 2, y, 5, 2, 3); g.px(x - 1, y, 11); } else { g.rect(x, y - 2, 2, 5, 3); g.px(x, y - 1, 11); } },
  crystal: (g, x, y, i) => { const d = i % 3 - 1; g.line(x - 2, y - 2 * d, x + 2, y + 2 * d, 7); },
  pollen: (g, x, y) => { g.rect(x - 1, y - 1, 3, 3, 10); g.px(x - 2, y, 9); g.px(x + 2, y, 9); g.px(x, y - 2, 9); g.px(x, y + 2, 9); },
  acid: (g, x, y) => { g.rect(x, y, 2, 2, 11); g.px(x, y - 1, 10); },
  smoke: (g, x, y) => { g.dither(x - 3, y - 2, 6, 4, 6, .5); },
  water: (g, x, y) => { g.rect(x, y, 2, 3, 12); g.px(x, y, 7); },
  hormone: (g, x, y) => { g.rect(x, y, 2, 2, 9); },
  hormone2: (g, x, y) => { g.rect(x, y, 2, 2, 14); },
  stone: (g, x, y) => { g.rect(x - 1, y - 1, 4, 3, 4); g.px(x, y - 1, 9); },
  spark: (g, x, y, i) => { const c = i % 2 ? 10 : 7; g.px(x, y, c); g.px(x - 1, y, 10); g.px(x + 1, y, 10); g.px(x, y - 1, 10); g.px(x, y + 1, 10); },
  tumor: (g, x, y) => { g.ell(x, y, 3, 2, 13); g.px(x - 1, y - 1, 6); },
  immune: (g, x, y) => { g.ell(x, y, 2, 2, 7); g.px(x, y, 13); },
  plaque: (g, x, y) => { g.ell(x, y, 2, 1, 10); },
  urine: (g, x, y) => { g.rect(x, y, 2, 2, 10); },
  lymph: (g, x, y) => { g.rect(x, y, 2, 2, 11); },
  air: (g, x, y) => { g.px(x, y, 12); g.px(x + 1, y, 7); },
  cell: (g, x, y) => { g.ell(x, y, 3, 3, 15); g.px(x, y, 4); },
  stool: (g, x, y) => { g.ell(x, y, 3, 2, 4); },
  egg: (g, x, y) => { g.circ(x, y, 2, 7); g.px(x, y, 10); },
  follicle: (g, x, y) => { g.circ(x, y, 2, 15); g.px(x, y, 7); },
  noise: (g, x, y, i) => { g.line(x, y - 2, x, y + 2, i % 2 ? 9 : 10); },
};

/** 粒子群移動方式：flow（左→右）、rise、fall、swarm（繞點）、stream（from→to） */
function particles(g: G, P: Record<string, unknown>) {
  const kind = (P.kind as string) ?? 'rbc', draw = PART[kind] ?? PART.rbc;
  const n = Math.round(v(P.n, g.p, 12)), mode = (P.mode as string) ?? 'flow';
  const x = v(P.x, g.p, 0), y = v(P.y, g.p, 0), w = v(P.w, g.p, W), h = v(P.h, g.p, 20), sp = v(P.speed, g.p, 1);
  const tx = v(P.tx, g.p, x), ty = v(P.ty, g.p, y);
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i + 1), r2 = rnd(i + 51), ph = (g.t * .25 * sp + r1) % 1;
    let X = x, Y = y;
    if (mode === 'flow') { X = x + ph * w; Y = y + r2 * h + Math.sin(g.t * 3 + i) * .6; }
    else if (mode === 'rise') { X = x + r2 * w; Y = y + h - ph * h; }
    else if (mode === 'fall') { X = x + r2 * w; Y = y + ph * h; }
    else if (mode === 'swarm') { const a = g.t * sp * (r1 > .5 ? 1 : -1) + i * 2.4; X = x + Math.cos(a) * w * (.3 + r2 * .7); Y = y + Math.sin(a * 1.3) * h * (.3 + r1 * .7); }
    else if (mode === 'stream') { X = x + (tx - x) * ph + (r2 - .5) * h; Y = y + (ty - y) * ph + (r1 - .5) * h; }
    else if (mode === 'still') { X = x + r1 * w; Y = y + r2 * h; }
    else if (mode === 'jitter') { X = x + r1 * w + Math.sin(g.t * 9 + i) * sp; Y = y + r2 * h + Math.cos(g.t * 8 + i) * sp; }
    draw(g, X, Y, i);
  }
}

/* ------------------------------------------------------------------ */
/* 器官與構造：以橢圓、線段組成的像素圖                                       */
/* ------------------------------------------------------------------ */
type ODraw = (g: G, x: number, y: number, s: number, P: Record<string, unknown>) => void;
const tint = (P: Record<string, unknown>, def: number) => (typeof P.c === 'number' ? P.c as number : def);
const ORG: Record<string, ODraw> = {
  heart: (g, x, y, s, P) => {
    const c = tint(P, 8);
    g.blob(x - 5 * s, y - 3 * s, 6 * s, 6 * s, c, 2); g.blob(x + 5 * s, y - 3 * s, 6 * s, 6 * s, c, 2);
    for (let i = 0; i < 12 * s; i++) { const w = (11 * s) * (1 - i / (12 * s)); g.rect(x - w - 1, y + i - 1, w * 2 + 2, 1, 2); g.rect(x - w, y + i - 1, w * 2, 1, c); }
    g.rect(x - 7 * s, y - 6 * s, 2, 2, 7);
  },
  lungs: (g, x, y, s, P) => {
    const c = tint(P, 14);
    g.rect(x - 1, y - 16 * s, 3, 8 * s, 6);
    g.blob(x - 8 * s, y, 7 * s, 12 * s, c, 2); g.blob(x + 8 * s, y, 7 * s, 12 * s, c, 2);
    g.line(x, y - 8 * s, x - 6 * s, y - 2 * s, 7); g.line(x, y - 8 * s, x + 6 * s, y - 2 * s, 7);
  },
  brain: (g, x, y, s, P) => {
    const c = tint(P, 14);
    g.blob(x, y, 15 * s, 10 * s, c, 2);
    for (let i = -2; i <= 2; i++) g.line(x + i * 5 * s - 3, y - 6 * s, x + i * 5 * s + 2, y + 5 * s, 2);
    g.line(x - 12 * s, y, x + 12 * s, y - 1, 2);
    g.rect(x - 2, y + 10 * s, 4, 4 * s, 15);
  },
  liver: (g, x, y, s, P) => { const c = tint(P, 4); g.blob(x - 4 * s, y, 13 * s, 8 * s, c, 2); g.blob(x + 9 * s, y - 2 * s, 7 * s, 5 * s, c, 2); g.ell(x - 3 * s, y + 6 * s, 3 * s, 2 * s, 3); },
  stomach: (g, x, y, s, P) => { const c = tint(P, 15); g.rect(x - 2 * s, y - 16 * s, 4 * s, 10 * s, 14); g.blob(x + 3 * s, y, 10 * s, 8 * s, c, 4); g.blob(x + 10 * s, y + 6 * s, 5 * s, 3 * s, c, 4); },
  gut: (g, x, y, s, P) => {
    const c = tint(P, 14); g.blob(x, y, 15 * s, 12 * s, 2, 2);
    for (let k = 0; k < 5; k++) { const yy = y - 9 * s + k * 4.5 * s; g.rect(x - 12 * s, yy, 24 * s, 3 * s, c); g.rect(x - 12 * s, yy + 2 * s, 24 * s, 1, 15); }
  },
  colon: (g, x, y, s, P) => {
    const c = tint(P, 15), t = 5 * s;
    g.rect(x - 18 * s, y - 12 * s, t, 24 * s, c); g.rect(x - 18 * s, y - 12 * s, 36 * s, t, c); g.rect(x + 13 * s, y - 12 * s, t, 24 * s, c); g.rect(x - 4 * s, y + 8 * s, 22 * s, t, c);
    for (let k = 0; k < 7; k++) { g.rect(x - 18 * s, y - 10 * s + k * 3.4 * s, t, 1, 4); g.rect(x + 13 * s, y - 10 * s + k * 3.4 * s, t, 1, 4); }
  },
  kidney: (g, x, y, s, P) => { const c = tint(P, 4); g.blob(x, y, 6 * s, 9 * s, c, 2); g.ell(x + 5 * s, y, 2 * s, 3 * s, 1); g.line(x + 4 * s, y + 2 * s, x + 6 * s, y + 14 * s, 10); },
  bladder: (g, x, y, s, P) => { const c = tint(P, 15); g.blob(x, y, 9 * s * v(P.fill, g.p, 1), 8 * s * v(P.fill, g.p, 1), c, 4); g.rect(x - 1, y + 8 * s, 3, 8 * s, 15); },
  pancreas: (g, x, y, s, P) => { const c = tint(P, 9); g.blob(x, y, 14 * s, 4 * s, c, 4); g.blob(x - 12 * s, y + 1, 5 * s, 5 * s, c, 4); },
  thyroid: (g, x, y, s, P) => { const c = tint(P, 8); const k = v(P.size, g.p, 1); g.rect(x - 2, y - 14 * s, 4, 28 * s, 6); g.blob(x - 6 * s * k, y, 5 * s * k, 8 * s * k, c, 2); g.blob(x + 6 * s * k, y, 5 * s * k, 8 * s * k, c, 2); g.rect(x - 5 * s, y + 2, 10 * s, 3 * s, c); },
  uterus: (g, x, y, s, P) => {
    const c = tint(P, 14);
    g.line(x - 8 * s, y - 6 * s, x - 22 * s, y - 8 * s, 14, 2); g.line(x + 8 * s, y - 6 * s, x + 22 * s, y - 8 * s, 14, 2);
    g.blob(x - 24 * s, y - 2 * s, 5 * s, 4 * s, 15, 4); g.blob(x + 24 * s, y - 2 * s, 5 * s, 4 * s, 15, 4);
    g.blob(x, y - 2 * s, 10 * s, 9 * s, c, 2); g.rect(x - 3 * s, y + 6 * s, 6 * s, 8 * s, c); g.ell(x, y - 2 * s, 4 * s, 5 * s, 8);
  },
  breast: (g, x, y, s, P) => {
    const c = tint(P, 15); g.rect(x - 22 * s, y + 10 * s, 44 * s, 3, 4);
    for (let r = 14 * s; r > 0; r--) g.rect(x - Math.sqrt(14 * s * 14 * s - (14 * s - r) ** 2) - 1, y + 10 * s - r, 2 * Math.sqrt(14 * s * 14 * s - (14 * s - r) ** 2) + 2, 1, r === 14 * s ? 4 : c);
    for (let i = 0; i < 6; i++) { const a = Math.PI + (i + .5) * Math.PI / 6; g.line(x, y - 2 * s, x + Math.cos(a) * 11 * s, y + 9 * s + Math.sin(a) * 9 * s, 14); g.ell(x + Math.cos(a) * 11 * s, y + 9 * s + Math.sin(a) * 9 * s, 2, 2, 14); }
    g.rect(x - 1, y - 4 * s, 3, 3, 4);
  },
  prostate: (g, x, y, s, P) => { const k = v(P.size, g.p, 1); g.blob(x, y - 12 * s, 10 * s, 8 * s, 15, 4); g.blob(x, y, 6 * s * k, 5 * s * k, 9, 4); g.rect(x - 1, y - 6 * s, 3, 22 * s, 10); },
  eye: (g, x, y, s, P) => { g.blob(x, y, 14 * s, 12 * s, 7, 5); g.ell(x - 11 * s, y, 3 * s, 7 * s, 12); g.ell(x - 7 * s, y, 3 * s, 6 * s, tint(P, 6)); g.ell(x + 13 * s, y, 1, 4 * s, 8); g.rect(x + 14 * s, y - 1, 8 * s, 3, 10); },
  ear: (g, x, y, s) => { g.blob(x - 8 * s, y, 6 * s, 11 * s, 15, 4); g.ell(x - 7 * s, y, 3 * s, 7 * s, 4); g.rect(x - 4 * s, y - 1, 12 * s, 3, 4); for (let i = 0; i < 20; i++) { const a = i * .55, r = 6 * s * (1 - i / 26); g.px(x + 14 * s + Math.cos(a) * r, y + Math.sin(a) * r, 9); } },
  nose: (g, x, y, s, P) => { g.blob(x, y, 16 * s, 12 * s, 15, 4); g.ell(x - 2 * s, y - 3 * s, 9 * s, 2 * s, tint(P, 14)); g.ell(x - 2 * s, y + 3 * s, 10 * s, 2 * s, tint(P, 14)); g.rect(x - 18 * s, y - 2, 4, 5, 15); },
  mouth: (g, x, y, s) => {
    g.blob(x, y, 18 * s, 12 * s, 14, 2); g.ell(x, y + 3 * s, 12 * s, 6 * s, 8);
    for (let i = -5; i <= 5; i++) { g.rect(x + i * 3 * s - 1, y - 9 * s, 3 * s - 1, 4 * s, 7); g.rect(x + i * 3 * s - 1, y + 7 * s, 3 * s - 1, 3 * s, 7); }
  },
  bone: (g, x, y, s, P) => { const c = tint(P, 7); g.rect(x - 14 * s, y - 2 * s, 28 * s, 4 * s, c); g.blob(x - 14 * s, y - 3 * s, 3 * s, 3 * s, c, 6); g.blob(x - 14 * s, y + 3 * s, 3 * s, 3 * s, c, 6); g.blob(x + 14 * s, y - 3 * s, 3 * s, 3 * s, c, 6); g.blob(x + 14 * s, y + 3 * s, 3 * s, 3 * s, c, 6); },
  joint: (g, x, y, s, P) => {
    const gap = v(P.gap, g.p, 3), cart = v(P.cart, g.p, 1);
    g.rect(x - 5 * s, y - 24 * s, 10 * s, 18 * s, 7); g.blob(x, y - 6 * s, 9 * s, 5 * s, 7, 6);
    g.rect(x - 5 * s, y + gap + 6 * s, 10 * s, 18 * s, 7); g.blob(x, y + gap + 6 * s, 9 * s, 4 * s, 7, 6);
    if (cart > .05) { g.rect(x - 8 * s, y - 2 * s, 16 * s * cart, 2, 12); g.rect(x - 8 * s, y + gap + 2 * s, 16 * s * cart, 2, 12); }
  },
  spine: (g, x, y, s, P) => { for (let i = 0; i < 5; i++) { const yy = y - 20 * s + i * 9 * s; g.rect(x - 7 * s, yy, 14 * s, 6 * s, 7); g.rect(x + 7 * s, yy + 1, 5 * s, 3 * s, 6); g.rect(x - 7 * s, yy + 6 * s, 14 * s, 3 * s, i === 3 ? tint(P, 12) : 12); } },
  face: (g, x, y, s) => { g.blob(x, y, 14 * s, 16 * s, 15, 4); g.rect(x - 6 * s, y - 3 * s, 3, 2, 1); g.rect(x + 4 * s, y - 3 * s, 3, 2, 1); g.rect(x - 1, y, 2, 4 * s, 4); g.rect(x - 4 * s, y + 8 * s, 8 * s, 1, 2); },
  gallbladder: (g, x, y, s, P) => { g.blob(x - 6 * s, y - 4 * s, 13 * s, 7 * s, 4, 2); g.blob(x + 2 * s, y + 6 * s, 5 * s, 7 * s, tint(P, 3), 1); g.line(x + 4 * s, y, x + 20 * s, y - 2 * s, 3, 2); },
  leg: (g, x, y, s) => { g.rect(x - 6 * s, y - 30 * s, 12 * s, 58 * s, 15); g.rect(x - 7 * s, y + 26 * s, 16 * s, 5 * s, 15); g.rect(x - 6 * s, y - 2 * s, 12 * s, 3, 4); },
  cell: (g, x, y, s, P) => { g.blob(x, y, 10 * s, 8 * s, tint(P, 15), 4); g.ell(x, y, 3 * s, 3 * s, 2); },
  vesselV: (g, x, y, s, P) => { g.rect(x - 4 * s, y - 40, 8 * s, 80, tint(P, 2)); g.rect(x - 3 * s, y - 40, 6 * s, 80, 8); },
  testis: (g, x, y, s) => { g.blob(x - 5 * s, y, 4 * s, 6 * s, 15, 4); g.blob(x + 5 * s, y, 4 * s, 6 * s, 15, 4); },
  muscle: (g, x, y, s, P) => { const k = v(P.size, g.p, 1); g.blob(x, y, 7 * s * k, 18 * s, tint(P, 8), 2); for (let i = -2; i <= 2; i++) g.line(x + i * 2 * s * k, y - 15 * s, x + i * 2 * s * k, y + 15 * s, 2); g.rect(x - 2, y - 22 * s, 4, 30 * s + 14 * s, 7); },
  foot: (g, x, y, s) => { g.rect(x - 3 * s, y - 18 * s, 8 * s, 18 * s, 15); g.rect(x - 3 * s, y, 26 * s, 7 * s, 15); g.blob(x + 21 * s, y + 3 * s, 4 * s, 4 * s, 15, 4); },
};

/* ------------------------------------------------------------------ */
/* 小圖示 12×12                                                          */
/* ------------------------------------------------------------------ */
const ICON: Record<string, (g: G, x: number, y: number) => void> = {
  burger: (g, x, y) => { g.ell(x, y - 2, 6, 3, 9); g.rect(x - 6, y, 12, 2, 4); g.rect(x - 6, y + 2, 12, 1, 11); g.rect(x - 6, y + 3, 12, 2, 9); },
  soda: (g, x, y) => { g.rect(x - 3, y - 5, 7, 11, 8); g.rect(x - 3, y - 1, 7, 3, 7); g.line(x + 1, y - 9, x + 3, y - 5, 6); },
  salt: (g, x, y) => { g.rect(x - 3, y - 2, 7, 8, 7); g.ell(x, y - 3, 3, 2, 6); g.px(x - 1, y - 4, 0); g.px(x + 1, y - 4, 0); },
  beer: (g, x, y) => { g.rect(x - 3, y - 4, 7, 10, 9); g.rect(x - 3, y - 6, 7, 2, 7); g.rect(x + 4, y - 2, 2, 5, 6); },
  cig: (g, x, y) => { g.rect(x - 6, y, 10, 2, 7); g.rect(x + 4, y, 2, 2, 9); g.dither(x + 5, y - 6, 4, 6, 6, .5); },
  betel: (g, x, y) => { g.ell(x, y, 4, 3, 3); g.ell(x, y, 2, 1, 8); },
  run: (g, x, y, ) => { g.circ(x, y - 6, 2, 15); g.line(x, y - 4, x - 1, y + 1, 12, 2); g.line(x - 1, y + 1, x - 4, y + 6, 12); g.line(x - 1, y + 1, x + 3, y + 5, 12); g.line(x, y - 3, x + 4, y - 1, 15); g.line(x, y - 3, x - 4, y - 2, 15); },
  bed: (g, x, y) => { g.rect(x - 6, y, 13, 3, 13); g.rect(x - 6, y - 3, 4, 3, 7); g.rect(x - 6, y + 3, 1, 2, 5); g.rect(x + 6, y + 3, 1, 2, 5); },
  moon: (g, x, y) => { g.circ(x, y, 5, 10); g.circ(x + 2, y - 2, 4, 1); },
  sun: (g, x, y) => { g.circ(x, y, 4, 10); for (let i = 0; i < 8; i++) g.px(x + Math.cos(i * .785) * 7, y + Math.sin(i * .785) * 7, 9); },
  clock: (g, x, y) => { g.blob(x, y, 5, 5, 7, 5); g.line(x, y, x, y - 4, 0); g.line(x, y, x + 3, y, 0); },
  doctor: (g, x, y) => { g.circ(x, y - 4, 3, 15); g.rect(x - 4, y, 9, 7, 7); g.rect(x - 1, y + 1, 3, 1, 8); g.rect(x, y, 1, 3, 8); },
  pill: (g, x, y) => { g.rect(x - 5, y - 2, 5, 4, 8); g.rect(x, y - 2, 5, 4, 7); },
  syringe: (g, x, y) => { g.rect(x - 5, y - 1, 9, 3, 6); g.line(x + 4, y, x + 7, y, 7); g.rect(x - 7, y - 2, 2, 5, 5); },
  scope: (g, x, y) => { g.line(x - 6, y + 5, x + 4, y - 3, 0, 2); g.circ(x + 5, y - 4, 1, 10); },
  water: (g, x, y) => { g.rect(x - 3, y - 4, 7, 10, 12); g.rect(x - 3, y - 4, 7, 2, 7); },
  scale: (g, x, y) => { g.rect(x - 6, y, 13, 5, 6); g.rect(x - 3, y + 1, 7, 2, 1); g.rect(x - 1, y + 1, 1, 2, 10); },
  tape: (g, x, y) => { g.rect(x - 6, y - 1, 13, 3, 10); for (let i = -5; i < 7; i += 2) g.px(x + i, y - 1, 0); },
  xray: (g, x, y) => { g.rect(x - 6, y - 5, 13, 11, 1); g.line(x - 3, y - 3, x + 3, y + 3, 6); g.line(x + 3, y - 3, x - 3, y + 3, 6); },
  check: (g, x, y) => { g.line(x - 4, y, x - 1, y + 3, 11, 2); g.line(x - 1, y + 3, x + 5, y - 4, 11, 2); },
  cross: (g, x, y) => { g.line(x - 4, y - 4, x + 4, y + 4, 8, 2); g.line(x + 4, y - 4, x - 4, y + 4, 8, 2); },
  warn: (g, x, y) => { for (let i = 0; i < 9; i++) g.rect(x - i / 2, y - 5 + i, i + 1, 1, 10); g.rect(x, y - 2, 1, 3, 0); g.px(x, y + 2, 0); },
  phone: (g, x, y) => { g.rect(x - 6, y - 4, 13, 8, 8); g.text('119', x, y - 6, 7, 'center', -1); },
  veg: (g, x, y) => { g.ell(x, y, 5, 3, 11); g.line(x - 4, y, x + 4, y, 3); g.rect(x + 4, y - 1, 2, 2, 3); },
  fish: (g, x, y) => { g.ell(x, y, 5, 3, 12); g.rect(x + 5, y - 2, 2, 5, 12); g.px(x - 3, y - 1, 0); },
  sunscreen: (g, x, y) => { g.rect(x - 2, y - 5, 5, 11, 9); g.rect(x - 1, y - 7, 3, 2, 7); },
  stethoscope: (g, x, y) => { g.line(x - 4, y - 5, x - 4, y + 1, 6); g.line(x + 4, y - 5, x + 4, y + 1, 6); g.line(x - 4, y + 1, x, y + 5, 6); g.line(x + 4, y + 1, x, y + 5, 6); g.circ(x, y + 5, 2, 6); },
  brain: (g, x, y) => { g.blob(x, y, 6, 4, 14, 2); g.line(x, y - 3, x, y + 3, 2); },
  car: (g, x, y) => { g.rect(x - 6, y - 1, 13, 4, 8); g.rect(x - 3, y - 4, 7, 3, 12); g.rect(x - 5, y + 3, 3, 2, 0); g.rect(x + 3, y + 3, 3, 2, 0); },
  plane: (g, x, y) => { g.rect(x - 6, y - 1, 13, 2, 6); g.rect(x - 1, y - 5, 3, 10, 6); },
  hand: (g, x, y) => { g.rect(x - 3, y - 2, 7, 7, 15); for (let i = 0; i < 4; i++) g.rect(x - 3 + i * 2, y - 6, 1, 4, 15); },
  sock: (g, x, y) => { g.rect(x - 2, y - 6, 5, 10, 13); g.rect(x - 2, y + 3, 8, 3, 13); },
  mic: (g, x, y) => { g.ell(x, y - 2, 3, 4, 6); g.line(x, y + 2, x, y + 6, 6); },
  hearing: (g, x, y) => { g.ell(x, y, 3, 5, 9); g.rect(x - 1, y - 6, 2, 3, 6); },
};

/* ------------------------------------------------------------------ */
/* 像素小人：狀態動畫                                                      */
/* ------------------------------------------------------------------ */
function person(g: G, P: Record<string, unknown>) {
  const x = v(P.x, g.p, 96), y = v(P.y, g.p, 70), st = (P.state as string) ?? 'ok', t = g.t;
  const skin = 15, shirt = typeof P.c === 'number' ? P.c as number : 12;
  let bob = 0, la = .6, ra = .6, ll = .2, rl = .2, lean = 0;
  if (st === 'walk' || st === 'run') { const k = st === 'run' ? 9 : 5; bob = Math.abs(Math.sin(t * k)) * (st === 'run' ? 2 : 1); la = Math.sin(t * k) * 1; ra = -la; ll = Math.sin(t * k) * .7; rl = -ll; }
  if (st === 'tired' || st === 'sad') { lean = 2; la = ra = .15; }
  if (st === 'pain') { la = ra = -.9; }
  if (st === 'cough') { bob = Math.sin(t * 14) > .6 ? 1 : 0; la = -1.2; }
  if (st === 'hot') { la = -1.6; ra = .4; }
  const by = y - bob;
  g.circ(x + lean, by - 18, 4, skin); g.rect(x - 3 + lean, by - 23, 7, 2, 0);
  if (st === 'tired' || st === 'sad' || st === 'sleep') { g.rect(x - 2 + lean, by - 18, 2, 1, 0); g.rect(x + 1 + lean, by - 18, 2, 1, 0); } else { g.px(x - 1 + lean, by - 19, 0); g.px(x + 2 + lean, by - 19, 0); }
  g.rect(x - 3, by - 13, 7, 10, shirt);
  const arm = (ox: number, a: number) => g.line(x + ox, by - 12, x + ox + Math.sin(a) * 6 * Math.sign(ox || 1), by - 12 + Math.cos(a) * 7, skin, 2);
  arm(-4, la); arm(4, ra);
  g.line(x - 1, by - 3, x - 1 + Math.sin(ll) * 5, y + 6, 1, 2); g.line(x + 2, by - 3, x + 2 + Math.sin(rl) * 5, y + 6, 1, 2);
  if (st === 'cough' && Math.sin(t * 14) > .3) particles(g, { kind: 'smoke', n: 2, mode: 'still', x: x + 6, y: by - 18, w: 6, h: 3 });
  if (st === 'hot') { for (let i = 0; i < 3; i++) g.px(x - 5 + i * 5, by - 26 - ((t * 10 + i * 3) % 6), 8); }
  if (st === 'sleep') g.text('z', x + 7, by - 30 - (t * 3 % 4), 7);
  // 不適部位閃爍標示
  const zone = P.zone as string | undefined;
  if (zone && Math.sin(t * 6) > 0) {
    const Z: Record<string, [number, number]> = { head: [0, -18], chest: [0, -10], belly: [0, -5], back: [3, -6], knee: [1, 2], foot: [2, 6], hand: [7, -6], neck: [0, -13], pelvis: [0, -3], leg: [1, 3] };
    const [zx, zy] = Z[zone] ?? [0, 0];
    g.ell(x + zx, by + zy, 3, 2, 8);
  }
}

/* ------------------------------------------------------------------ */
/* 圖層                                                                 */
/* ------------------------------------------------------------------ */
type LDraw = (g: G, P: Record<string, unknown>) => void;
export const LAYERS: Record<string, LDraw> = {
  bg: (g, P) => {
    const c = (P.c as number) ?? 1;
    g.rect(0, 0, W, H, c);
    const pat = P.pat as string | undefined;
    if (pat === 'stars') for (let i = 0; i < 40; i++) g.px(rnd(i) * W, rnd(i + 9) * H, (g.t * 2 + i) % 5 < 1 ? 7 : 5);
    if (pat === 'grid') { for (let x = 0; x < W; x += 12) g.rect(x, 0, 1, H, (P.c2 as number) ?? 0); for (let y = 0; y < H; y += 12) g.rect(0, y, W, 1, (P.c2 as number) ?? 0); }
    if (pat === 'body') { for (let i = 0; i < 70; i++) g.px((rnd(i) * W + g.t * 3) % W, rnd(i + 3) * H, 2); }
    if (pat === 'floor') { g.rect(0, 84, W, 24, (P.c2 as number) ?? 5); for (let x = (-g.t * 8) % 16; x < W; x += 16) g.rect(x, 84, 8, 1, 6); }
    if (pat === 'night') { g.dither(0, 0, W, H, 0, .35); for (let i = 0; i < 25; i++) g.px(rnd(i) * W, rnd(i + 2) * 50, 7); }
  },
  title: (g, P) => {
    const s = (P.text as string) ?? '';
    const a = Math.min(1, g.t * 2);
    g.rect(0, 38, W, 32, 0); g.dither(0, 38, W, 32, 1, .6);
    g.rect(0, 37, W, 1, 12); g.rect(0, 70, W, 1, 12);
    g.text(s, W / 2, 44 - (1 - a) * 6, 10, 'center', 2);
    if (P.sub) g.text(P.sub as string, W / 2, 57, 6, 'center', 0);
  },
  label: (g, P) => {
    const s = (P.text as string) ?? '', x = v(P.x, g.p, 4), y = v(P.y, g.p, 4);
    if (g.p < v(P.at, 0, 0)) return;
    const w = s.length * 11 + 6;
    const al = (P.align as string) ?? 'left', bx = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
    g.rect(bx, y - 1, w, 14, (P.bg as number) ?? 0); g.rect(bx, y + 13, w, 1, (P.edge as number) ?? 12);
    g.text(s, bx + 3, y + 1, (P.c as number) ?? 7, 'left', -1);
  },
  person,
  organ: (g, P) => {
    const draw = ORG[(P.kind as string) ?? 'heart'];
    if (!draw) return;
    let s = v(P.s, g.p, 1);
    const pulse = v(P.pulse, g.p, 0);
    if (pulse) s *= 1 + .06 * Math.max(0, Math.sin(g.t * pulse * 6.283)) ** 4;
    const shake = v(P.shake, g.p, 0);
    const x = v(P.x, g.p, 96) + (shake ? Math.round(Math.sin(g.t * 40) * shake) : 0), y = v(P.y, g.p, 54);
    if (P.glow) { const gl = v(P.glow, g.p, 0); if (gl > .02) g.halo(x, y, 30 * s, 24 * s, (P.gc as number) ?? 8, gl * (.9 + .4 * Math.sin(g.t * 5))); }
    draw(g, x, y, s, P);
  },
  parts: particles,
  vessel: (g, P) => {
    const y = v(P.y, g.p, 54), h = v(P.h, g.p, 26), wall = 4;
    const plaque = v(P.plaque, g.p, 0), narrow = v(P.narrow, g.p, 0);
    g.rect(0, y - h / 2 - wall, W, wall, 2); g.rect(0, y + h / 2, W, wall, 2);
    g.rect(0, y - h / 2 - wall, W, 1, 14); g.rect(0, y + h / 2 + wall - 1, W, 1, 14);
    g.rect(0, y - h / 2, W, h, (P.inner as number) ?? 2); g.dither(0, y - h / 2, W, h, 0, .3);
    // 斑塊：下壁中段隆起
    const px0 = (P.px as number) ?? 96;
    if (plaque > .02) { const ph = plaque * h * .7; for (let dx = -30; dx <= 30; dx++) { const k = Math.cos(dx / 30 * Math.PI / 2); const hh = ph * k; g.rect(px0 + dx, y + h / 2 - hh, 1, hh, 10); g.px(px0 + dx, y + h / 2 - hh, 7); } }
    if (narrow > .02) { const nh = narrow * h * .35; g.rect(0, y - h / 2, W, nh, 2); g.rect(0, y + h / 2 - nh, W, nh, 2); }
    const n = Math.round(v(P.n, g.p, 22)), sp = v(P.flow, g.p, 1);
    const top = y - h / 2 + 2 + narrow * h * .35, bot = y + h / 2 - 2 - narrow * h * .35;
    for (let i = 0; i < n; i++) {
      const r1 = rnd(i), r2 = rnd(i + 40);
      const X = ((r1 * W + g.t * 22 * sp * (.7 + r2 * .6)) % (W + 6)) - 3;
      let lo = top, hi = bot;
      if (plaque > .02 && Math.abs(X - px0) < 30) hi = Math.min(hi, y + h / 2 - plaque * h * .7 * Math.cos((X - px0) / 30 * Math.PI / 2) - 2);
      const Y = lo + r2 * Math.max(1, hi - lo);
      (PART[(P.cells as string) ?? 'rbc'])(g, X, Y, i);
    }
    if (P.clot) { const cx = (P.cx as number) ?? 120; const k = v(P.clot, g.p, 1); g.ell(cx, y, 6 * k, h / 2 * k, 2); g.ell(cx, y, 4 * k, h / 2 * k - 2, 8); }
  },
  gauge: (g, P) => {
    const x = v(P.x, g.p, 150), y = v(P.y, g.p, 10), h = 40, val = v(P.val, g.p, .5);
    g.rect(x, y, 10, h, 0); g.rect(x + 1, y + 1, 8, h - 2, 1);
    const fill = Math.round((h - 4) * val), col = val > .7 ? 8 : val > .45 ? 9 : 11;
    g.rect(x + 2, y + h - 2 - fill, 6, fill, col);
    if (P.text) g.text(P.text as string, x + 5, y + h + 2, 7, 'center', 0);
  },
  icon: (g, P) => {
    const d = ICON[(P.kind as string) ?? 'check']; if (!d) return;
    const at = v(P.at, 0, 0); if (g.p < at) return;
    const x = v(P.x, g.p, 96), y = v(P.y, g.p, 54);
    const pop = Math.min(1, (g.p - at) * 8);
    const bounce = Math.round(Math.sin(Math.min(1, pop) * Math.PI) * -3);
    if (P.box) { g.rect(x - 9, y - 9, 19, 19, 0); g.rect(x - 8, y - 8, 17, 17, (P.box as number)); }
    d(g, x, y + bounce);
    if (P.no) { g.line(x - 8, y - 8, x + 8, y + 8, 8, 2); }
  },
  arrow: (g, P) => {
    const x0 = v(P.x0, g.p), y0 = v(P.y0, g.p), x1 = v(P.x1, g.p), y1 = v(P.y1, g.p), c = (P.c as number) ?? 10;
    if (P.blink && Math.sin(g.t * 8) < 0) return;
    g.line(x0, y0, x1, y1, c, 2);
    const a = Math.atan2(y1 - y0, x1 - x0);
    g.line(x1, y1, x1 - Math.cos(a - .5) * 5, y1 - Math.sin(a - .5) * 5, c, 2);
    g.line(x1, y1, x1 - Math.cos(a + .5) * 5, y1 - Math.sin(a + .5) * 5, c, 2);
  },
  /** 鑰匙與鎖：胰島素打開細胞讓葡萄糖進入 */
  lock: (g, P) => {
    const x = v(P.x, g.p, 96), y = v(P.y, g.p, 54), open = v(P.open, g.p, 1);
    g.blob(x, y, 30, 22, 15, 4); g.ell(x, y, 6, 5, 2);
    g.rect(x - 34, y - 4, 8, 8, 1); g.rect(x - 32, y - 2 + (1 - open) * 0, 4, 4, open > .5 ? 11 : 8);
    if (open > .5) particles(g, { kind: 'glucose', n: 8, mode: 'stream', x: x - 60, y, tx: x - 8, ty: y, h: 6, speed: 1.6 });
    else particles(g, { kind: 'glucose', n: 14, mode: 'jitter', x: x - 80, y: y - 16, w: 40, h: 32, speed: 1 });
  },
  shine: (g) => { const x = ((g.t * 60) % (W + 80)) - 40; for (let i = 0; i < 6; i++) g.line(x + i, 0, x + i - 30, H, 7); },
  fade: (g, P) => { g.dither(0, 0, W, H, (P.c as number) ?? 0, v(P.a, g.p, .5)); },
};

/** 畫出某一時間點的畫面 */
export function drawFrame(g: G, m: Movie, time: number) {
  let acc = 0, idx = 0;
  for (; idx < m.scenes.length; idx++) { const d = m.scenes[idx].d ?? 5; if (time < acc + d || idx === m.scenes.length - 1) break; acc += d; }
  const sc = m.scenes[idx], d = sc.d ?? 5;
  g.t = Math.max(0, time - acc); g.p = Math.min(1, g.t / d);
  g.ctx.clearRect(0, 0, W, H);
  for (const [k, P0] of sc.layers) {
    const P = P0 ?? {};
    // 小人預設放大 2 倍（以腳底為基準），其他圖層可用 sz 指定整數倍
    const sz = (P.sz as number) ?? (k === 'person' ? 2 : 1);
    if (sz !== 1) {
      const ax = v(P.x, g.p, 96), ay = v(P.y, g.p, k === 'person' ? 70 : 54) + (k === 'person' ? 6 : 0);
      g.ctx.save(); g.ctx.translate(ax, ay); g.ctx.scale(sz, sz); g.ctx.translate(-ax, -ay);
      LAYERS[k]?.(g, P); g.ctx.restore();
    } else LAYERS[k]?.(g, P);
  }
  // 場景轉換：抖色淡入淡出
  if (g.t < .35) g.dither(0, 0, W, H, 0, 1 - g.t / .35);
  if (d - g.t < .25 && idx < m.scenes.length - 1) g.dither(0, 0, W, H, 0, 1 - (d - g.t) / .25);
  return idx;
}
export const totalTime = (m: Movie) => m.scenes.reduce((a, s) => a + (s.d ?? 5), 0);
