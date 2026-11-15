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
  /** 模型來源：未標示為 BodyParts3D 3.0；bp4 為 BodyParts3D 4.0；za 為 Z-Anatomy */
  src?: 'bp4' | 'za';
}

type P3 = [number, number, number];
// 骨骼圖層的部位沒有個別器官，統一對應到「骨骼」衛教器官
export const PARTS: PartInfo[] = (manifestJson as PartInfo[]).map((p) => (p.layer === 'skeleton' && !p.organ ? { ...p, organ: 'bones' } : p));
export const PART_MAP: Record<string, PartInfo> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export const SOURCE_LABEL: Record<string, string> = {
  bp3: 'BodyParts3D 3.0', bp4: 'BodyParts3D 4.0', za: 'Z-Anatomy（CC BY-SA 4.0）',
};

export function partLabel(p: PartInfo): string {
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
  const parts = PARTS.filter((p) => p.organ === id);
  ORGAN_BOUNDS[id] = ORGAN_MAP[id].layer === 'organ' && parts.length ? boundsOf(parts) : BODY;
}

/** 多個器官的聯合範圍；只有整個圖層代表的器官（皮膚、肌肉、血管）時回傳全身 */
export function unionBounds(ids: string[]): Bounds {
  const own = ids.filter((id) => ORGAN_MAP[id]?.layer === 'organ' && ORGAN_BOUNDS[id] !== BODY);
  if (!own.length) return BODY;
  if (own.length === 1) return ORGAN_BOUNDS[own[0]];
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const id of own) { const b = ORGAN_BOUNDS[id]; for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], b.c[i] - b.r * 0.7); hi[i] = Math.max(hi[i], b.c[i] + b.r * 0.7); } }
  return { c: lo.map((v, i) => (v + hi[i]) / 2) as P3, r: Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2 };
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
