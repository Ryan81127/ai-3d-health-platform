import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { GLSL_NOISE, centerline, smoothGeometry, useParts, type PartGeo } from '../three/partGeometry';
import StudioLights from '../three/StudioLights';

/**
 * 肺癌、口腔癌、大腸直腸癌的 3D 衛教示意。
 * 肺葉、氣管與支氣管、牙齒、牙齦、唇、舌、上下顎骨、大腸與直腸使用 BodyParts3D／Z-Anatomy 的真實模型；
 * 腫瘤、黏膜病灶、息肉、篩檢器材與光線為程式疊加的示意效果。情境文字對應 diseases.ts 已核對的國健署內容。
 */
export type CancerTopic = 'lung-cancer' | 'oral-cancer' | 'colorectal-cancer';

const INFO: Record<CancerTopic, { label: string; note: string }[]> = {
  'lung-cancer': [
    { label: '正常支氣管與肺', note: '空氣經氣管、支氣管進入左右肺。（藍白色光帶＝隨呼吸進出的氣流，示意）' },
    { label: '腫瘤生長（示意）', note: '肺癌是生長於支氣管或肺泡的惡性腫瘤；初期通常症狀不明顯。吸菸是最大的危險因子，約佔 70–80%。腫瘤位置與大小為示意。' },
    { label: '低劑量電腦斷層篩檢（示意）', note: '政府補助有肺癌家族史者，以及 50–74 歲、吸菸史 20 包-年以上的重度吸菸者，每 2 年 1 次低劑量電腦斷層。影像需由醫師判讀。' },
  ],
  'oral-cancer': [
    { label: '正常口腔', note: '牙齒、牙齦、舌與口腔黏膜。（牙齒與骨骼形狀來自解剖模型，示意）' },
    { label: '檳榔與菸的危害（示意）', note: 'IARC 認定檳榔子屬第一類致癌物；嚼檳榔、吸菸與口腔癌有關。圖中舌緣的白色、紅色病灶與牙齒染色為示意，出現病灶不一定是癌症。' },
    { label: '口腔黏膜檢查（示意）', note: '口腔黏膜檢查是由醫師目視檢查口腔黏膜，看是否有疑似癌前病變或癌症；政府補助 30 歲以上嚼檳榔（含已戒）或吸菸者每 2 年 1 次。' },
  ],
  'colorectal-cancer': [
    { label: '正常大腸', note: '大腸從右下腹的盲腸開始，經升結腸、橫結腸、降結腸、乙狀結腸到直腸。降結腸開了一個觀察窗，看得到腸道內部（示意）。' },
    { label: '腺瘤息肉（示意）', note: '大腸癌主要由腺瘤息肉癌化而來。息肉受糞便摩擦可能出血，血液附著在糞便表面排出，糞便潛血檢查就能測出。息肉位置與大小為示意。' },
    { label: '大腸鏡切除息肉（示意）', note: '糞便潛血檢查陽性時，應接受大腸鏡檢查確診；早期發現腺瘤息肉並切除，可以減少大腸癌發生。' },
  ],
};
const T_FROZEN = 2.2;
const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

