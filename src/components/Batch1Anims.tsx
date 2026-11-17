import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { useParts } from '../three/partGeometry';
import { PARTS } from '../three/anatomy';
import StudioLights from '../three/StudioLights';
import { Part, phys, rnd, tissue } from '../three/tissue';

/**
 * 代謝症候群、憂鬱症、更年期症候群的 3D 衛教示意。
 * 器官、皮膚、大腦、骨骼與血管使用 BodyParts3D 真實模型；脂肪、光線、骨質與熱潮紅為示意效果。
 * 情境文字對應 diseases.ts 已核對的國健署與 WHO 內容。
 */
export type Batch1Topic = 'metabolic-syndrome' | 'depression' | 'menopause';

const INFO: Record<Batch1Topic, { label: string; note: string }[]> = {
  'metabolic-syndrome': [
    { label: '腰圍與內臟脂肪', note: '腰圍代表脂肪分布；BMI 無法完全反映內臟脂肪。（黃色＝內臟脂肪，黃色環＝腰圍量測位置，示意）' },
    { label: '腹部肥胖：內臟脂肪堆積', note: '腹部肥胖代表內臟脂肪堆積多；腰圍粗、內臟脂肪多更容易導致代謝異常。判定標準：男性腰圍 ≥90 公分、女性 ≥80 公分。' },
    { label: '胰島素阻抗與五項指標', note: '胰島素阻抗是發生代謝症候群的原因：細胞對胰島素的敏感度變差，血液中的葡萄糖不容易進入細胞。五項判定因子符合三項（含）以上即為代謝症候群。' },
  ],
  depression: [
    { label: '情緒與身心（示意）', note: '憂鬱症是社會、心理與生物因素複雜交互作用的結果。圖中以腦部光線的明暗比喻情緒與活力，不是實際的腦部影像或檢查結果。' },
    { label: '憂鬱發作（持續兩週以上）', note: '情緒低落或對活動失去興趣，一天大部分時間、幾乎每天、持續至少兩週，與一般的情緒起伏不同。光線變暗為比喻（示意）。' },
    { label: '治療與自我照顧', note: '輕度、中度與重度憂鬱症都有有效治療。心理治療是首要治療，中度與重度可合併抗憂鬱藥物。是否罹患需由精神科或身心科醫師評估。' },
  ],
  menopause: [
    { label: '女性荷爾蒙逐漸減少（示意）', note: '婦女約在 45–52 歲時，卵巢逐漸停止製造女性荷爾蒙，這是更年期身心變化的主要原因。更年期是自然過程，不是疾病。' },
    { label: '熱潮紅、盜汗（示意）', note: '約三成婦女會因女性荷爾蒙不足而出現身心不適，生理症狀可能包括熱潮紅、盜汗、心悸等。圖中上半身血管發紅為示意。胸悶、心悸也可能來自心臟問題，應就醫排除。' },
    { label: '骨質流失（示意）', note: '更年期可能出現骨質流失。圖中脊椎與骨盆的骨頭變得疏鬆為示意；可多攝取含鈣與維生素 D 的食物，並規律運動。' },
  ],
};
const T_FROZEN = 1.6;

/* ===================== 代謝症候群 ===================== */
const ABD = { liver: 'FMA7197', pancreas: 'FMA7198nsn', stomach: 'FMA7148', rk: 'FMA7204', lk: 'FMA7205', spleen: 'FMA7196', gb: 'FMA7202' };
const GUT = ['FMA7206', 'FMA7207', 'FMA7208', 'FMA14543nsn', 'FMA14544'];
const WAIST_Y = 0.985;
const FAT_N = 700;

function MetSynScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', [...Object.values(ABD), ...GUT, 'FMA7274']);
  const skin = useParts('skin', ['FMA7163']).FMA7163;
  const C = useMemo(() => new THREE.Vector3(0, 1.03, 0.02), []);
  const S = 6.5;
  // 腰圍高度的皮膚截面：中心與前後、左右半徑
  const waist = useMemo(() => {
    const p = skin.geo.attributes.position, v = new THREE.Vector3();
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (Math.abs(v.y - WAIST_Y) < 0.006 && Math.abs(v.x) < 0.2) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z); }
    }
    return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, rx: (maxX - minX) / 2, rz: (maxZ - minZ) / 2 };
  }, [skin]);
  const u = useMemo(() => ({ uBelly: { value: 0 }, uWaist: { value: new THREE.Vector3(waist.cx, WAIST_Y, waist.cz) }, uIns: { value: 0 }, uT: { value: 0 } }), [waist]);
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 1, 0), -(0.84 - C.y) * S), new THREE.Plane(new THREE.Vector3(0, -1, 0), (1.3 - C.y) * S)], [C]);
  const mats = useMemo(() => ({
    skin: tissue({ transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color('#ffd9c4') },
      'diffuseColor.rgb = vec3(0.93, 0.76, 0.64);', u, 'uniform float uBelly; uniform vec3 uWaist;', '',
      `vec2 rd = position.xz - uWaist.xz; float g = exp(-pow((position.y - uWaist.y) / 0.075, 2.0));
       float front = smoothstep(-0.02, 0.06, rd.y);
       transformed.xz += normalize(rd + 1e-5) * uBelly * 0.045 * g * (0.35 + 0.65 * front);`),
    liver: phys('#7b2a24', { roughness: 0.3, clearcoat: 0.9 }),
    stomach: phys('#d69a8a', { roughness: 0.4, clearcoat: 0.7 }),
    gut: tissue({ roughness: 0.38, clearcoat: 0.8, sheen: 0.5, sheenColor: new THREE.Color('#ffc6b8') }, 'diffuseColor.rgb = mix(vec3(0.88, 0.62, 0.55), vec3(0.78, 0.48, 0.44), fbm(vP * 500.0));'),
    kidney: phys('#8a3a30', { roughness: 0.3, clearcoat: 0.8 }),
    spleen: phys('#6b2a3a', { roughness: 0.3, clearcoat: 0.8 }),
    gb: phys('#4f7d3a', { roughness: 0.25, clearcoat: 1 }),
    heart: phys('#a8352f', { roughness: 0.4, clearcoat: 0.6 }),
    pancreas: tissue({ roughness: 0.5, clearcoat: 0.5 }, 'diffuseColor.rgb = mix(vec3(0.92, 0.78, 0.55), vec3(0.85, 0.66, 0.45), fbm(vP * 1200.0));', u,
      'uniform float uIns, uT;', 'totalEmissiveRadiance += vec3(1.0, 0.5, 0.1) * uIns * (0.45 + 0.35 * sin(uT * 3.0));'),
    fat: phys('#f3d36b', { roughness: 0.35, clearcoat: 0.8, sheen: 0.7, sheenColor: new THREE.Color('#fff2b8') }),
  }), [u]);
  useEffect(() => { mats.skin.clippingPlanes = clip; }, [mats, clip]);

  // 內臟脂肪：沿腸道表面、網膜位置放置小脂肪葉（示意）
  const fat = useMemo(() => {
    const out: { p: THREE.Vector3; s: number }[] = [];
    const ids = ['FMA7207', 'FMA7208', 'FMA14543nsn'];
    let k = 0;
    for (let n = 0; out.length < FAT_N && n < 20000; n++) {
      const part = org[ids[n % ids.length]]; if (!part) continue;
      const pa = part.geo.attributes.position, i = Math.floor(rnd(n + 11) * pa.count);
      const v = new THREE.Vector3().fromBufferAttribute(pa, i);
      if (v.z < part.center.z - 0.01) continue; // 以前方（網膜）為主
      const dir = v.clone().sub(part.center).setY(0).normalize();
      v.addScaledVector(dir, 0.004 + rnd(n + 3) * 0.01).add(new THREE.Vector3(0, 0, 0.004));
      out.push({ p: v, s: 0.003 + rnd(k++ + 7) * 0.004 });
    }
    return out;
  }, [org]);
  const fatRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = fatRef.current; if (!m) return;
    const d = new THREE.Object3D();
    fat.forEach((f, i) => { d.position.copy(f.p); d.scale.setScalar(f.s / 0.006); d.rotation.set(rnd(i) * 3, rnd(i + 1) * 3, 0); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [fat]);
  const lobe = useMemo(() => { const g = new THREE.IcosahedronGeometry(0.006, 2); g.scale(1.2, 0.6, 1); return g; }, []);
  const k = useRef(0.15), tape = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const target = [0.15, 1, 1][stage];
    k.current += (target - k.current) * (reduce ? 1 : 1 - Math.exp(-dt * 0.9));
    u.uBelly.value = k.current; u.uIns.value = stage === 2 ? 1 : 0; u.uT.value = t;
    if (fatRef.current) fatRef.current.count = Math.round(FAT_N * k.current);
    if (tape.current) tape.current.scale.set(waist.rx + 0.006 + 0.02 * k.current, waist.rz + 0.006 + 0.04 * k.current, 1);
  });
  const P = (id: string, m: THREE.Material) => <Part key={id} p={org[id]} m={m} />;
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <Part p={skin} m={mats.skin} />
      {P(ABD.liver, mats.liver)}{P(ABD.stomach, mats.stomach)}{P(ABD.rk, mats.kidney)}{P(ABD.lk, mats.kidney)}
      {P(ABD.spleen, mats.spleen)}{P(ABD.gb, mats.gb)}{P(ABD.pancreas, mats.pancreas)}{P('FMA7274', mats.heart)}
      {GUT.map((id) => P(id, mats.gut))}
      <instancedMesh ref={fatRef} args={[lobe, mats.fat, FAT_N]} />
      <mesh ref={tape} position={[waist.cx, WAIST_Y, waist.cz + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.004, 8, 96]} />
        <meshPhysicalMaterial color="#ffd54a" emissive="#b37a00" emissiveIntensity={0.5} roughness={0.3} />
      </mesh>
      <Html position={[waist.cx + waist.rx + 0.03, WAIST_Y, waist.cz + 0.04]} center className="anim-label">腰圍（示意）</Html>
      {stage === 2 && org[ABD.pancreas] && <Html position={org[ABD.pancreas].center.clone().add(new THREE.Vector3(0.05, 0.03, 0.06))} center className="anim-label">胰臟：胰島素阻抗（示意）</Html>}
    </group>
  );
}

