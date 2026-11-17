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
      .replace('#include <common>', `#include <common>\nvarying vec3 vP;\n${decl}`)
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
