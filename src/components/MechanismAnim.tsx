import { useEffect, useRef, useState } from 'react';
import type { AnimId } from '../data/topics';
import { useStore } from '../store';

/**
 * 「一般狀況 vs 生活因素影響時」的對照動畫（SVG）。
 * 所有曲線與數值都是示意，用來說明研究中觀察到的方向，不是個案的量測值。
 */

const C = { ok: '#12a594', risk: '#e8871e', grid: '#d6dee6', text: '#44566a', soft: '#eef3f7', line: '#9aabbb' };
type V = 'normal' | 'risk';
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const hash = (i: number, k = 1) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/** 0 → 1 循環的動畫時間；減少動態時固定在完成狀態 */
export function useLoop(duration: number, key: unknown, playing = true): number {
  const reduce = useStore((s) => s.reduceMotion);
  const [t, setT] = useState(0);
  const elapsed = useRef(0); // 暫停時保留目前進度
  useEffect(() => { elapsed.current = 0; setT(reduce ? 1 : 0); }, [key, reduce]);
  useEffect(() => {
    if (reduce || !playing) return;
    const hold = 2000 / duration; // 播完停在結尾 2 秒再重播
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      elapsed.current += (now - last) / duration;
      last = now;
      if (elapsed.current > 1 + hold) elapsed.current = 0;
      setT(clamp(elapsed.current));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [duration, key, playing, reduce]);
  return t;
}

/* ---------- 共用 ---------- */
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
function arc(cx: number, cy: number, r: number, d0: number, d1: number) {
  const [x0, y0] = polar(cx, cy, r, d0), [x1, y1] = polar(cx, cy, r, d1);
  return `M${x0},${y0} A${r},${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${x1},${y1}`;
}
const Label = ({ x, y, children, anchor = 'start', size = 10, color = C.text, weight }: { x: number; y: number; children: React.ReactNode; anchor?: 'start' | 'middle' | 'end'; size?: number; color?: string; weight?: number }) => (
  <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontWeight={weight}>{children}</text>
);
const plot = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/* 1. 睡眠時鐘 */
function SleepClock({ t, v }: { t: number; v: V }) {
  const start = v === 'normal' ? 23 : 2, end = 7;
  const dur = (end - start + 24) % 24;
  const p = ease(t * 1.4);
  const deg = (h: number) => (h / 24) * 360 - 90;
  const col = v === 'normal' ? C.ok : C.risk;
  const [mx, my] = polar(120, 80, 56, deg(start));
  const [sx, sy] = polar(120, 80, 56, deg(end));
  return (
    <g>
      <circle cx={120} cy={80} r={56} fill="none" stroke={C.soft} strokeWidth={14} />
      {[0, 6, 12, 18].map((h) => { const [x, y] = polar(120, 80, 76, deg(h)); return <Label key={h} x={x} y={y + 3} anchor="middle" size={8} color={C.line}>{`${h}:00`}</Label>; })}
      {p > 0.01 && <path d={arc(120, 80, 56, deg(start), deg(start) + (dur / 24) * 360 * p)} fill="none" stroke={col} strokeWidth={14} strokeLinecap="round" />}
      <text x={mx} y={my + 4} fontSize={11} textAnchor="middle">🌙</text>
      <text x={sx} y={sy + 4} fontSize={11} textAnchor="middle">☀️</text>
      <Label x={120} y={78} anchor="middle" size={20} color={col} weight={700}>{(dur * p).toFixed(1)}</Label>
      <Label x={120} y={94} anchor="middle" size={9}>小時睡眠</Label>
    </g>
  );
}

/* 2. 褪黑激素（示意曲線） */
function Melatonin({ t, v }: { t: number; v: V }) {
  const X = (h: number) => 24 + ((h - 18) / 16) * 200;
  const Y = (m: number) => 128 - m * 88;
  const peak = v === 'normal' ? 27 : 28.6, w = v === 'normal' ? 3.3 : 3.0, amp = v === 'normal' ? 1 : 0.86;
  const f = (h: number) => amp * Math.exp(-Math.pow((h - peak) / w, 2));
  const hc = 18 + 16 * ease(t * 1.15);
  const pts: [number, number][] = [];
  for (let h = 18; h <= hc; h += 0.2) pts.push([X(h), Y(f(h))]);
  const col = v === 'normal' ? C.ok : C.risk;
  return (
    <g>
      {v === 'risk' && <rect x={X(21)} y={34} width={X(25.5) - X(21)} height={94} fill="#fff0d9" />}
      {v === 'risk' && <Label x={(X(21) + X(25.5)) / 2} y={46} anchor="middle" size={9} color="#a35a00">📱 睡前強光</Label>}
      {v === 'normal' && <Label x={X(21.4)} y={46} size={9}>🌙 燈光變暗</Label>}
      <line x1={24} y1={128} x2={224} y2={128} stroke={C.grid} />
      {[18, 21, 24, 27, 30, 33].map((h) => <Label key={h} x={X(h)} y={142} anchor="middle" size={8} color={C.line}>{`${h % 24}:00`}</Label>)}
      <path d={plot(pts)} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={4} fill={col} />}
      <Label x={24} y={22} size={9}>褪黑激素（示意曲線）</Label>
    </g>
  );
}