function phys(color: string, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.3, side: THREE.DoubleSide, ...extra });
}
/** 以模型座標雜訊做組織紋理；glsl 可使用 vP、uniforms */
function tissue(params: THREE.MeshPhysicalMaterialParameters, glsl: string, u: Record<string, THREE.IUniform> = {}, decl = '', emis = '') {
  const m = phys('#ffffff', params);
  // 每個材質的 shader 程式碼不同，需要各自的快取鍵，否則 three.js 會共用第一個編譯的程式
  m.customProgramCacheKey = () => glsl + decl + emis;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vP;\n${decl}\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${glsl}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${emis}`);
  };
  return m;
}
/** 不規則團塊（腫瘤、息肉頭） */
function lumpGeometry(r: number, seed: number) {
  const g = new THREE.IcosahedronGeometry(r, 4), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const k = 1 + 0.18 * Math.sin(n.x * 7 + seed) * Math.sin(n.y * 6 + seed * 2) + 0.12 * Math.sin(n.z * 11 + seed * 3) + 0.06 * Math.sin(n.x * 23 + n.y * 19);
    v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
function nearestVertex(geo: THREE.BufferGeometry, target: THREE.Vector3, keep: (v: THREE.Vector3) => boolean = () => true) {
  const p = geo.attributes.position, v = new THREE.Vector3(), best = new THREE.Vector3();
  let d = Infinity;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (!keep(v)) continue; const dd = v.distanceToSquared(target); if (dd < d) { d = dd; best.copy(v); } }
  return best;
}
const Part = ({ p, m }: { p?: PartGeo; m: THREE.Material }) => (p ? <mesh geometry={p.geo} material={m} /> : null);

/* ===================== 肺癌 ===================== */
const LUNGS = ['FMA7333', 'FMA7337', 'FMA7370', 'FMA7371', 'FMA7383'];
function LungScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const parts = useParts('organ', [...LUNGS, 'FMA7394', 'FMA7409']);
  const br = parts.FMA7409, tr = parts.FMA7394;
  const C = br.center;
  const S = 8;
  const ref = useMemo(() => {
    const carina = tr ? new THREE.Vector3(tr.center.x, tr.box.min.y, tr.center.z) : C.clone();
    const top = tr ? new THREE.Vector3(tr.center.x, tr.box.max.y, tr.center.z) : C.clone();
    const tumor = nearestVertex(br.geo, new THREE.Vector3(-0.075, 1.3, 0.025), (v) => v.x < -0.04);
    return { carina, top, tumor, maxD: 0.16 };
  }, [br, tr, C]);
  const u = useMemo(() => ({ uFlow: { value: 0 }, uTop: { value: ref.top } }), [ref]);
  const mats = useMemo(() => ({
    lung: tissue({ transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color('#ffd0d0') },
      'diffuseColor.rgb = mix(vec3(0.93, 0.6, 0.6), vec3(0.75, 0.42, 0.45), fbm(vP * 220.0));'),
    air: tissue({ roughness: 0.35, clearcoat: 0.8 },
      `diffuseColor.rgb = vec3(0.92, 0.76, 0.72) * (0.85 + 0.2 * fbm(vP * 400.0));`, u, 'uniform float uFlow; uniform vec3 uTop;',
      'totalEmissiveRadiance += vec3(0.55, 0.8, 1.0) * exp(-pow((distance(vP, uTop) - uFlow) / 0.018, 2.0)) * 0.9;'),
    tumor: tissue({ roughness: 0.7, clearcoat: 0.2 },
      'float n = fbm(vP * 900.0); diffuseColor.rgb = mix(vec3(0.74, 0.6, 0.58), vec3(0.48, 0.14, 0.18), smoothstep(0.4, 0.75, n));'),
  }), [u]);
  const tumorGeo = useMemo(() => lumpGeometry(0.011, 3), []);
  const tumorRef = useRef<THREE.Mesh>(null), lungsRef = useRef<THREE.Group>(null), scan = useRef<THREE.Group>(null);
  const grow = useRef(0), found = useRef(false);
  const [hit, setHit] = useState(false);
  useEffect(() => { found.current = false; setHit(false); }, [stage]);
  const yMin = br.box.min.y - 0.02, yMax = (tr?.box.max.y ?? br.box.max.y) - 0.02;
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 4.5);
    u.uFlow.value = breath * ref.maxD;
    if (lungsRef.current) lungsRef.current.scale.setScalar(1 + 0.025 * breath);
    const k = reduce ? 1 : 1 - Math.exp(-dt * 0.8);
    grow.current += ((stage >= 1 ? 1 : 0) - grow.current) * k;
    if (tumorRef.current) { tumorRef.current.visible = grow.current > 0.02; tumorRef.current.scale.setScalar(grow.current); }
    if (scan.current) {
      scan.current.visible = stage === 2;
      const y = yMax - ((t * 0.25) % 1) * (yMax - yMin);
      scan.current.position.y = y;
      if (stage === 2 && !found.current && Math.abs(y - ref.tumor.y) < 0.006) { found.current = true; setHit(true); }
    }
    const m = mats.tumor;
    m.emissive.set('#ff6a3d'); m.emissiveIntensity = stage === 2 && scan.current && Math.abs(scan.current.position.y - ref.tumor.y) < 0.015 ? 1.2 : 0;
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <group ref={lungsRef} position={C} >
        <group position={C.clone().negate()}>
          {LUNGS.map((id) => <Part key={id} p={parts[id]} m={mats.lung} />)}
        </group>
      </group>
      <Part p={tr} m={mats.air} />
      <Part p={br} m={mats.air} />
      <mesh ref={tumorRef} geometry={tumorGeo} material={mats.tumor} position={ref.tumor} visible={false} />
      <group ref={scan} position={[C.x, C.y, C.z]} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.32, 0.22]} /><meshBasicMaterial color="#5fd0ff" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.018, 16, 80]} /><meshPhysicalMaterial color="#f2f5f8" roughness={0.25} clearcoat={1} /></mesh>
      </group>
      {stage >= 1 && <Html position={ref.tumor.clone().add(new THREE.Vector3(0.03, 0.035, 0.02))} center className="anim-label">{stage === 2 && hit ? '發現可疑結節，由醫師判讀（示意）' : '腫瘤（示意）'}</Html>}
    </group>
  );
}

/* ===================== 口腔癌 ===================== */
const TEETH = ['FMA55680', 'FMA55681', 'FMA55682', 'FMA55683', 'FMA55686', 'FMA55687', 'FMA55688', 'FMA55689', 'FMA55690', 'FMA55691', 'FMA55692', 'FMA55693', 'FMA55694', 'FMA55695', 'FMA55697', 'FMA55698', 'FMA55699', 'FMA55700', 'FMA55703', 'FMA55704', 'FMA55705', 'FMA55706', 'FMA55798', 'FMA55799', 'FMA57140', 'FMA57141', 'FMA57142', 'FMA57143'];
const LOWER = TEETH.filter((id) => ['FMA55686', 'FMA55687', 'FMA55692', 'FMA55693', 'FMA55694', 'FMA55695', 'FMA55703', 'FMA55704', 'FMA55705', 'FMA55706', 'FMA57140', 'FMA57141', 'FMA57142', 'FMA57143'].includes(id));
function OralScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', [...LOWER, 'FMA59764']);
  const za = useParts('za-organ', ['ZA-Tongue']);
  const tongueRaw = za['ZA-Tongue'];
  const tongue = useMemo<PartGeo>(() => ({ ...tongueRaw, geo: smoothGeometry(tongueRaw.geo, 3, 0.5) }), [tongueRaw]);
  const C = org.FMA59764?.center ?? tongue.center;
  const S = 26;
  const les = useMemo(() => {
    // 舌頭左側緣、中段（模型 +x 為身體左側）
    const zMid = (tongue.box.min.z + tongue.box.max.z) / 2;
    const p = tongue.geo.attributes.position, v = new THREE.Vector3(), best = new THREE.Vector3();
    let bx = -Infinity;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (Math.abs(v.z - zMid - 0.006) < 0.006 && v.x > bx) { bx = v.x; best.copy(v); } }
    return best;
  }, [tongue]);
  const u = useMemo(() => ({ uLes: { value: les }, uK: { value: 0 }, uRed: { value: 0 }, uStain: { value: 0 } }), [les]);
  const mats = useMemo(() => ({
    tooth: tissue({ roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.2 },
      `vec3 enamel = vec3(0.96, 0.94, 0.88) * (0.92 + 0.1 * fbm(vP * 1500.0));
       diffuseColor.rgb = mix(enamel, vec3(0.6, 0.3, 0.2), uStain * (0.35 + 0.25 * fbm(vP * 250.0)));`, u, 'uniform float uStain;'),
    gum: tissue({ roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15, sheen: 0.5, sheenColor: new THREE.Color('#ffc0c0') },
      'diffuseColor.rgb = mix(vec3(0.92, 0.5, 0.52), vec3(0.8, 0.36, 0.42), fbm(vP * 900.0));'),
    tongue: tissue({ roughness: 0.55, clearcoat: 0.7, clearcoatRoughness: 0.35, sheen: 0.6, sheenColor: new THREE.Color('#ffb3b3') },
      `vec3 base = mix(vec3(0.72, 0.24, 0.3), vec3(0.58, 0.16, 0.22), fbm(vP * 2400.0)) * (0.9 + 0.2 * fbm(vP * 6000.0));
       float d = distance(vP, uLes) / (0.0075 * max(uK, 0.001)) + (fbm(vP * 1800.0) - 0.5) * 0.6;
       float lpatch = (1.0 - smoothstep(0.75, 1.0, d)) * step(0.01, uK);
       vec3 leuko = vec3(0.93, 0.91, 0.86) * (0.85 + 0.2 * fbm(vP * 3000.0));
       vec3 ery = vec3(0.72, 0.08, 0.1);
       vec3 lesc = mix(leuko, ery, uRed * smoothstep(0.55, 0.0, d) * smoothstep(0.4, 0.7, fbm(vP * 2200.0 + 5.0)));
       diffuseColor.rgb = mix(base, lesc, lpatch);`, u, 'uniform vec3 uLes; uniform float uK, uRed;'),
  }), [u]);
  const k = useRef(0), mirror = useRef<THREE.Group>(null), spot = useRef<THREE.SpotLight>(null), ring = useRef<THREE.Mesh>(null);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const kk = reduce ? 1 : 1 - Math.exp(-dt * 0.9);
    k.current += ((stage >= 1 ? 1 : 0) - k.current) * kk;
    u.uK.value = k.current; u.uRed.value = k.current; u.uStain.value = stage === 1 ? k.current : stage === 2 ? 1 : k.current;
    const exam = stage === 2;
    if (mirror.current) {
      mirror.current.visible = exam;
      const a = Math.sin(t * 0.8) * 0.6;
      mirror.current.position.set(les.x + 0.026 + 0.003 * Math.cos(a), les.y + 0.02, les.z + 0.016 + 0.004 * Math.sin(a));
    }
    if (spot.current) {
      spot.current.visible = exam;
      spotTarget.position.set(les.x + 0.004 * Math.sin(t * 1.3), les.y, les.z + 0.004 * Math.cos(t * 0.9));
      spotTarget.updateMatrixWorld();
    }
    if (ring.current) { ring.current.visible = exam; ring.current.scale.setScalar(1 + 0.15 * Math.sin(t * 4)); }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {LOWER.map((id) => <Part key={id} p={org[id]} m={mats.tooth} />)}
      <Part p={org.FMA59764} m={mats.gum} />
      <Part p={tongue} m={mats.tongue} />
      
      <primitive object={spotTarget} />
      <spotLight ref={spot} position={[les.x + 0.03, les.y + 0.09, les.z + 0.05]} angle={0.18} penumbra={0.6} intensity={4} distance={0.3} decay={0} target={spotTarget} visible={false} />
      <group ref={mirror} visible={false} rotation={[0.5, 0.6, 0.3]}>
        <mesh><cylinderGeometry args={[0.0045, 0.0045, 0.0008, 32]} /><meshPhysicalMaterial color="#e8eef4" metalness={1} roughness={0.05} /></mesh>
        <mesh position={[0, 0, 0.022]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.0012, 0.0012, 0.04, 12]} /><meshPhysicalMaterial color="#b9c2cc" metalness={0.9} roughness={0.25} /></mesh>
      </group>
      <mesh ref={ring} position={les.clone().add(new THREE.Vector3(0, 0.002, 0))} rotation={[-Math.PI / 2, 0, 0]} visible={false}><torusGeometry args={[0.009, 0.0006, 8, 48]} /><meshBasicMaterial color="#ffd54a" /></mesh>
      {stage >= 1 && <Html position={les.clone().add(new THREE.Vector3(-0.004, 0.02, 0.012))} center className="anim-label">{stage === 2 ? '醫師目視檢查（示意）' : '舌緣白斑、紅斑（示意）'}</Html>}
    </group>
  );
}

/* ===================== 大腸直腸癌 ===================== */
function ColonScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const parts = useParts('organ', ['FMA14543nsn', 'FMA14544', 'FMA14542', 'FMA76891', 'FMA76892', 'FMA76893']);
  const colon = parts.FMA14543nsn, rect = parts.FMA14544;
  const C = colon.center;
  const S = 8;
  const ref = useMemo(() => {
    // 降結腸：身體左側（+x）的縱向腸段，以水平切片的中心近似中心線
    const slab = (y: number) => {
      const p = colon.geo.attributes.position, v = new THREE.Vector3(), s = new THREE.Vector3();
      let n = 0;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (v.x > (y < 0.885 ? 0.015 : 0.045) && Math.abs(v.y - y) < 0.006) { s.add(v); n++; } }
      return n ? s.divideScalar(n) : null;
    };
    const desc: THREE.Vector3[] = [];
    for (let y = 0.855; y <= 0.97; y += 0.01) { const c = slab(y); if (c) desc.push(c); }
    const lumen = desc[desc.length - 2] ?? C.clone();
    const wall = nearestVertex(colon.geo, lumen.clone().add(new THREE.Vector3(0.03, 0, 0.0)), (v) => Math.abs(v.y - lumen.y) < 0.004 && v.x > lumen.x && v.z < lumen.z + 0.004);
    const dir = lumen.clone().sub(wall).normalize();
    const rc = rect ? centerline(rect.geo, 'y', 6) : [];
    const path = [...(rc.length ? [rc[0].clone().add(new THREE.Vector3(0, -0.03, 0)), ...rc] : []), ...desc.filter((p) => p.y <= lumen.y + 0.001)];
    path.push(wall.clone().addScaledVector(dir, 0.012));
    return { lumen, wall, dir, path };
  }, [colon, rect, C]);
  const win = useMemo(() => ({ uWin: { value: ref.lumen.clone() }, uWinR: { value: 0.028 } }), [ref]);
  const mats = useMemo(() => ({
    colonWin: tissue({ roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.25, sheen: 0.5, sheenColor: new THREE.Color('#ffc6b8') },
      `if (length(vP.xy - uWin.xy) < uWinR && vP.z > uWin.z - 0.001) discard; // 降結腸開一個觀察窗（示意）
       float f = fbm(vP * 500.0);
       vec3 outside = mix(vec3(0.86, 0.6, 0.5), vec3(0.78, 0.48, 0.42), f);
       vec3 mucosa = mix(vec3(0.86, 0.42, 0.44), vec3(0.62, 0.22, 0.28), smoothstep(0.35, 0.75, fbm(vP * 1400.0)));
       float fold = 0.75 + 0.35 * sin(vP.y * 900.0 + fbm(vP * 300.0) * 4.0);
       diffuseColor.rgb = gl_FrontFacing ? outside : mucosa * fold;`, win, 'uniform vec3 uWin; uniform float uWinR;'),
    colon: tissue({ roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.25, sheen: 0.5, sheenColor: new THREE.Color('#ffc6b8') },
      `float f = fbm(vP * 500.0);
       vec3 outside = mix(vec3(0.86, 0.6, 0.5), vec3(0.78, 0.48, 0.42), f);
       vec3 mucosa = mix(vec3(0.86, 0.42, 0.44), vec3(0.62, 0.22, 0.28), smoothstep(0.35, 0.75, fbm(vP * 1400.0)));
       float fold = 0.75 + 0.35 * sin(vP.y * 900.0 + fbm(vP * 300.0) * 4.0);
       diffuseColor.rgb = gl_FrontFacing ? outside : mucosa * fold;`),
    taenia: tissue({ roughness: 0.5 }, 'if (length(vP.xy - uWin.xy) < uWinR && vP.z > uWin.z - 0.001) discard; diffuseColor.rgb = vec3(0.92, 0.82, 0.7);', win, 'uniform vec3 uWin; uniform float uWinR;'),
    polyp: tissue({ roughness: 0.45, clearcoat: 0.7 },
      'diffuseColor.rgb = mix(vec3(0.88, 0.45, 0.45), vec3(0.6, 0.15, 0.2), smoothstep(0.4, 0.8, fbm(vP * 2000.0)));'),
    scope: phys('#15181c', { roughness: 0.25, clearcoat: 1, side: THREE.FrontSide }),
  }), [win]);
  const polypGeo = useMemo(() => lumpGeometry(0.0085, 7), []); // 為了看得清楚，比實際稍大（示意）
  const polyp = useRef<THREE.Group>(null), drops = useRef<THREE.InstancedMesh>(null), scopeMesh = useRef<THREE.Mesh>(null), tip = useRef<THREE.Group>(null), snare = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(ref.path), [ref]);
  const scopeGeos = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const f = Math.max(0.02, i / 20);
    const pts = curve.getSpacedPoints(60).slice(0, Math.max(2, Math.round(60 * f) + 1));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.0045, 12, false);
  }), [curve]);
  const g = useRef(0), cut2 = useRef(1);
  const dropPath = useMemo(() => [ref.wall.clone().addScaledVector(ref.dir, 0.006), ...[...ref.path].reverse().slice(1)], [ref]);
  const dropCurve = useMemo(() => new THREE.CatmullRomCurve3(dropPath), [dropPath]);
  const d = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const kk = reduce ? 1 : 1 - Math.exp(-dt * 0.9);
    g.current += ((stage >= 1 ? 1 : 0) - g.current) * kk;
    // 大腸鏡：鏡身前進 → 套圈切除息肉（示意）
    const ph = stage === 2 ? (frozen || reduce ? 0.95 : (t % 9) / 9) : 0;
    const reach = Math.min(1, ph / 0.55);
    const removed = stage === 2 && ph > 0.75;
    cut2.current += ((removed ? 0 : 1) - cut2.current) * (reduce ? 1 : 1 - Math.exp(-dt * 4));
    if (polyp.current) { polyp.current.visible = g.current > 0.02; polyp.current.scale.setScalar(g.current * (stage === 2 ? cut2.current : 1)); }
    if (scopeMesh.current) { scopeMesh.current.visible = stage === 2; scopeMesh.current.geometry = scopeGeos[Math.round(reach * 20)]; }
    if (tip.current) { tip.current.visible = stage === 2; tip.current.position.copy(curve.getPointAt(Math.max(0.001, reach))); }
    if (snare.current) { snare.current.visible = stage === 2 && ph > 0.55 && ph < 0.8; snare.current.scale.setScalar(ph > 0.68 ? 0.5 : 1); }
    if (drops.current) {
      const show = stage === 1;
      drops.current.visible = show;
      for (let i = 0; i < 10; i++) {
        const s = ((t * 0.12 + i / 10) % 1);
        d.position.copy(dropCurve.getPointAt(s)); d.scale.setScalar(show ? 1 : 0); d.updateMatrix(); drops.current.setMatrixAt(i, d.matrix);
      }
      drops.current.instanceMatrix.needsUpdate = true;
    }
  });
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ref.dir), [ref]);
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <Part p={colon} m={mats.colonWin} />
      <Part p={rect} m={mats.colon} />
      <Part p={parts.FMA14542} m={mats.colon} />
      {['FMA76891', 'FMA76892', 'FMA76893'].map((id) => <Part key={id} p={parts[id]} m={mats.taenia} />)}
      <group ref={polyp} position={ref.wall} quaternion={q} visible={false}>
        <mesh position={[0, 0.004, 0]} material={mats.polyp}><cylinderGeometry args={[0.0026, 0.0036, 0.008, 16]} /></mesh>
        <mesh position={[0, 0.012, 0]} geometry={polypGeo} material={mats.polyp} />
      </group>
      <instancedMesh ref={drops} args={[undefined, undefined, 10]} visible={false}>
        <sphereGeometry args={[0.0016, 10, 8]} />
        <meshPhysicalMaterial color="#9c0f16" roughness={0.15} clearcoat={1} />
      </instancedMesh>
      <mesh ref={scopeMesh} material={mats.scope} visible={false} geometry={scopeGeos[0]} />
      <group ref={tip} visible={false}>
        <mesh><sphereGeometry args={[0.0028, 16, 12]} /><meshBasicMaterial color="#fff8d6" /></mesh>
        <pointLight intensity={0.6} distance={0.08} decay={0} color="#fff3cf" />
      </group>
      <mesh ref={snare} position={ref.wall.clone().addScaledVector(ref.dir, 0.008)} quaternion={q} visible={false}>
        <torusGeometry args={[0.009, 0.0006, 8, 40]} /><meshPhysicalMaterial color="#d8dee6" metalness={1} roughness={0.2} />
      </mesh>
      {stage >= 1 && <Html position={ref.wall.clone().add(new THREE.Vector3(-0.045, 0.035, 0.03))} center className="anim-label">{stage === 2 ? '大腸鏡切除息肉（示意）' : '腺瘤息肉（示意）'}</Html>}
    </group>
  );
}

const VIEW: Record<CancerTopic, { cam: [number, number, number]; target: [number, number, number]; label: string; caption: string }> = {
  'lung-cancer': { cam: [0.7, 0.5, 4.6], target: [0, 0, 0], label: '肺部模型', caption: '肺葉、氣管與支氣管形狀來自 BodyParts3D 成年男性解剖模型；腫瘤、氣流與電腦斷層掃描為示意效果。' },
  'oral-cancer': { cam: [1.7, 2.1, 1.5], target: [0.1, -0.1, 0.1], label: '口腔模型', caption: '下排牙齒與牙齦來自 BodyParts3D，舌來自 Z-Anatomy（CC BY-SA 4.0）；為了看清楚口腔內部，隱藏了上顎與上排牙齒。病灶、牙齒染色、口鏡與照明為示意效果。' },
  'colorectal-cancer': { cam: [0.4, 0.25, 3.9], target: [0, 0, 0], label: '大腸模型', caption: '大腸、直腸與闌尾形狀來自 BodyParts3D 成年男性解剖模型（降結腸開觀察窗）；息肉、出血、大腸鏡為示意效果。' },
};

export default function CancerAnims({ topic }: { topic: CancerTopic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { setStage(0); }, [topic]);
  const info = INFO[topic][stage];
  const v = VIEW[topic];
  return (
    <figure className="vessel">
      <div className="tear-canvas tall" role="img" aria-label={`${info.label}的衛教示意動畫`}>
        <Canvas camera={{ position: v.cam, fov: 34, near: 0.02, far: 40 }} dpr={[1, 2]} gl={{ antialias: true, localClippingEnabled: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <color attach="background" args={['#101c2b']} />
          <StudioLights />
          <Suspense fallback={<Html center className="anim-label">載入{v.label}…</Html>}>
            {topic === 'lung-cancer' && <LungScene stage={stage} frozen={frozen} />}
            {topic === 'oral-cancer' && <OralScene stage={stage} frozen={frozen} />}
            {topic === 'colorectal-cancer' && <ColonScene stage={stage} frozen={frozen} />}
          </Suspense>
          <OrbitControls enablePan={false} enableZoom minDistance={1.2} maxDistance={6} enableDamping dampingFactor={0.1} target={v.target} />
        </Canvas>
      </div>
      <div className="seg" role="group" aria-label="情境">
        {INFO[topic].map((x, i) => <button key={x.label} className={stage === i ? 'on' : ''} aria-pressed={stage === i} onClick={() => setStage(i)}>{x.label}</button>)}
      </div>
      <div className="tear-controls">
        <div className="tear-readout"><b>{info.label}</b></div>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      <p className="small">{info.note}</p>
      <figcaption className="small">衛教示意：{v.caption}不是個人影像或檢查結果；診斷需由醫師評估。可拖曳旋轉、滾輪縮放。</figcaption>
    </figure>
  );
}