const METS_CRITERIA = ['腹部肥胖：男性腰圍 ≥90、女性 ≥80 公分', '血壓：收縮壓 ≥130 或舒張壓 ≥85 mmHg', '空腹血糖 ≥100 mg/dL', '空腹三酸甘油酯 ≥150 mg/dL', '高密度脂蛋白膽固醇：男性 <40、女性 <50 mg/dL'];

/* ===================== 憂鬱症 ===================== */
const BRAIN_IDS = PARTS.filter((p) => p.organ === 'brain' && !p.src).map((p) => p.id);
const ACT = [1, 0.18, 0.7];

function BrainScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const parts = useParts('organ', BRAIN_IDS);
  const list = useMemo(() => Object.values(parts), [parts]);
  const box = useMemo(() => { const b = new THREE.Box3(); list.forEach((p) => b.union(p.box)); return b; }, [list]);
  const C = box.getCenter(new THREE.Vector3());
  const S = 14;
  const u = useMemo(() => ({ uAct: { value: 1 }, uT: { value: 0 } }), []);
  const mat = useMemo(() => tissue({ roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.6, sheenColor: new THREE.Color('#ffd6d0') },
    `float f = fbm(vP * 700.0);
     vec3 warm = mix(vec3(0.95, 0.68, 0.66), vec3(0.82, 0.5, 0.52), f);
     vec3 cool = mix(vec3(0.5, 0.53, 0.6), vec3(0.4, 0.42, 0.5), f);
     diffuseColor.rgb = mix(cool, warm, uAct);`, u, 'uniform float uAct, uT;',
    'totalEmissiveRadiance += vec3(1.0, 0.72, 0.32) * uAct * 0.6 * smoothstep(0.05, 0.0, abs(vnoise(vP * 160.0 + vec3(uT * 0.5, uT * 0.3, 0.0)) - 0.5));'), [u]);
  // 腦表面閃爍的光點：數量與亮度隨「活力」變化（比喻，示意）
  const N_SP = 220;
  const sparks = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let n = 0; out.length < N_SP && n < 5000; n++) {
      const p = list[Math.floor(rnd(n) * list.length)]; if (!p) break;
      const pa = p.geo.attributes.position, v = new THREE.Vector3().fromBufferAttribute(pa, Math.floor(rnd(n + 9) * pa.count));
      if (v.distanceTo(C) < 0.05) continue;
      out.push(v.addScaledVector(v.clone().sub(C).normalize(), 0.002));
    }
    return out;
  }, [list, C]);
  const sp = useRef<THREE.InstancedMesh>(null);
  const a = useRef(1);
  const d = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    a.current += (ACT[stage] - a.current) * (reduce ? 1 : 1 - Math.exp(-dt * 0.8));
    u.uAct.value = a.current; u.uT.value = t;
    if (sp.current) {
      sparks.forEach((p, i) => {
        const tw = Math.max(0, Math.sin(t * (1.2 + rnd(i) * 2) + i * 1.7));
        const on = rnd(i + 3) < a.current;
        d.position.copy(p); d.scale.setScalar(on ? 0.3 + tw : 0.0001); d.updateMatrix(); sp.current!.setMatrixAt(i, d.matrix);
      });
      sp.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {list.map((p) => <mesh key={p.id} geometry={p.geo} material={mat} />)}
      <instancedMesh ref={sp} args={[undefined, undefined, N_SP]}>
        <sphereGeometry args={[0.0017, 10, 8]} />
        <meshBasicMaterial color="#ffe08a" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

const DEP_CHIPS: string[][] = [
  [],
  ['情緒低落（悲傷、易怒、空虛）', '對活動失去興趣', '睡眠紊亂', '食慾或體重改變', '非常疲倦、沒有精力', '注意力差'],
  ['心理治療（首要治療）', '中重度可合併藥物', '規律運動、短暫散步也好', '規律飲食與睡眠', '與親友保持聯繫', '避免或減少飲酒'],
];

/* ===================== 更年期症候群 ===================== */
const TORSO_BONES = PARTS.filter((p) => p.layer === 'skeleton' && !p.src && p.c[1] > 0.78 && p.c[1] < 1.5 && /vertebra|rib|sternum|sacrum|hip bone|clavicle|coccyx|manubrium/i.test(p.en) && !/disk|cartilage/i.test(p.en)).map((p) => p.id);
const LOSS_BONES = new Set(PARTS.filter((p) => /lumbar vertebra|sacrum|hip bone|thoracic vertebra/i.test(p.en) && !/disk/i.test(p.en)).map((p) => p.id));
const TORSO_VESSELS = PARTS.filter((p) => p.layer === 'vessel' && !p.src && p.c[1] > 0.8 && p.c[1] < 1.5 && !/pulmonary/i.test(p.en)).map((p) => p.id);

function MenoScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const bones = useParts('skeleton', TORSO_BONES);
  const ves = useParts('vessel', TORSO_VESSELS);
  const C = useMemo(() => new THREE.Vector3(0, 1.12, 0), []);
  const S = 5.2;
  const u = useMemo(() => ({ uLoss: { value: 0 }, uFlush: { value: 0 }, uT: { value: 0 } }), []);
  const mats = useMemo(() => ({
    bone: tissue({ roughness: 0.55, clearcoat: 0.3 }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));'),
    boneLoss: tissue({ roughness: 0.6, clearcoat: 0.25 },
      `vec3 b = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));
       float pore = smoothstep(0.66 - 0.22 * uLoss, 0.72 - 0.22 * uLoss, vnoise(vP * 1400.0));
       diffuseColor.rgb = mix(b, vec3(0.42, 0.34, 0.28), pore * uLoss);`, u, 'uniform float uLoss;'),
    artery: tissue({ roughness: 0.32, clearcoat: 0.8 }, 'diffuseColor.rgb = vec3(0.76, 0.22, 0.2);', u, 'uniform float uFlush, uT;',
      'totalEmissiveRadiance += vec3(1.0, 0.3, 0.12) * uFlush * smoothstep(1.1, 1.32, vP.y) * (1.1 + 0.6 * sin(uT * 2.2));'),
  }), [u]);
  const f = useRef(0), l = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const k = reduce ? 1 : 1 - Math.exp(-dt * 0.8);
    f.current += ((stage === 1 ? 1 : 0) - f.current) * k;
    l.current += ((stage === 2 ? 1 : 0) - l.current) * k;
    u.uFlush.value = f.current; u.uLoss.value = l.current; u.uT.value = t;
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {TORSO_BONES.map((id) => <Part key={id} p={bones[id]} m={LOSS_BONES.has(id) ? mats.boneLoss : mats.bone} />)}
      {TORSO_VESSELS.map((id) => <Part key={id} p={ves[id]} m={mats.artery} />)}
      {stage === 2 && <Html position={[0.09, 0.97, 0.05]} center className="anim-label">脊椎與骨盆：骨質流失（示意）</Html>}
      {stage === 1 && <Html position={[0.12, 1.36, 0.05]} center className="anim-label">上半身血管擴張、發熱（示意）</Html>}
    </group>
  );
}

