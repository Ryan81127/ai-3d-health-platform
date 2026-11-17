import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { GLSL_NOISE, centerline, useParts, type PartGeo } from '../three/partGeometry';

/**
 * 心房顫動與心臟衰竭的 3D 衛教示意。
 * 形狀使用 BodyParts3D 的真實心臟、瓣膜、冠狀動脈與大血管模型；電訊號、收縮、脈搏波與血塊為程式疊加的示意效果。
 * 情境文字對應 diseases.ts 已核對的內容。
 */
export type HeartTopic = 'atrial-fibrillation' | 'heart-failure';

const INFO: Record<HeartTopic, { label: string; note: string }[]> = {
  'atrial-fibrillation': [
    { label: '正常心律', note: '電訊號從右心房上方的起搏點出發，像波一樣依序傳過心房、再傳到心室，心跳規則。（金色光帶＝電訊號，示意）' },
    { label: '心房顫動', note: '心跳不規則、有時快很多；心房出現雜亂的電訊號，上下心腔無法協調運作，心室無法充分充血與送血。是否為心房顫動需以心電圖確認。' },
    { label: '血液淤積與血塊（示意）', note: '血液可能淤積在心臟裡，增加形成血塊的風險；血塊隨血流經主動脈到腦部，可能造成中風。圖為剖面，血塊位置與大小為示意。' },
  ],
  'heart-failure': [
    { label: '正常打血', note: '心臟規律收縮，把含氧血液經主動脈送到全身。（主動脈上的亮光＝每次心跳送出的脈搏波，示意）' },
    { label: '打血不足', note: '心臟衰竭是心臟無法打出足夠的含氧血液，不是心臟停止跳動。左心可能變得無力，或變得太厚太硬而無法充分充血。圖中心室擴大、收縮變弱為示意。' },
    { label: '血液回堵與積水（示意）', note: '血液流經心臟變慢，回心的血管發生回堵，液體滲入組織造成水腫；可能出現喘、平躺難睡、腳踝或小腿腫脹。圖中藍色水滴為肺部積水示意。' },
  ],
};
const OUT: Record<HeartTopic, number[]> = { 'atrial-fibrillation': [100, 80, 80], 'heart-failure': [100, 55, 45] };
const IRREGULAR = [0.55, 0.95, 0.4, 0.75, 0.5, 1.15, 0.45, 0.62];
const IRR_SUM = IRREGULAR.reduce((a, b) => a + b, 0);
const T_FROZEN = 0.32;
const S = 10; // 公尺 → 場景單位

const HEART_IDS = ['FMA7274', 'FMA7234', 'FMA7235', 'FMA7246', 'FMA7260', 'FMA7261', 'FMA7262', 'FMA7266', 'FMA9352nsn'];
const LUNG_IDS = ['FMA7333', 'FMA7337', 'FMA7370', 'FMA7371', 'FMA7383'];
const AORTA = ['FMA3736', 'FMA3768', 'FMA3784'];
const ART_IDS = [...AORTA, 'FMA3932nsn', 'FMA4058', 'FMA3941', 'FMA4694', 'FMA3953'];
const CORONARY = ['FMA3802', 'FMA3818', 'FMA3840nsn', 'FMA3862nsn', 'FMA3895', 'FMA4685', 'FMA71669', 'FMA71670', 'FMA76994'];
const VEIN_IDS = ['FMA4720', 'FMA10951', 'FMA4751', 'FMA4761', 'FMA4706', 'FMA76751'];
const PA = 'FMA66326', PV = 'FMA66643';

type U = Record<string, THREE.IUniform>;

