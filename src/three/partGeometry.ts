import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 從分層 GLB 取出指定部位的幾何（已套用世界座標、轉成 Float32、平滑法線），
 * 給衛教動畫使用真實的 BodyParts3D 解剖形狀。不修改檢視器共用的原始模型。
 */
export type PartGeo = { id: string; geo: THREE.BufferGeometry; center: THREE.Vector3; box: THREE.Box3 };

const url = (file: string) => `${import.meta.env.BASE_URL}models/${file}.glb`;

export function extract(scene: THREE.Object3D, id: string): PartGeo | null {
  const root = scene.getObjectByName(id);
  if (!root) return null;
  scene.updateMatrixWorld(true);
  const pos: number[] = [], idx: number[] = [];
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry, p = g.attributes.position, base = pos.length / 3;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); pos.push(v.x, v.y, v.z); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
    else for (let i = 0; i < p.count; i++) idx.push(base + i);
  });
  if (!pos.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  const box = geo.boundingBox!.clone();
  return { id, geo, center: box.getCenter(new THREE.Vector3()), box };
}

/** 讀取一個 GLB 檔中的多個部位；ids 不存在時略過 */
export function useParts(file: string, ids: string[]): Record<string, PartGeo> {
  const { scene } = useGLTF(url(file), false, true);
  const key = ids.join(',');
  return useMemo(() => {
    const out: Record<string, PartGeo> = {};
    for (const id of ids) { const p = extract(scene, id); if (p) out[id] = p; }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, key]);
}

/** 沿主軸分段取中心點，近似血管或器官的中心線 */
export function centerline(geo: THREE.BufferGeometry, axis: 'x' | 'y' | 'z', bins = 10, desc = false): THREE.Vector3[] {
  const p = geo.attributes.position;
  const box = geo.boundingBox ?? (geo.computeBoundingBox(), geo.boundingBox!);
  const lo = box.min[axis], hi = box.max[axis];
  const sums = Array.from({ length: bins }, () => ({ v: new THREE.Vector3(), n: 0 }));
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = Math.min(bins - 1, Math.floor(((v[axis] - lo) / (hi - lo || 1)) * bins));
    sums[k].v.add(v); sums[k].n++;
  }
  const pts = sums.filter((s) => s.n).map((s) => s.v.divideScalar(s.n));
  return desc ? pts.reverse() : pts;
}

/** 3D 數值雜訊（GLSL），供組織質感與電訊號閃爍使用 */
export const GLSL_NOISE = /* glsl */ `
float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`;
