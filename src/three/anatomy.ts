import manifestJson from '../data/modelManifest.json';
import { ORGAN_MAP } from '../data/organs';
import { LAYER_ZH, zhName } from '../data/partNames';
import type { LayerKey } from '../store';

export interface PartInfo {
  id: string;
  en: string;
  layer: LayerKey;
  organ: string | null;
  c: [number, number, number];
  r: number;
  /** 資料集沒有、以示意幾何補上的構造 */
  schematic?: boolean;
}

const base = manifestJson as PartInfo[];
const find = (re: RegExp) => base.filter((p) => re.test(p.en));
const byY = (a: PartInfo, b: PartInfo) => b.c[1] - a.c[1];

/* 甲狀腺：資料集未收錄，放在甲狀軟骨下方作為示意 */
const tc = find(/thyroid cartilage/)[0];
export const THYROID: PartInfo = {
  id: 'x-thyroid', en: 'thyroid gland (schematic)', layer: 'organ', organ: 'thyroid', schematic: true,
  c: [tc.c[0], tc.c[1] - 0.028, tc.c[2] + 0.004], r: 0.03,
};

/* 神經走向：資料集沒有周邊神經，沿骨骼中心點畫出示意路徑 */
type P3 = [number, number, number];
const spine = find(/vertebra$|^atlas$|^axis$|^sacrum$/).sort(byY);
const one = (name: string) => base.find((p) => p.en === name)!.c as P3;
const limb = (side: 'left' | 'right'): P3[][] => {
  const c7 = one('seventh cervical vertebra'), l5 = one('fifth lumbar vertebra');
  return [
    [c7, one(`${side} clavicle`), one(`${side} humerus`), one(`${side} ulna`), one(`${side} third metacarpal bone`)],
    [l5, one(`${side} hip bone`), one(`${side} femur`), one(`${side} tibia`), one(`${side} talus`)],
  ];
};
export const NERVE_PATHS: { pts: P3[]; r: number }[] = [
  { pts: [[spine[0].c[0], spine[0].c[1] + 0.04, spine[0].c[2]], ...spine.map((p) => [p.c[0], p.c[1], p.c[2] - 0.012] as P3)], r: 0.006 },
  ...[...limb('left'), ...limb('right')].map((pts) => ({ pts: pts.map(([x, y, z]) => [x, y, z - 0.012] as P3), r: 0.003 })),
];
export const NERVE_SCHEMATIC: PartInfo = { id: 'x-nerves', en: 'spinal cord and peripheral nerves (schematic path)', layer: 'nerve', organ: 'nerves', schematic: true, c: [0, 0.9, 0], r: 0.9 };

export const PARTS: PartInfo[] = [...base, THYROID, NERVE_SCHEMATIC];
export const PART_MAP: Record<string, PartInfo> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export function partLabel(p: PartInfo): string {
  if (p.id === 'x-thyroid') return '甲狀腺（示意）';
  if (p.id === 'x-nerves') return '脊髓與周邊神經（示意走向）';
  return zhName(p.en) ?? p.en;
}

/** 部位對應的衛教器官 id（含以整個圖層代表的皮膚、肌肉、血管、神經） */
export function organOf(p: PartInfo): string | null {
  if (p.organ) return p.organ;
  return null;
}

/* 器官的包圍範圍，用於鏡頭聚焦 */
export interface Bounds { c: P3; r: number }
function boundsOf(parts: PartInfo[]): Bounds {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) for (let i = 0; i < 3; i++) {
    const half = p.r * 0.58; // r 是包圍盒半對角線，換算成各軸的概略半徑
    lo[i] = Math.min(lo[i], p.c[i] - half); hi[i] = Math.max(hi[i], p.c[i] + half);
  }
  const c = lo.map((v, i) => (v + hi[i]) / 2) as P3;
  return { c, r: Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2 };
}
export const BODY: Bounds = { c: [0, 0.83, 0], r: 0.95 };
export const ORGAN_BOUNDS: Record<string, Bounds> = {};
for (const id of Object.keys(ORGAN_MAP)) {
  const parts = PARTS.filter((p) => p.organ === id && !(p.id === 'x-nerves'));
  ORGAN_BOUNDS[id] = ORGAN_MAP[id].layer === 'organ' && parts.length ? boundsOf(parts) : BODY;
}

export const LAYER_OF_ORGAN: Record<string, LayerKey> = Object.fromEntries(Object.values(ORGAN_MAP).map((o) => [o.id, o.layer as LayerKey]));

export interface SearchHit { partId?: string; organId?: string; label: string; sub: string }
export function searchParts(q: string, limit = 24): SearchHit[] {
  const k = q.trim().toLowerCase();
  if (!k) return [];
  const hits: SearchHit[] = [];
  for (const o of Object.values(ORGAN_MAP)) if (o.name.includes(k) || o.id.includes(k)) hits.push({ organId: o.id, label: o.name, sub: o.system });
  for (const p of PARTS) {
    if (hits.length >= limit) break;
    const zh = partLabel(p);
    if (zh.toLowerCase().includes(k) || p.en.toLowerCase().includes(k)) hits.push({ partId: p.id, label: zh, sub: `${LAYER_ZH[p.layer]}${zh === p.en ? '' : '・' + p.en}` });
  }
  return hits;
}