/** 心肌材質：組織紋理、房室溝脂肪、內壁較暗，並接受收縮與電訊號的 uniform */
function makeHeartMat(u: U) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#a3302c', roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.32,
    sheen: 0.7, sheenColor: new THREE.Color('#ff8f80'), sheenRoughness: 0.45, side: THREE.DoubleSide,
  });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uAtS, uVenS; uniform vec3 uAtC, uVenC, uVc, uN; varying vec3 vP;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vP = position;
        float atr = smoothstep(-0.006, 0.006, dot(position - uVc, uN));
        transformed = mix(uVenC + (position - uVenC) * uVenS, uAtC + (position - uAtC) * uAtS, atr);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uWaveA, uWaveV, uOnA, uOnV, uFib, uTime;
        uniform vec3 uSA, uAVn, uVc, uN; varying vec3 vP;
        ${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float tex = fbm(vP * 260.0);
        diffuseColor.rgb *= 0.82 + 0.3 * tex;
        float hAx = dot(vP - uVc, uN);
        float fat = smoothstep(0.008, 0.0, abs(hAx + 0.002)) * smoothstep(0.5, 0.75, fbm(vP * 160.0 + 3.1));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.76, 0.5), fat * 0.6);
        if (!gl_FrontFacing) diffuseColor.rgb *= vec3(0.62, 0.42, 0.42);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float atrF = smoothstep(-0.003, 0.004, dot(vP - uVc, uN));
        float bandA = exp(-pow((distance(vP, uSA) - uWaveA) / 0.007, 2.0)) * atrF * uOnA;
        float bandV = exp(-pow((distance(vP, uAVn) - uWaveV) / 0.009, 2.0)) * (1.0 - atrF) * uOnV;
        float fib = uFib * atrF * smoothstep(0.7, 0.9, vnoise(vP * 520.0 + vec3(0.0, uTime * 9.0, uTime * 5.0)));
        totalEmissiveRadiance += vec3(1.0, 0.78, 0.25) * (bandA * 1.4 + bandV * 1.2 + fib * 1.3);`);
  };
  return m;
}

/** 動脈材質：每次心跳從主動脈根部往外傳的脈搏波 */
function makeArteryMat(u: U, color: string) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: new THREE.Color('#ffb0a0'), side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRoot; uniform float uPulse, uPulseAmp; varying vec3 vP;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.32, 0.2) * exp(-pow((distance(vP, uRoot) - uPulse) / 0.01, 2.0)) * uPulseAmp;`);
  };
  return m;
}

function plain(color: string, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.3, side: THREE.DoubleSide, ...extra });
}

function centroid(geo: THREE.BufferGeometry, keep: (v: THREE.Vector3) => boolean) {
  const p = geo.attributes.position, v = new THREE.Vector3(), s = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (keep(v)) { s.add(v); n++; } }
  return n ? s.divideScalar(n) : s;
}
function along(path: THREE.Vector3[], s: number, out: THREE.Vector3) {
  const lens = path.slice(1).map((p, i) => p.distanceTo(path[i]));
  let d = lens.reduce((x, y) => x + y, 0) * Math.min(1, Math.max(0, s));
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) return out.copy(path[i]).lerp(path[i + 1], d / lens[i]);
    d -= lens[i];
  }
  return out.copy(path[path.length - 1]);
}
const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

