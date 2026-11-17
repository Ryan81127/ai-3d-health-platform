import * as THREE from 'three';
import { GLSL_NOISE, type PartGeo } from './partGeometry';

/** 衛教動畫共用：物理材質、帶程式紋理的組織材質、部位網格 */
export function phys(color: string, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.3, side: THREE.DoubleSide, ...extra });
}

/**
 * 以模型座標雜訊做組織紋理。glsl 寫入 color_fragment（可用 vP、fbm、vnoise），
 * emis 寫入 emissivemap_fragment，vert 寫入 begin_vertex（可改 transformed）。
 * 每個材質都有自己的程式快取鍵，避免 three.js 共用 shader。
 */
export function tissue(params: THREE.MeshPhysicalMaterialParameters, glsl: string, u: Record<string, THREE.IUniform> = {}, decl = '', emis = '', vert = '') {
  const m = phys('#ffffff', params);
  m.customProgramCacheKey = () => glsl + decl + emis + vert;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vP;\n${decl}\n${vert ? GLSL_NOISE : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvP = position;\n${vert}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vP;\n${decl}\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${glsl}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${emis}`);
  };
  return m;
}

export const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

export const Part = ({ p, m }: { p?: PartGeo; m: THREE.Material }) => (p ? <mesh geometry={p.geo} material={m} /> : null);

/** 不規則團塊（腫瘤、結節、痛風石等） */
export function lumpGeometry(r: number, seed: number, detail = 4) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const k = 1 + 0.18 * Math.sin(n.x * 7 + seed) * Math.sin(n.y * 6 + seed * 2) + 0.12 * Math.sin(n.z * 11 + seed * 3) + 0.06 * Math.sin(n.x * 23 + n.y * 19);
    v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** 在幾何表面取樣點（可依條件過濾），用於放置結晶、斑塊、病毒等示意物件 */
export function samplePoints(geo: THREE.BufferGeometry, n: number, seed: number, keep: (v: THREE.Vector3) => boolean = () => true) {
  const p = geo.attributes.position, out: THREE.Vector3[] = [];
  for (let k = 0; out.length < n && k < n * 60; k++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, Math.floor(rnd(seed + k * 1.37) * p.count));
    if (keep(v)) out.push(v);
  }
  return out;
}