/* 3. 注意力（反應時間，示意） */
function Attention({ t, v }: { t: number; v: V }) {
  const N = 16, lapses = [2, 6, 7, 11, 14];
  const shown = Math.floor(ease(t * 1.2) * N + 0.0001);
  return (
    <g>
      <Label x={20} y={22} size={9}>每次測驗的反應時間（示意）</Label>
      <line x1={18} y1={130} x2={226} y2={130} stroke={C.grid} />
      {Array.from({ length: shown }, (_, i) => {
        const lapse = v === 'risk' && lapses.includes(i);
        const h = (lapse ? 0.8 + hash(i) * 0.15 : 0.28 + hash(i, 2) * 0.1 + (v === 'risk' ? 0.05 : 0)) * 90;
        const x = 22 + i * 12.8;
        return <g key={i}>
          <rect x={x} y={130 - h} width={8} height={h} rx={2} fill={lapse ? C.risk : v === 'normal' ? C.ok : '#7fb7ad'} />
          {lapse && i === 2 && <Label x={x + 4} y={130 - h - 4} anchor="middle" size={8} color="#a35a00">恍神</Label>}
        </g>;
      })}
      <Label x={226} y={142} anchor="end" size={8} color={C.line}>時間 →</Label>
    </g>
  );
}

/* 4. 夜間血壓下降（示意） */
function BpDip({ t, v }: { t: number; v: V }) {
  const X = (h: number) => 22 + ((h - 8) / 24) * 200;
  const depth = v === 'normal' ? 0.16 : 0.05;
  const smooth = (a: number, b: number, x: number) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const level = (h: number) => 1 - depth * (smooth(21, 24.5, h) - smooth(29.5, 32, h));
  const Y = (l: number) => 60 + ((1 - l) / 0.2) * 60;
  const hc = 8 + 24 * ease(t * 1.15);
  const pts: [number, number][] = [];
  for (let h = 8; h <= hc; h += 0.25) pts.push([X(h), Y(level(h)) + Math.sin(h * 3) * 1.2]);
  const col = v === 'normal' ? C.ok : C.risk;
  const beat = 1 + 0.14 * Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * (v === 'normal' ? 9 : 11))), 6);
  return (
    <g>
      <rect x={X(23)} y={34} width={X(31) - X(23)} height={96} fill="#eef1fb" />
      <Label x={(X(23) + X(31)) / 2} y={46} anchor="middle" size={9} color="#4b5b9b">夜間睡眠</Label>
      <line x1={22} y1={Y(1)} x2={222} y2={Y(1)} stroke={C.grid} strokeDasharray="3 3" />
      <line x1={22} y1={130} x2={222} y2={130} stroke={C.grid} />
      {[8, 14, 20, 26, 32].map((h) => <Label key={h} x={X(h)} y={142} anchor="middle" size={8} color={C.line}>{`${h % 24}:00`}</Label>)}
      <path d={plot(pts)} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round" />
      <g transform={`translate(212 22) scale(${beat})`}><text fontSize={14} textAnchor="middle" y={5}>❤️</text></g>
      <Label x={22} y={22} size={9}>血壓（示意）</Label>
    </g>
  );
}

/* 5. 胰島素與葡萄糖進入細胞（示意） */
function Insulin({ t, v }: { t: number; v: V }) {
  const N = 18, frac = v === 'normal' ? 0.85 : 0.42;
  const receptors = [45, 95, 145, 195];
  const active = (i: number) => v === 'normal' || i % 2 === 0;
  let inBlood = 0;
  const dots = Array.from({ length: N }, (_, i) => {
    const x0 = 25 + hash(i) * 180, delay = (i / N) * 0.6;
    const u = ease((t - delay) / 0.22);
    const enters = hash(i, 3) < frac;
    const rx = receptors.reduce((b, r, k) => (active(k) && Math.abs(r - x0) < Math.abs(b - x0) ? r : b), receptors[0]);
    let x = x0, y = 22 + u * 72;
    if (u >= 1 && enters) {
      const w = ease((t - delay - 0.22) / 0.14);
      x = x0 + (rx - x0) * Math.min(1, w * 1.6);
      y = 94 + w * (30 + (i % 3) * 8);
    } else if (u >= 1) {
      y = 86 - (i % 3) * 12 + Math.sin(t * 20 + i) * 2;
    }
    const visible = t >= delay;
    if (visible && !(u >= 1 && enters && y > 104)) inBlood++;
    return visible ? <circle key={i} cx={x} cy={y} r={4} fill="#f2b33d" stroke="#c98a12" strokeWidth={0.8} /> : null;
  });
  const level = inBlood / N;
  return (
    <g>
      <Label x={14} y={16} size={9}>血液</Label>
      <rect x={10} y={106} width={200} height={42} rx={8} fill="#fbe3dc" />
      <Label x={16} y={142} size={9} color="#8c4a3a">肌肉／肝臟細胞</Label>
      <line x1={10} y1={104} x2={210} y2={104} stroke="#c98e7f" strokeWidth={3} />
      {receptors.map((r, k) => (
        <g key={r}>
          <path d={`M${r - 7},104 v-6 h4 v4 h6 v-4 h4 v6`} fill="none" stroke={active(k) ? C.ok : '#b9c3cc'} strokeWidth={2.2} />
          <path d={`M${r - 3},${92} l3,5 l3,-5 z`} fill={active(k) ? C.ok : '#c9d2da'} />
        </g>
      ))}
      {dots}
      <rect x={220} y={30} width={10} height={100} rx={3} fill={C.soft} />
      <rect x={220} y={130 - level * 100} width={10} height={level * 100} rx={3} fill={v === 'normal' ? C.ok : C.risk} />
      <Label x={225} y={142} anchor="middle" size={7} color={C.line}>血糖</Label>
      <Label x={120} y={16} anchor="middle" size={8} color={C.line}>▲ 胰島素　● 葡萄糖</Label>
    </g>
  );
}