function HeartScene({ topic, stage, frozen, cut, onReadout }: { topic: HeartTopic; stage: number; frozen: boolean; cut: boolean; onReadout: (s: string) => void }) {
  const reduce = useStore((s) => s.reduceMotion);
  const organ = useParts('organ', [...HEART_IDS, ...LUNG_IDS]);
  const ves = useParts('vessel', [...ART_IDS, ...CORONARY, ...VEIN_IDS, PA, PV]);
  const wall = organ.FMA7274;
  const c0 = wall.center;

  // 解剖參考點（公尺，模型座標）
  const ref = useMemo(() => {
    const tri = organ.FMA7234?.center ?? c0.clone().add(new THREE.Vector3(-0.015, 0, 0.01));
    const mit = organ.FMA7235?.center ?? c0.clone().add(new THREE.Vector3(0.015, 0, 0));
    const vc = tri.clone().add(mit).multiplyScalar(0.5);
    // 心尖：心壁上最偏左、下、前方的點（模型座標 +x 為身體左側、+z 為前方）；心臟長軸 uN 由心尖指向房室瓣
    const pp = wall.geo.attributes.position, tv = new THREE.Vector3(), apex = new THREE.Vector3();
    const dir = new THREE.Vector3(0.6, -0.45, 0.65).normalize();
    let best = -Infinity;
    for (let i = 0; i < pp.count; i++) { tv.fromBufferAttribute(pp, i); const d = tv.dot(dir); if (d > best) { best = d; apex.copy(tv); } }
    const n = vc.clone().sub(apex).normalize();
    const h = (v: THREE.Vector3) => tv.copy(v).sub(vc).dot(n);
    const svc = ves.FMA4720 ? centerline(ves.FMA4720.geo, 'y', 6) : [c0.clone().add(new THREE.Vector3(-0.02, 0.04, 0))];
    const SA = svc[0].clone();
    const AVn = tri.clone().lerp(mit, 0.35);
    const atC = centroid(wall.geo, (v) => h(v) > 0), venC = centroid(wall.geo, (v) => h(v) < 0);
    const asc = ves.FMA3736 ? centerline(ves.FMA3736.geo, 'y', 6) : [c0.clone()];
    const root = asc[0].clone();
    const car = ves.FMA4058 ? centerline(ves.FMA4058.geo, 'y', 8) : [];
    const arch = ves.FMA3768 ? centerline(ves.FMA3768.geo, 'x', 8).filter((p) => !car.length || p.x <= car[0].x + 0.002) : [];
    const LA = centroid(wall.geo, (v) => h(v) > 0.008 && v.x > mit.x - 0.004 && v.z < vc.z); // 左心房壁的中心 ≈ 心房腔中央
    const LV = mit.clone().lerp(apex, 0.45);
    const emb = [LA, mit.clone(), LV, root, ...asc.slice(1), ...arch, ...car];
    return { tri, mit, vc, n, SA, AVn, atC, venC, root, LA, emb, carTop: car[car.length - 1] ?? root };
  }, [organ, ves, wall, c0]);

  const u = useMemo<U>(() => ({
    uVc: { value: ref.vc }, uN: { value: ref.n }, uAtS: { value: 1 }, uVenS: { value: 1 }, uAtC: { value: ref.atC }, uVenC: { value: ref.venC },
    uWaveA: { value: 0 }, uWaveV: { value: 0 }, uOnA: { value: 0 }, uOnV: { value: 0 }, uFib: { value: 0 }, uTime: { value: 0 },
    uSA: { value: ref.SA }, uAVn: { value: ref.AVn }, uRoot: { value: ref.root }, uPulse: { value: 0 }, uPulseAmp: { value: 0 },
  }), [ref]);

  // 剖面：保留後半部，看得到心腔內部。裁切平面使用場景座標（模型已平移縮放到原點）
  const cutPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.004 * S), []);
  const box = useMemo(() => [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.065 * S), new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.065 * S),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.075 * S), new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.17 * S),
  ], []);

  const mats = useMemo(() => ({
    heart: makeHeartMat(u), valve: plain('#e9d6c4', { roughness: 0.6 }),
    aorta: makeArteryMat(u, '#c23a33'), coronary: makeArteryMat(u, '#d2453a'),
    vein: plain('#4c5aa6'), pa: plain('#6470b8'), pv: plain('#b8463e'),
    lung: plain('#f0b9b4', { transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.7 }),
    clot: plain('#5c0d14', { roughness: 0.75, clearcoat: 0.3, emissive: new THREE.Color('#3a0508') }),
    drop: plain('#7cc3ff', { transparent: true, opacity: 0.75, roughness: 0.1, clearcoat: 1 }),
  }), [u]);

  const showClot = topic === 'atrial-fibrillation' && stage === 2;
  useEffect(() => {
    // 血塊情境：剖面切到左心房中央，讓心房內部露出來
    cutPlane.constant = (showClot ? ref.LA.z - c0.z + 0.002 : 0.004) * S;
    const c = cut ? [cutPlane] : [];
    mats.heart.clippingPlanes = c; mats.valve.clippingPlanes = c; mats.coronary.clippingPlanes = c;
    for (const m of [mats.aorta, mats.vein, mats.pa, mats.pv]) {
      m.clippingPlanes = [...box, ...c];
      m.transparent = showClot; m.opacity = showClot ? 0.45 : 1; m.depthWrite = !showClot; m.needsUpdate = true;
    }
    mats.heart.needsUpdate = true;
  }, [cut, cutPlane, box, mats, showClot, ref, c0]);

  const clotGeo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.0085, 3), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(0.8 + 0.35 * rnd(Math.round(v.x * 9e4) + Math.round(v.y * 7e4))); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  }, []);
  const clot = useRef<THREE.Mesh>(null), emb = useRef<THREE.Mesh>(null);

  // 肺部積水：取下葉下半部的點往內收（示意）
  const drops = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (const id of ['FMA7337', 'FMA7371']) {
      const l = organ[id]; if (!l) continue;
      const p = l.geo.attributes.position, v = new THREE.Vector3();
      const lim = l.box.min.y + (l.box.max.y - l.box.min.y) * 0.35;
      for (let i = 0; i < p.count && out.length < 160; i += 7) {
        v.fromBufferAttribute(p, i);
        if (v.y < lim) out.push(v.clone().lerp(l.center, 0.25 + 0.2 * rnd(i)));
      }
    }
    return out;
  }, [organ]);
  const dropMesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = dropMesh.current; if (!m) return;
    const d = new THREE.Object3D();
    drops.forEach((p, i) => { d.position.copy(p); d.scale.setScalar(0.6 + rnd(i * 3) * 0.8); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [drops]);

  const grow = useRef(1), last = useRef(-10), beatT = useRef(0), prevV = useRef(0);
  const afib = topic === 'atrial-fibrillation' && stage >= 1;
  const weak = topic === 'heart-failure' && stage >= 1;

  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    let a = 0, vv = 0;
    if (!afib) {
      const P = weak ? 0.9 : 1.0, ph = (t % P) / P;
      a = ph < 0.15 ? Math.sin((ph / 0.15) * Math.PI) : 0;
      vv = ph > 0.2 && ph < 0.5 ? Math.sin(((ph - 0.2) / 0.3) * Math.PI) : 0;
      u.uOnA.value = ph < 0.2 ? 1 : 0; u.uWaveA.value = (ph / 0.2) * 0.065;
      u.uOnV.value = ph > 0.14 && ph < 0.42 ? 1 : 0; u.uWaveV.value = ((ph - 0.14) / 0.28) * 0.1;
      u.uFib.value = 0;
    } else {
      a = 0.3 + 0.3 * Math.sin(t * 37) * Math.sin(t * 13);
      let tt = t % IRR_SUM, k = 0;
      while (tt > IRREGULAR[k]) { tt -= IRREGULAR[k]; k++; }
      vv = tt < 0.28 ? Math.sin((tt / 0.28) * Math.PI) : 0;
      u.uOnA.value = 0; u.uOnV.value = tt < 0.25 ? 1 : 0; u.uWaveV.value = (tt / 0.25) * 0.1;
      u.uFib.value = 1;
    }
    if (vv > 0.05 && prevV.current <= 0.05) beatT.current = t;
    prevV.current = vv;
    u.uTime.value = t;
    const k = reduce ? 1 : 1 - Math.exp(-dt * 2.5);
    grow.current += ((weak ? 1.1 : 1) - grow.current) * k;
    u.uAtS.value = 1 - 0.06 * a;
    u.uVenS.value = grow.current * (1 - (weak ? 0.035 : 0.09) * vv);
    const out = OUT[topic][stage] / 100;
    u.uPulse.value = (t - beatT.current) * 0.32;
    u.uPulseAmp.value = Math.max(0, 1 - (t - beatT.current) * 1.6) * out * 1.6;

    if (clot.current) { clot.current.visible = showClot; clot.current.scale.setScalar(frozen || reduce ? 1 : Math.min(1, 0.45 + (clock.elapsedTime % 8) / 5)); }
    if (emb.current) {
      const ph = (t % 8) / 8;
      emb.current.visible = showClot && ph > 0.5;
      if (emb.current.visible) along(ref.emb, (ph - 0.5) / 0.5, emb.current.position);
    }
    if (dropMesh.current) {
      const show = topic === 'heart-failure' && stage === 2;
      dropMesh.current.visible = show;
      dropMesh.current.count = show ? (frozen || reduce ? drops.length : Math.min(drops.length, 20 + Math.floor((clock.elapsedTime % 10) * 16))) : 0;
    }
    if (clock.elapsedTime - last.current > 0.4) {
      last.current = clock.elapsedTime;
      onReadout(topic === 'atrial-fibrillation' ? `心跳節律（示意）：${afib ? '不規則' : '規則'}` : `送出血量（示意）：${OUT[topic][stage]}%`);
    }
  });

  const mesh = (p: PartGeo | undefined, m: THREE.Material, key: string) => p && <mesh key={key} geometry={p.geo} material={m} />;
  return (
    <group scale={S} position={c0.clone().multiplyScalar(-S)}>
      {mesh(wall, mats.heart, 'wall')}
      {['FMA7234', 'FMA7235', 'FMA7246', 'FMA7260', 'FMA7261', 'FMA7262', 'FMA7266', 'FMA9352nsn'].map((id) => mesh(organ[id], mats.valve, id))}
      {ART_IDS.map((id) => mesh(ves[id], mats.aorta, id))}
      {CORONARY.map((id) => mesh(ves[id], mats.coronary, id))}
      {VEIN_IDS.map((id) => mesh(ves[id], mats.vein, id))}
      {mesh(ves[PA], mats.pa, 'pa')}
      {mesh(ves[PV], mats.pv, 'pv')}
      {topic === 'heart-failure' && LUNG_IDS.map((id) => mesh(organ[id], mats.lung, id))}
      <mesh ref={clot} geometry={clotGeo} material={mats.clot} position={ref.LA} visible={false} />
      <mesh ref={emb} material={mats.clot} visible={false}><sphereGeometry args={[0.0028, 16, 12]} /></mesh>
      <instancedMesh ref={dropMesh} args={[undefined, undefined, drops.length || 1]} material={mats.drop} visible={false}>
        <sphereGeometry args={[0.0032, 12, 8]} />
      </instancedMesh>
      {showClot && <>
        <Html position={ref.LA.clone().add(new THREE.Vector3(0.022, 0.016, 0))} center className="anim-label">← 左心房的血塊（示意）</Html>
        <Html position={ref.carTop} center className="anim-label">↑ 往腦部</Html>
      </>}
      {topic === 'heart-failure' && stage === 2 && organ.FMA7337 && <Html position={organ.FMA7337.center.clone().add(new THREE.Vector3(-0.03, -0.05, 0))} center className="anim-label">肺部積水（示意）</Html>}
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 4, 5]} intensity={1.6} />
      <directionalLight position={[-4, 1, -2]} intensity={0.5} color="#ffd9cf" />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2.2} position={[0, 4, 4]} scale={[8, 3, 1]} />
        <Lightformer intensity={1.2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} color="#ffe2d6" />
        <Lightformer intensity={0.8} position={[5, -1, -2]} rotation-y={-Math.PI / 2} scale={[6, 4, 1]} color="#d6e8ff" />
      </Environment>
    </>
  );
}