/** 女性荷爾蒙隨年齡下降的示意曲線（無數值，只呈現趨勢） */
function HormoneChart() {
  return (
    <svg viewBox="0 0 220 90" className="mini-chart" role="img" aria-label="女性荷爾蒙隨年齡逐漸下降的示意曲線">
      <line x1="24" y1="70" x2="210" y2="70" stroke="currentColor" strokeOpacity="0.4" />
      <line x1="24" y1="10" x2="24" y2="70" stroke="currentColor" strokeOpacity="0.4" />
      <path d="M24 22 C 90 20, 110 26, 130 40 S 170 64, 210 66" fill="none" stroke="#e85d8a" strokeWidth="3" />
      <rect x="112" y="10" width="58" height="60" fill="#e85d8a" opacity="0.12" />
      <text x="141" y="84" fontSize="10" textAnchor="middle" fill="currentColor">約 45–52 歲</text>
      <text x="30" y="16" fontSize="10" fill="currentColor">女性荷爾蒙（示意）</text>
      <text x="206" y="84" fontSize="10" textAnchor="end" fill="currentColor">年齡 →</text>
    </svg>
  );
}

const VIEW: Record<Batch1Topic, { cam: [number, number, number]; target: [number, number, number]; caption: string }> = {
  'metabolic-syndrome': { cam: [1.4, 0.6, 5.2], target: [0, -0.15, 0], caption: '皮膚、肝、胰、胃、腸、腎與心臟形狀來自 BodyParts3D 成年男性解剖模型；內臟脂肪、腹部變粗與腰圍環為示意效果。' },
  depression: { cam: [2.4, 0.8, 3.4], target: [0, 0, 0], caption: '大腦形狀來自 BodyParts3D 成年男性解剖模型；光線明暗與連結光點是比喻，不是腦部影像、腦波或任何檢查結果。' },
  menopause: { cam: [1.4, 0.4, 4.6], target: [0, 0.05, 0], caption: '目前只有成年男性模型，無法顯示卵巢等女性器官；這裡以 BodyParts3D 的軀幹骨骼與血管呈現骨質與血管的變化（示意）。' },
};