/* 6. 發炎訊號（示意） */
function Immune({ t, v }: { t: number; v: V }) {
  const sparks = v === 'normal' ? [3, 14] : [1, 3, 6, 9, 12, 14, 17, 18];
  return (
    <g>
      <Label x={20} y={22} size={9}>免疫細胞與發炎訊號（示意）</Label>
      {Array.from({ length: 20 }, (_, i) => {
        const x = 34 + (i % 5) * 42, y = 46 + Math.floor(i / 5) * 26;
        const k = sparks.indexOf(i);
        const on = k >= 0 && t > 0.1 + k * 0.08;
        const pulse = on ? 1 + 0.2 * Math.sin(t * 30 + i) : 1;
        return <g key={i}>
          <circle cx={x} cy={y} r={9} fill="#e3eef8" stroke="#9cb9d6" />
          <circle cx={x} cy={y} r={3.5} fill="#9cb9d6" />
          {on && <circle cx={x + 9} cy={y - 8} r={4 * pulse} fill={C.risk} opacity={0.85} />}
        </g>;
      })}
    </g>
  );
}

const HABITS = [
  ['⏰', '固定起床時間'], ['🌅', '起床後接觸日光'], ['📵', '睡前 1 小時放下螢幕'], ['☕', '午後減少咖啡因'], ['🚶', '每週累積 150 分鐘活動'],
];
function Habits({ t }: { t: number }) {
  return (
    <g>
      {HABITS.map(([icon, text], i) => {
        const a = ease((t - i * 0.14) / 0.2);
        return <g key={text} opacity={a} transform={`translate(${20 + (i % 3) * 152} ${28 + Math.floor(i / 3) * 62 + (1 - a) * 8})`}>
          <rect width={140} height={50} rx={10} fill="#eaf7f4" stroke="#bfe6de" />
          <text x={22} y={32} fontSize={20} textAnchor="middle">{icon}</text>
          <Label x={42} y={30} size={10.5} weight={600}>{text}</Label>
          {a > 0.95 && <Label x={128} y={18} anchor="end" size={11} color={C.ok} weight={700}>✓</Label>}
        </g>;
      })}
    </g>
  );
}

const PANELS: Record<Exclude<AnimId, 'habits'>, (p: { t: number; v: V }) => React.ReactElement> = {
  'sleep-clock': SleepClock, melatonin: Melatonin, attention: Attention, 'bp-dip': BpDip, insulin: Insulin, immune: Immune,
};

export default function MechanismAnim({ anim, caption, playing = true, riskLabel = '熬夜時' }: { anim: AnimId; caption: { normal: string; change: string }; playing?: boolean; riskLabel?: string }) {
  const t = useLoop(anim === 'habits' ? 4200 : 6500, anim, playing);
  if (anim === 'habits') {
    return (
      <figure className="manim single" aria-label={`衛教示意動畫：${caption.normal}`}>
        <svg viewBox="0 0 480 160" role="img"><Habits t={t} /></svg>
        <figcaption>{caption.normal}</figcaption>
      </figure>
    );
  }
  const Panel = PANELS[anim];
  return (
    <div className="manim" aria-label="衛教示意動畫：一般狀況與生活因素影響時的對照">
      <figure className="ok">
        <div className="manim-tag">一般狀況</div>
        <svg viewBox="0 0 240 150" role="img"><Panel t={t} v="normal" /></svg>
        <figcaption>{caption.normal}</figcaption>
      </figure>
      <figure className="risk">
        <div className="manim-tag">{riskLabel}<small>（可能的變化）</small></div>
        <svg viewBox="0 0 240 150" role="img"><Panel t={t} v="risk" /></svg>
        <figcaption>{caption.change}</figcaption>
      </figure>
    </div>
  );
}