export default function HeartAnims({ topic }: { topic: HeartTopic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [readout, setReadout] = useState('');
  const [paused, setPaused] = useState(false);
  const [cutPref, setCutPref] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { setStage(0); }, [topic]);
  const info = INFO[topic][stage];
  const forced = topic === 'atrial-fibrillation' && stage === 2;
  const cut = cutPref || forced;
  const dist = topic === 'heart-failure' ? 5.2 : 3.6;
  return (
    <figure className="vessel">
      <div className="tear-canvas tall" role="img" aria-label={`${info.label}的衛教示意動畫`}>
        <Canvas camera={{ position: [0.25 * dist, 0.15 * dist, dist], fov: 32, near: 0.05, far: 40 }} dpr={[1, 2]} gl={{ antialias: true, localClippingEnabled: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <color attach="background" args={['#101c2b']} />
          <Lights />
          <Suspense fallback={<Html center className="anim-label">載入心臟模型…</Html>}>
            <HeartScene topic={topic} stage={stage} frozen={frozen} cut={cut} onReadout={setReadout} />
          </Suspense>
          <OrbitControls enablePan={false} enableZoom minDistance={dist * 0.55} maxDistance={dist * 1.6} enableDamping dampingFactor={0.1} target={[0, topic === 'heart-failure' ? 0.15 : 0.25, 0]} />
        </Canvas>
      </div>
      <div className="seg" role="group" aria-label="情境">
        {INFO[topic].map((x, i) => <button key={x.label} className={stage === i ? 'on' : ''} aria-pressed={stage === i} onClick={() => setStage(i)}>{x.label}</button>)}
      </div>
      <div className="tear-controls">
        <div className="tear-readout"><b>{info.label}</b><span>{readout}</span></div>
        <button className="btn small ghost" aria-pressed={cut} disabled={forced} onClick={() => setCutPref(!cutPref)}>{cut ? '看外觀' : '看剖面'}</button>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      <p className="small">{info.note}</p>
      <figcaption className="small">衛教示意：心臟與血管形狀來自 BodyParts3D 成年男性解剖模型（前方視角，畫面左側為右心）；電訊號、收縮幅度、脈搏波、血塊與積水為示意效果，不是個人心臟影像或心電圖結果。可拖曳旋轉、滾輪縮放。診斷需由醫師評估。</figcaption>
    </figure>
  );
}