export default function Batch1Anims({ topic }: { topic: Batch1Topic }) {
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
          <Suspense fallback={<Html center className="anim-label">載入模型…</Html>}>
            {topic === 'metabolic-syndrome' && <MetSynScene stage={stage} frozen={frozen} />}
            {topic === 'depression' && <BrainScene stage={stage} frozen={frozen} />}
            {topic === 'menopause' && <MenoScene stage={stage} frozen={frozen} />}
          </Suspense>
          <OrbitControls enablePan={false} enableZoom minDistance={1.2} maxDistance={7} enableDamping dampingFactor={0.1} target={v.target} />
        </Canvas>
      </div>
      <div className="seg" role="group" aria-label="情境">
        {INFO[topic].map((x, i) => <button key={x.label} className={stage === i ? 'on' : ''} aria-pressed={stage === i} onClick={() => setStage(i)}>{x.label}</button>)}
      </div>
      <div className="tear-controls">
        <div className="tear-readout"><b>{info.label}</b></div>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      {topic === 'metabolic-syndrome' && stage === 2 && (
        <ul className="anim-chips">{METS_CRITERIA.map((c, i) => <li key={c} className={i < 3 ? 'on' : ''}>{i < 3 ? '✓ ' : ''}{c}</li>)}</ul>
      )}
      {topic === 'metabolic-syndrome' && stage === 2 && <p className="small">示意：勾選的三項只是舉例，實際需依腰圍、血壓與抽血結果判定。</p>}
      {topic === 'depression' && DEP_CHIPS[stage].length > 0 && <ul className="anim-chips">{DEP_CHIPS[stage].map((c) => <li key={c} className="on">{c}</li>)}</ul>}
      {topic === 'menopause' && stage === 0 && <HormoneChart />}
      <p className="small">{info.note}</p>
      <figcaption className="small">衛教示意：{v.caption}可拖曳旋轉、滾輪縮放。診斷需由醫師評估。</figcaption>
    </figure>
  );
}
