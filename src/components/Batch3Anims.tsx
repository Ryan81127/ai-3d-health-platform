import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { centerline, useParts } from '../three/partGeometry';
import { PARTS } from '../three/anatomy';
import StudioLights from '../three/StudioLights';
import { Part, lumpGeometry, phys, rnd, samplePoints, tissue } from '../three/tissue';
import { MetSynScene } from './Batch1Anims';

/**
 * 第三批常見疾病的 3D 衛教示意：失智症、肌少症、退化性關節炎、痛風、胃食道逆流、B/C 型肝炎、腎結石、肥胖、甲狀腺功能異常、失眠症。
 * 器官與骨骼形狀來自 BodyParts3D／Z-Anatomy 真實模型；斑塊、結晶、病毒、結石、荷爾蒙與光線等為示意效果。
 * 情境文字對應 diseases.ts 已核對的 MedlinePlus、NIDDK、國健署與 AWGS 2019 內容。
 */
export type Batch3Topic = 'dementia' | 'sarcopenia' | 'osteoarthritis' | 'gout' | 'gerd' | 'viral-hepatitis' | 'kidney-stones' | 'obesity' | 'thyroid-disorders' | 'insomnia';

const INFO: Record<Batch3Topic, { label: string; note: string }[]> = {
  dementia: [
    { label: '大腦與心智功能', note: '記憶、語言、視覺理解、解決問題與專注力都仰賴大腦運作。年紀大稍微健忘是正常的，但失智症不是正常老化。' },
    { label: '阿茲海默症（示意）', note: 'β-類澱粉蛋白在腦細胞之間聚集成斑塊（黃色），tau 蛋白在神經細胞內形成糾結（深色），神經細胞之間的連結減少。斑塊與糾結的大小、數量為示意。' },
    { label: '血管性失智（示意）', note: '血管性失智症與腦部血液供應改變有關，常由中風或腦部動脈粥狀硬化造成。暗紅色區塊表示血流受影響的區域（示意）。' },
  ],
  sarcopenia: [
    { label: '大腿肌肉與肌力', note: '肌肉量、肌力與身體功能共同支撐行走、起身與平衡。（大腿前側、內側與後側肌群，示意）' },
    { label: '肌肉量與肌力流失（示意）', note: 'AWGS 定義肌少症為與年齡相關的肌肉量流失，加上肌力低下和／或身體功能表現低下。社區可先量小腿圍（男性 <34、女性 <33 公分）篩檢。肌肉變細與油花為示意。' },
    { label: '運動與營養（示意）', note: '生活型態介入，特別是運動與營養補充，是肌少症治療的主軸。圖中肌肉收縮的光為示意；運動強度請依個人狀況漸進。' },
  ],
  osteoarthritis: [
    { label: '健康的膝關節軟骨', note: '健康關節的骨頭末端覆蓋著光滑的軟骨（淡藍色），緩衝並讓關節順暢活動。' },
    { label: '軟骨磨損與骨刺（示意）', note: '退化性關節炎時軟骨磨損變粗糙，有時完全磨光使骨頭互相摩擦，關節附近也可能長出骨刺。磨損範圍與骨刺大小為示意。' },
    { label: '運動與減重（示意）', note: '治療通常從增加肌力、柔軟度與平衡的運動開始，需要時減重以改善髖、膝疼痛。向下的箭頭表示關節承受的負擔（示意）。' },
  ],
  gout: [
    { label: '大腳趾的關節', note: '痛風常從大腳趾開始。尿酸平時多溶在血液中，經腎臟過濾由尿液排出。' },
    { label: '尿酸結晶與急性發作（示意）', note: '尿酸累積時，部分人的尿酸會形成針狀結晶沉積在關節，造成劇痛、腫脹、發紅、發熱，常在夜間突然開始。結晶數量與紅腫範圍為示意。' },
    { label: '痛風石（長期未治療，示意）', note: '長期未治療時，皮下可能形成尿酸結晶硬塊（痛風石），造成骨骼與軟組織損傷、關節變形。及早治療與生活調整可以控制痛風。' },
  ],
  gerd: [
    { label: '食道下端正常關閉', note: '食道末端的肌肉（綠色環）在食物進入胃後關閉，避免胃內容物往上跑。胃為剖面（示意）。' },
    { label: '胃酸逆流（示意）', note: '這條肌肉變弱或在錯誤時間放鬆時，胃內容物往上移動並刺激食道，常見火燒心。食道下段發紅為刺激的示意。' },
    { label: '生活調整', note: '少量進食、飯後至少 2–3 小時不躺下、避免誘發症狀的食物、需要時減重、床頭墊高、戒菸。胸痛合併呼吸急促時請立即就醫。' },
  ],
  'viral-hepatitis': [
    { label: '健康的肝臟', note: '肝臟是身體重要的代謝器官。B 型與 C 型肝炎常沒有症狀，因此即使沒有症狀，篩檢也很重要。' },
    { label: '病毒感染與肝臟發炎（示意）', note: '肝炎是肝臟發炎；B 型與 C 型肝炎病毒感染後，可能造成急性或慢性感染。病毒與發炎區塊為示意。' },
    { label: '肝硬化與肝癌風險（示意）', note: '慢性 B 型、C 型肝炎可能演變為肝硬化（肝臟結疤）、肝衰竭與肝癌。及早診斷治療可預防這些併發症。表面結節與腫瘤為示意。' },
  ],
  'kidney-stones': [
    { label: '腎臟與尿液排出', note: '尿液由腎臟製造，經輸尿管流到膀胱。（黃色點＝尿液，右腎為剖面，示意）' },
    { label: '結石形成（示意）', note: '尿液中鈣、草酸、磷的濃度過高時，可能在腎臟形成結石，小如沙粒、大如珍珠。結石大小為示意。' },
    { label: '結石卡在輸尿管（示意）', note: '結石卡在泌尿道時可能阻塞尿流並造成劇痛。喝足夠的水是預防腎結石最重要的事。劇痛、血尿、發燒畏寒時請儘速就醫。' },
  ],
  obesity: [
    { label: '健康體重', note: '我國成人健康體重為 18.5 ≦ BMI <24。（黃色＝內臟脂肪，黃色環＝腰圍位置，示意）' },
    { label: '過重與肥胖：脂肪堆積', note: '長期攝取的熱量多於消耗時，身體把多餘熱量以脂肪儲存；BMI ≧27 為肥胖。腹部脂肪多時，健康問題的風險更高。' },
    { label: '減重 5–10%（示意）', note: '肥胖者即使只減少 5–10% 體重，也能延緩或預防部分疾病；每天創造 500 大卡的落差，每週可減重約 0.5 至 1 公斤。' },
  ],
  'thyroid-disorders': [
    { label: '甲狀腺與荷爾蒙', note: '甲狀腺是頸部前方蝴蝶形的腺體，製造控制身體使用能量的荷爾蒙（橘色點，示意），影響心跳、體重、消化與情緒。' },
    { label: '功能低下（示意）', note: '荷爾蒙不足時，許多身體機能變慢：疲倦、怕冷、體重增加、心跳變慢等；症狀發展慢，可能數月甚至數年都沒注意到。' },
    { label: '功能亢進（示意）', note: '荷爾蒙過多時可能出現心跳快且不規則、怕熱、手抖、體重減輕；也可能出現甲狀腺腫（圖中甲狀腺變大為示意）。' },
  ],
  insomnia: [
    { label: '夜間正常睡眠（示意）', note: '睡眠時大腦進入休息與修復的節律。圖中以柔和、緩慢的光表示放鬆入睡，是比喻，不是腦部影像。' },
    { label: '失眠（示意）', note: '躺很久才睡著、半夜醒著、太早醒；白天可能想睡、沒精神、焦慮或易怒，專注與記憶也受影響。大腦持續發亮為比喻（示意）。' },
    { label: '睡眠習慣與認知行為治療', note: '良好的睡眠習慣常能緩解急性失眠；認知行為治療（CBT）可緩解慢性失眠相關的焦慮。若失眠由其他問題造成，應同時治療。' },
  ],
};
const T_FROZEN = 1.6;
const ease = (cur: number, target: number, dt: number, reduce: boolean, rate = 0.9) => (reduce ? target : cur + (target - cur) * (1 - Math.exp(-dt * rate)));

/** 依清單位置擺放的實例物件；count 由外部 ref 控制 */
function useInstances(pts: THREE.Vector3[], size: (i: number) => number, rot = true) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current; if (!m) return;
    const d = new THREE.Object3D();
    pts.forEach((p, i) => { d.position.copy(p); d.scale.setScalar(size(i)); if (rot) d.rotation.set(rnd(i) * 6, rnd(i + 1) * 6, rnd(i + 2) * 6); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [pts, size, rot]);
  return ref;
}

/* ===================== 大腦（失智症、失眠） ===================== */
const BRAIN_IDS = PARTS.filter((p) => p.organ === 'brain' && !p.src).map((p) => p.id);
function useBrain() {
  const parts = useParts('organ', BRAIN_IDS);
  const list = useMemo(() => Object.values(parts), [parts]);
  const C = useMemo(() => { const b = new THREE.Box3(); list.forEach((p) => b.union(p.box)); return b.getCenter(new THREE.Vector3()); }, [list]);
  return { list, C };
}
function brainMat(u: Record<string, THREE.IUniform>) {
  return tissue({ roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.6, sheenColor: new THREE.Color('#ffd6d0') },
    `float f = fbm(vP * 700.0);
     vec3 base = mix(vec3(0.94, 0.7, 0.68), vec3(0.8, 0.52, 0.53), f);
     base = mix(base, base * vec3(0.55, 0.6, 0.8), uNight);
     float sul = smoothstep(0.5, 0.75, fbm(vP * 260.0));
     diffuseColor.rgb = base * (1.0 - uAtro * 0.35 * sul);
     float isch = uIsch * smoothstep(0.7, 0.82, vnoise(vP * 120.0 + 7.0));
     diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.12, 0.16), isch);`,
    u, 'uniform float uAct, uT, uAtro, uIsch, uNight;',
    'totalEmissiveRadiance += mix(vec3(1.0, 0.72, 0.32), vec3(0.45, 0.65, 1.0), uNight) * uAct * 0.6 * smoothstep(0.05, 0.0, abs(vnoise(vP * 160.0 + vec3(uT * (0.2 + uAct), uT * 0.3, 0.0)) - 0.5));');
}

function DementiaScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const { list, C } = useBrain();
  const S = 14;
  const u = useMemo(() => ({ uAct: { value: 0.8 }, uT: { value: 0 }, uAtro: { value: 0 }, uIsch: { value: 0 }, uNight: { value: 0 } }), []);
  const mat = useMemo(() => brainMat(u), [u]);
  const plaques = useMemo(() => list.flatMap((p, i) => samplePoints(p.geo, 3, i * 31, (v) => v.distanceTo(C) > 0.045).map((v) => v.addScaledVector(v.clone().sub(C).normalize(), 0.0012))), [list, C]);
  const tangles = useMemo(() => list.flatMap((p, i) => samplePoints(p.geo, 2, i * 17 + 5, (v) => v.distanceTo(C) > 0.045)), [list, C]);
  const pRef = useInstances(plaques, (i) => 0.6 + rnd(i) * 0.8);
  const tRef = useInstances(tangles, (i) => 0.7 + rnd(i + 4) * 0.6);
  const plaqueGeo = useMemo(() => lumpGeometry(0.0026, 5, 2), []);
  const k = useRef(0), g = useRef(1);
  const grp = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, stage === 1 ? 1 : 0, dt, reduce);
    g.current = ease(g.current, stage === 1 ? 0.965 : 1, dt, reduce);
    u.uT.value = t; u.uAtro.value = k.current; u.uAct.value = 0.8 - 0.5 * k.current;
    u.uIsch.value = ease(u.uIsch.value as number, stage === 2 ? 1 : 0, dt, reduce);
    if (pRef.current) pRef.current.count = Math.round(plaques.length * k.current);
    if (tRef.current) tRef.current.count = Math.round(tangles.length * k.current);
    if (grp.current) grp.current.scale.setScalar(g.current);
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <group ref={grp} position={C}><group position={C.clone().negate()}>
        {list.map((p) => <mesh key={p.id} geometry={p.geo} material={mat} />)}
      </group></group>
      <instancedMesh frustumCulled={false} ref={pRef} args={[plaqueGeo, undefined, plaques.length]}><meshPhysicalMaterial color="#f2c440" roughness={0.45} clearcoat={0.6} emissive="#7a5200" emissiveIntensity={0.4} /></instancedMesh>
      <instancedMesh frustumCulled={false} ref={tRef} args={[undefined, undefined, tangles.length]}>
        <torusKnotGeometry args={[0.0022, 0.0005, 40, 6, 2, 3]} /><meshPhysicalMaterial color="#4a1830" roughness={0.5} emissive="#2a0a18" />
      </instancedMesh>
    </group>
  );
}

function InsomniaScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const { list, C } = useBrain();
  const S = 14;
  const u = useMemo(() => ({ uAct: { value: 0.2 }, uT: { value: 0 }, uAtro: { value: 0 }, uIsch: { value: 0 }, uNight: { value: 1 } }), []);
  const mat = useMemo(() => brainMat(u), [u]);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uT.value = t;
    u.uAct.value = ease(u.uAct.value as number, [0.22, 1.1, 0.35][stage], dt, reduce);
    u.uNight.value = ease(u.uNight.value as number, stage === 1 ? 0.25 : 1, dt, reduce);
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {list.map((p) => <mesh key={p.id} geometry={p.geo} material={mat} />)}
      <Html position={C.clone().add(new THREE.Vector3(0.07, 0.07, 0))} center className="anim-label">{stage === 1 ? '凌晨 3:00 仍清醒（示意）' : '夜間 23:00 入睡（示意）'}</Html>
    </group>
  );
}

/* ===================== 肌少症 ===================== */
const THIGH = ['FMA22354', 'FMA22358', 'FMA22448', 'FMA22452', 'FMA22456', 'FMA22459', 'FMA38928', 'FMA38930', 'FMA38932', 'FMA38934', 'FMA43883', 'FMA43886', 'FMA45888', 'FMA45891'];
function SarcoScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const mus = useParts('muscle', THIGH);
  const bone = useParts('skeleton', ['FMA24474', 'FMA24486', 'FMA16586', 'FMA24477', 'FMA24480']);
  const fem = bone.FMA24474;
  const A = useMemo(() => new THREE.Vector3(fem.center.x, fem.box.max.y, fem.center.z), [fem]);
  const B = useMemo(() => new THREE.Vector3(fem.center.x, fem.box.min.y, fem.center.z), [fem]);
  const C = useMemo(() => fem.center.clone().add(new THREE.Vector3(0, 0.02, 0)), [fem]);
  const S = 4.2;
  const u = useMemo(() => ({ uK: { value: 1 }, uFat: { value: 0 }, uA: { value: A }, uB: { value: B }, uEx: { value: 0 }, uT: { value: 0 } }), [A, B]);
  const mat = useMemo(() => tissue({ roughness: 0.45, clearcoat: 0.5, sheen: 0.6, sheenColor: new THREE.Color('#ffb0a0') },
    `float fib = 0.88 + 0.14 * sin(dot(vP, vec3(0.3, 1.0, 0.0)) * 700.0 + fbm(vP * 300.0) * 3.0);
     vec3 m = vec3(0.68, 0.18, 0.17) * fib;
     float marb = uFat * smoothstep(0.55, 0.78, fbm(vP * 500.0 + 2.0));
     diffuseColor.rgb = mix(m, vec3(0.95, 0.85, 0.6), marb);`,
    u, 'uniform float uK, uFat, uEx, uT; uniform vec3 uA, uB;',
    'totalEmissiveRadiance += vec3(1.0, 0.45, 0.25) * uEx * (0.25 + 0.25 * sin(uT * 4.0));',
    `vec3 ab = uB - uA; float h = clamp(dot(position - uA, ab) / dot(ab, ab), 0.0, 1.0);
     vec3 c = uA + ab * h; transformed = c + (position - c) * uK;`), [u]);
  const boneMat = useMemo(() => phys('#eee6d6', { roughness: 0.55, clearcoat: 0.3 }), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uT.value = t;
    u.uK.value = ease(u.uK.value as number, [1, 0.8, 0.93][stage], dt, reduce);
    u.uFat.value = ease(u.uFat.value as number, [0, 1, 0.5][stage], dt, reduce);
    u.uEx.value = stage === 2 ? 1 : 0;
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {Object.values(bone).map((p) => <Part key={p.id} p={p} m={boneMat} />)}
      {THIGH.map((id) => <Part key={id} p={mus[id]} m={mat} />)}
    </group>
  );
}

/* ===================== 退化性關節炎（右膝） ===================== */
function OAScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const bone = useParts('skeleton', ['FMA24474', 'FMA24477', 'FMA24480', 'FMA24486']);
  const mus = useParts('muscle', ['FMA38928', 'FMA38930', 'FMA38932', 'FMA38934']);
  const fem = bone.FMA24474, tib = bone.FMA24477;
  const kneeY = (fem.box.min.y + tib.box.max.y) / 2;
  const C = useMemo(() => new THREE.Vector3(fem.center.x, kneeY + 0.01, fem.center.z), [fem, kneeY]);
  const S = 9;
  const u = useMemo(() => ({ uWear: { value: 0 }, uKnee: { value: kneeY }, uOff: { value: 0.0028 } }), [kneeY]);
  const cart = (above: boolean) => tissue({ roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.92 },
    `if (${above ? 'vP.y > uKnee + 0.026' : 'vP.y < uKnee - 0.022'}) discard;
     if (uWear > 0.01 && vnoise(vP * 600.0) > 1.0 - uWear * 0.55) discard;
     diffuseColor.rgb = mix(vec3(0.55, 0.78, 0.95), vec3(0.8, 0.72, 0.55), uWear) * (0.9 + 0.15 * fbm(vP * 900.0));`,
    u, 'uniform float uWear, uKnee, uOff;', '', 'transformed += objectNormal * uOff * (1.0 - uWear * 0.5);');
  const mats = useMemo(() => ({
    bone: tissue({ roughness: 0.55, clearcoat: 0.3 }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));'),
    cartF: cart(true), cartT: cart(false),
    mus: phys('#b33a33', { transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.5 }),
  }), [u]); // eslint-disable-line react-hooks/exhaustive-deps
  const spurs = useMemo(() => [fem, tib].flatMap((b, j) => samplePoints(b.geo, 10, j * 50 + 3, (v) => Math.abs(v.y - kneeY) < 0.03 && Math.abs(v.x - b.center.x) > 0.03)), [fem, tib, kneeY]);
  const sRef = useInstances(spurs, (i) => 0.6 + rnd(i) * 0.7);
  const spurGeo = useMemo(() => lumpGeometry(0.0045, 2, 2), []);
  const arrow = useRef<THREE.Group>(null), femG = useRef<THREE.Group>(null);
  const w = useRef(0);
  useFrame((_, dt) => {
    w.current = ease(w.current, stage >= 1 ? 1 : 0, dt, reduce);
    u.uWear.value = w.current;
    if (sRef.current) sRef.current.count = Math.round(spurs.length * w.current);
    if (femG.current) femG.current.position.y = -0.0025 * w.current; // 關節間隙變窄（示意）
    if (arrow.current) { arrow.current.visible = stage >= 1; arrow.current.scale.setScalar(stage === 2 ? 0.6 : 1); }
    void frozen;
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <group ref={femG}>
        <Part p={fem} m={mats.bone} />
        <mesh geometry={fem.geo} material={mats.cartF} />
        <Part p={bone.FMA24486} m={mats.bone} />
      </group>
      <Part p={tib} m={mats.bone} />
      <mesh geometry={tib.geo} material={mats.cartT} />
      <Part p={bone.FMA24480} m={mats.bone} />
      {stage === 2 && Object.values(mus).map((p) => <Part key={p.id} p={p} m={mats.mus} />)}
      <instancedMesh frustumCulled={false} ref={sRef} args={[spurGeo, undefined, spurs.length]}><meshPhysicalMaterial color="#e6dcc4" roughness={0.6} /></instancedMesh>
      <group ref={arrow} position={[C.x + 0.07, kneeY + 0.09, C.z + 0.03]} visible={false}>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.004, 0.004, 0.04, 12]} /><meshStandardMaterial color="#ff9a2e" emissive="#a04800" /></mesh>
        <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.01, 0.018, 16]} /><meshStandardMaterial color="#ff9a2e" emissive="#a04800" /></mesh>
      </group>
      {stage >= 1 && <Html position={[C.x - 0.06, kneeY + 0.005, C.z + 0.03]} center className="anim-label">{stage === 1 ? '軟骨磨損、骨刺（示意）' : '肌力訓練、減輕負擔（示意）'}</Html>}
    </group>
  );
}

/* ===================== 痛風（右腳大腳趾） ===================== */
const FOOT = PARTS.filter((p) => p.layer === 'skeleton' && !p.src && /right/i.test(p.en) && p.c[1] < 0.09 && p.c[0] < -0.04).map((p) => p.id);
function GoutScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const bones = useParts('skeleton', FOOT);
  const met = bones.FMA24507, phal = bones.FMA43253;
  const J = useMemo(() => new THREE.Vector3((met.center.x + phal.center.x) / 2, (met.center.y + phal.center.y) / 2 - 0.002, (met.box.max.z + phal.box.min.z) / 2), [met, phal]);
  const S = 14;
  const boneMat = useMemo(() => tissue({ roughness: 0.55, clearcoat: 0.3 }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 900.0));'), []);
  const needles = useMemo(() => Array.from({ length: 90 }, (_, i) => J.clone().add(new THREE.Vector3((rnd(i) - 0.5) * 0.02, (rnd(i + 1) - 0.5) * 0.014, (rnd(i + 2) - 0.5) * 0.016))), [J]);
  const nRef = useInstances(needles, () => 1);
  const tophi = useMemo(() => [new THREE.Vector3(-0.006, 0.005, 0.002), new THREE.Vector3(0.007, 0.004, -0.003), new THREE.Vector3(0, 0.008, 0.005)].map((o) => J.clone().add(o)), [J]);
  const tRef = useInstances(tophi, (i) => 0.8 + rnd(i) * 0.5);
  const tophGeo = useMemo(() => lumpGeometry(0.0045, 9, 3), []);
  const halo = useRef<THREE.Mesh>(null);
  const k = useRef(0), tk = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, stage >= 1 ? 1 : 0, dt, reduce);
    tk.current = ease(tk.current, stage === 2 ? 1 : 0, dt, reduce);
    if (nRef.current) nRef.current.count = Math.round(needles.length * k.current);
    if (tRef.current) { tRef.current.count = tk.current > 0.05 ? tophi.length : 0; tRef.current.scale.setScalar(Math.max(0.01, tk.current)); }
    if (halo.current) {
      halo.current.visible = stage === 1;
      (halo.current.material as THREE.MeshPhysicalMaterial).opacity = 0.18 + 0.1 * Math.sin(t * 3);
      halo.current.scale.setScalar(0.95 + 0.05 * Math.sin(t * 3));
    }
  });
  return (
    <group scale={S} position={J.clone().multiplyScalar(-S)}>
      {FOOT.map((id) => <Part key={id} p={bones[id]} m={boneMat} />)}
      <instancedMesh frustumCulled={false} ref={nRef} args={[undefined, undefined, needles.length]}>
        <cylinderGeometry args={[0.0006, 0.0001, 0.008, 6]} /><meshPhysicalMaterial color="#ffffff" roughness={0.15} clearcoat={1} emissive="#9fc6ff" emissiveIntensity={0.35} />
      </instancedMesh>
      <instancedMesh frustumCulled={false} ref={tRef} args={[tophGeo, undefined, tophi.length]}><meshPhysicalMaterial color="#f1ead8" roughness={0.85} /></instancedMesh>
      <mesh ref={halo} position={J} visible={false}><sphereGeometry args={[0.016, 32, 24]} /><meshPhysicalMaterial color="#ff3b2f" transparent opacity={0.2} depthWrite={false} emissive="#b31d12" emissiveIntensity={0.6} /></mesh>
      <Html position={J.clone().add(new THREE.Vector3(0.02, 0.02, 0))} center className="anim-label">{['大腳趾第一蹠趾關節', '尿酸結晶、紅腫熱痛（示意）', '痛風石（示意）'][stage]}</Html>
    </group>
  );
}

/* ===================== 胃食道逆流 ===================== */
function GerdScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const parts = useParts('organ', ['FMA7131', 'FMA7148']);
  const eso = parts.FMA7131, sto = parts.FMA7148;
  const ref = useMemo(() => {
    const cl = centerline(eso.geo, 'y', 14);          // 由下往上
    const les = cl[0].clone();
    const inside = samplePoints(sto.geo, 60, 3, (v) => v.z < sto.center.z).map((v) => v.lerp(sto.center, 0.45));
    return { cl, les, inside };
  }, [eso, sto]);
  const C = useMemo(() => ref.les.clone().add(new THREE.Vector3(0.02, -0.03, 0)), [ref]);
  const S = 9;
  const u = useMemo(() => ({ uIrr: { value: 0 }, uLes: { value: ref.les } }), [ref]);
  const cut = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), (sto.center.z - C.z + 0.004) * S), [sto, C]);
  const mats = useMemo(() => ({
    sto: tissue({ roughness: 0.4, clearcoat: 0.8, sheen: 0.5, sheenColor: new THREE.Color('#ffc6b8') },
      `vec3 outside = mix(vec3(0.88, 0.62, 0.55), vec3(0.8, 0.5, 0.46), fbm(vP * 500.0));
       vec3 mucosa = mix(vec3(0.86, 0.42, 0.44), vec3(0.66, 0.24, 0.3), smoothstep(0.3, 0.8, fbm(vP * 900.0))) * (0.8 + 0.3 * sin(vP.y * 700.0 + fbm(vP * 200.0) * 5.0));
       diffuseColor.rgb = gl_FrontFacing ? outside : mucosa;`),
    eso: tissue({ roughness: 0.4, clearcoat: 0.7, sheen: 0.4 },
      'diffuseColor.rgb = mix(vec3(0.9, 0.66, 0.6), vec3(0.85, 0.2, 0.18), uIrr * smoothstep(0.07, 0.0, vP.y - uLes.y));', u, 'uniform float uIrr; uniform vec3 uLes;',
      'totalEmissiveRadiance += vec3(0.9, 0.15, 0.05) * uIrr * 0.5 * smoothstep(0.07, 0.0, vP.y - uLes.y);'),
  }), [u]);
  useEffect(() => { mats.sto.clippingPlanes = [cut]; }, [mats, cut]);
  const acid = useRef<THREE.InstancedMesh>(null), ring = useRef<THREE.Mesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => [ref.les, ...ref.cl.slice(1, 9)], [ref]);
  const upCurve = useMemo(() => new THREE.CatmullRomCurve3(up), [up]);
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), ref.cl[2].clone().sub(ref.cl[0]).normalize()), [ref]);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uIrr.value = ease(u.uIrr.value as number, stage === 1 ? 1 : 0, dt, reduce);
    if (ring.current) {
      (ring.current.material as THREE.MeshStandardMaterial).color.set(stage === 1 ? '#ff6a3d' : '#3fd68a');
      ring.current.scale.setScalar(stage === 1 ? 1.5 + 0.2 * Math.sin(t * 2) : 1);
    }
    if (acid.current) {
      ref.inside.forEach((p, i) => {
        const reflux = stage === 1 && i % 3 === 0;
        if (reflux) { const s = (t * 0.25 + rnd(i)) % 1; d.position.copy(upCurve.getPointAt(s * 0.8)); }
        else d.position.copy(p).add(new THREE.Vector3(Math.sin(t * 1.3 + i) * 0.002, Math.cos(t * 1.1 + i) * 0.002, 0));
        d.scale.setScalar(1); d.updateMatrix(); acid.current!.setMatrixAt(i, d.matrix);
      });
      acid.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <Part p={sto} m={mats.sto} />
      <Part p={eso} m={mats.eso} />
      <mesh ref={ring} position={ref.les} quaternion={q}><torusGeometry args={[0.0075, 0.0018, 12, 40]} /><meshStandardMaterial color="#3fd68a" emissive="#0b6b3a" emissiveIntensity={0.6} /></mesh>
      <instancedMesh frustumCulled={false} ref={acid} args={[undefined, undefined, ref.inside.length]}>
        <sphereGeometry args={[0.0022, 10, 8]} /><meshPhysicalMaterial color="#d8f04a" emissive="#6b7a00" emissiveIntensity={0.5} roughness={0.1} clearcoat={1} />
      </instancedMesh>
      <Html position={ref.les.clone().add(new THREE.Vector3(0.035, 0.012, 0))} center className="anim-label">{stage === 1 ? '括約肌鬆弛、胃酸逆流（示意）' : '食道下端括約肌'}</Html>
    </group>
  );
}

/* ===================== B／C 型肝炎 ===================== */
function HepScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const parts = useParts('organ', ['FMA7197', 'FMA7202']);
  const liver = parts.FMA7197;
  const C = liver.center;
  const S = 7;
  const u = useMemo(() => ({ uInf: { value: 0 }, uCir: { value: 0 }, uT: { value: 0 } }), []);
  const mat = useMemo(() => tissue({ roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.2, sheen: 0.4 },
    `vec3 h = mix(vec3(0.5, 0.15, 0.12), vec3(0.42, 0.11, 0.1), fbm(vP * 400.0));
     vec3 cir = mix(vec3(0.52, 0.36, 0.2), vec3(0.4, 0.24, 0.14), fbm(vP * 900.0));
     diffuseColor.rgb = mix(h, cir, uCir);`, u, 'uniform float uInf, uCir, uT;',
    'totalEmissiveRadiance += vec3(1.0, 0.35, 0.1) * uInf * 0.45 * smoothstep(0.55, 0.8, vnoise(vP * 160.0 + vec3(0.0, uT * 0.3, 0.0))) * (0.6 + 0.4 * sin(uT * 2.0));',
    'transformed += objectNormal * uCir * (vnoise(position * 520.0) - 0.35) * 0.0035;'), [u]);
  const gb = useMemo(() => phys('#4f7d3a', { roughness: 0.25, clearcoat: 1 }), []);
  const vir = useMemo(() => samplePoints(liver.geo, 40, 7, (v) => v.z > C.z).map((v) => v.addScaledVector(v.clone().sub(C).normalize(), 0.006)), [liver, C]);
  const vRef = useInstances(vir, (i) => 0.8 + rnd(i) * 0.5);
  const tumorAt = useMemo(() => samplePoints(liver.geo, 1, 21, (v) => v.z > C.z + 0.02)[0] ?? C, [liver, C]);
  const tumGeo = useMemo(() => lumpGeometry(0.009, 4), []);
  const virGeo = useMemo(() => new THREE.IcosahedronGeometry(0.0022, 0), []);
  const grp = useRef<THREE.Group>(null), tum = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uT.value = t;
    u.uInf.value = ease(u.uInf.value as number, stage === 1 ? 1 : stage === 2 ? 0.3 : 0, dt, reduce);
    u.uCir.value = ease(u.uCir.value as number, stage === 2 ? 1 : 0, dt, reduce);
    if (vRef.current) { vRef.current.count = stage === 1 ? vir.length : 0; vRef.current.rotation.y = t * 0.05; }
    if (grp.current) grp.current.scale.setScalar(1 - 0.08 * (u.uCir.value as number));
    if (tum.current) { tum.current.visible = stage === 2; tum.current.scale.setScalar(Math.max(0.01, u.uCir.value as number)); }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <group ref={grp} position={C}><group position={C.clone().negate()}>
        <mesh geometry={liver.geo} material={mat} />
        <Part p={parts.FMA7202} m={gb} />
        <mesh ref={tum} geometry={tumGeo} position={tumorAt} visible={false}><meshPhysicalMaterial color="#e2d3b8" roughness={0.7} /></mesh>
      </group></group>
      <instancedMesh frustumCulled={false} ref={vRef} args={[virGeo, undefined, vir.length]}><meshPhysicalMaterial color="#7fd36a" emissive="#2e7a1c" emissiveIntensity={0.5} flatShading roughness={0.3} /></instancedMesh>
      {stage >= 1 && <Html position={C.clone().add(new THREE.Vector3(0.06, 0.07, 0.05))} center className="anim-label">{stage === 1 ? '病毒與發炎（示意）' : '肝硬化結節與腫瘤（示意）'}</Html>}
    </group>
  );
}

/* ===================== 腎結石 ===================== */
function StoneScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const parts = useParts('organ', ['FMA7204', 'FMA7205', 'FMA15571', 'FMA15572', 'FMA15900']);
  const rk = parts.FMA7204, ur = parts.FMA15571;
  const C = useMemo(() => new THREE.Vector3(0, 0.98, 0), []);
  const S = 5.2;
  const ref = useMemo(() => {
    const rCl = centerline(ur.geo, 'y', 14, true);     // 由上往下
    const lCl = parts.FMA15572 ? centerline(parts.FMA15572.geo, 'y', 14, true) : rCl;
    const pelvis = rCl[0].clone().lerp(rk.center, 0.45);
    return { rCl: [pelvis, ...rCl], lCl, pelvis, stuck: 0.35 };
  }, [ur, rk, parts]);
  const cut = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), (rk.center.z - C.z + 0.002) * S), [rk, C]);
  const uu = useMemo(() => ({ uPain: { value: 0 }, uStoneY: { value: 0 } }), []);
  const mats = useMemo(() => ({
    kid: tissue({ roughness: 0.3, clearcoat: 0.8 },
      `vec3 o = mix(vec3(0.55, 0.2, 0.17), vec3(0.45, 0.14, 0.13), fbm(vP * 600.0));
       vec3 inner = mix(vec3(0.72, 0.36, 0.32), vec3(0.85, 0.66, 0.55), smoothstep(0.4, 0.7, fbm(vP * 300.0)));
       diffuseColor.rgb = gl_FrontFacing ? o : inner;`),
    ure: tissue({ roughness: 0.35, clearcoat: 0.7 }, 'diffuseColor.rgb = mix(vec3(0.92, 0.78, 0.62), vec3(0.95, 0.2, 0.12), uPain * smoothstep(0.03, 0.0, abs(vP.y - uStoneY)));', uu, 'uniform float uPain, uStoneY;'),
    bla: phys('#e8c8a0', { roughness: 0.35, clearcoat: 0.7, transparent: true, opacity: 0.85 }),
  }), [uu]);
  useEffect(() => { mats.kid.clippingPlanes = [cut]; }, [mats, cut]);
  const rCurve = useMemo(() => new THREE.CatmullRomCurve3(ref.rCl), [ref]);
  const lCurve = useMemo(() => new THREE.CatmullRomCurve3(ref.lCl), [ref]);
  const stone = useRef<THREE.Mesh>(null), urine = useRef<THREE.InstancedMesh>(null);
  const stoneGeo = useMemo(() => lumpGeometry(0.0075, 11, 3), []);
  const d = useMemo(() => new THREE.Object3D(), []);
  const g = useRef(0);
  const N = 36;
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    g.current = ease(g.current, stage >= 1 ? 1 : 0, dt, reduce);
    const stuckAt = rCurve.getPointAt(ref.stuck);
    if (stone.current) {
      stone.current.visible = stage >= 1;
      stone.current.scale.setScalar(Math.max(0.01, g.current) * (stage === 2 ? 0.75 : 1));
      stone.current.position.copy(stage === 2 ? stuckAt : ref.pelvis);
    }
    uu.uPain.value = stage === 2 ? 1 : 0; uu.uStoneY.value = stuckAt.y;
    if (urine.current) {
      for (let i = 0; i < N; i++) {
        const left = i % 2 === 1;
        let s = (t * 0.12 + i / N) % 1;
        if (!left && stage === 2) s = Math.min(s, ref.stuck - 0.04 - rnd(i) * 0.12); // 結石上方尿液堆積
        d.position.copy((left ? lCurve : rCurve).getPointAt(s));
        d.scale.setScalar(1); d.updateMatrix(); urine.current.setMatrixAt(i, d.matrix);
      }
      urine.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <Part p={rk} m={mats.kid} />
      <Part p={parts.FMA7205} m={mats.kid} />
      <Part p={ur} m={mats.ure} />
      <Part p={parts.FMA15572} m={mats.ure} />
      <Part p={parts.FMA15900} m={mats.bla} />
      <mesh ref={stone} geometry={stoneGeo} visible={false}><meshPhysicalMaterial color="#c9a36a" roughness={0.85} /></mesh>
      <instancedMesh frustumCulled={false} ref={urine} args={[undefined, undefined, N]}><sphereGeometry args={[0.0025, 10, 8]} /><meshPhysicalMaterial color="#f5d742" transparent opacity={0.85} roughness={0.1} clearcoat={1} /></instancedMesh>
      {stage >= 1 && <Html position={(stage === 2 ? rCurve.getPointAt(ref.stuck) : ref.pelvis).clone().add(new THREE.Vector3(-0.05, 0.01, 0))} center className="anim-label">{stage === 2 ? '結石卡在輸尿管（示意）' : '腎臟內的結石（示意）'}</Html>}
    </group>
  );
}

/* ===================== 甲狀腺 ===================== */
function ThyroidScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const za = useParts('za-organ', ['ZA-Thyroid-gland']);
  const org = useParts('organ', ['FMA55099', 'FMA7394']);
  const ves = useParts('vessel', ['FMA3941', 'FMA4058', 'FMA4754', 'FMA4762']);
  const thy = za['ZA-Thyroid-gland'];
  const C = thy.center;
  const S = 22;
  const mats = useMemo(() => ({
    thy: tissue({ roughness: 0.35, clearcoat: 0.8, sheen: 0.5 }, 'diffuseColor.rgb = mix(vec3(0.66, 0.24, 0.24), vec3(0.55, 0.18, 0.2), fbm(vP * 1500.0));'),
    cart: phys('#e6e4dc', { roughness: 0.4, clearcoat: 0.6 }),
    art: phys('#c23a33', { roughness: 0.3, clearcoat: 0.8 }),
    vein: phys('#4c5aa6', { roughness: 0.35, clearcoat: 0.6 }),
  }), []);
  const src = useMemo(() => samplePoints(thy.geo, 40, 5), [thy]);
  const hor = useRef<THREE.InstancedMesh>(null), grp = useRef<THREE.Group>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const sz = useRef(1);
  const RATE = [1, 0.35, 2.4], COUNT = [1, 0.35, 1];
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    sz.current = ease(sz.current, stage === 2 ? 1.3 : 1, dt, reduce);
    if (grp.current) grp.current.scale.setScalar(sz.current);
    if (hor.current) {
      src.forEach((p, i) => {
        const on = rnd(i + 9) < COUNT[stage];
        const s = (t * 0.25 * RATE[stage] + rnd(i)) % 1;
        const dir = p.clone().sub(C).normalize();
        d.position.copy(p).addScaledVector(dir, s * 0.025).add(new THREE.Vector3(0, (rnd(i + 2) - 0.5) * s * 0.03, 0));
        d.scale.setScalar(on ? 1 - s * 0.6 : 0.0001); d.updateMatrix(); hor.current!.setMatrixAt(i, d.matrix);
      });
      hor.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <group ref={grp} position={C}><group position={C.clone().negate()}><Part p={thy} m={mats.thy} /></group></group>
      <Part p={org.FMA55099} m={mats.cart} />
      <Part p={org.FMA7394} m={mats.cart} />
      <Part p={ves.FMA3941} m={mats.art} /><Part p={ves.FMA4058} m={mats.art} />
      <Part p={ves.FMA4754} m={mats.vein} /><Part p={ves.FMA4762} m={mats.vein} />
      <instancedMesh frustumCulled={false} ref={hor} args={[undefined, undefined, src.length]}><sphereGeometry args={[0.0009, 10, 8]} /><meshPhysicalMaterial color="#ffb347" emissive="#a35a00" emissiveIntensity={0.6} /></instancedMesh>
      <Html position={C.clone().add(new THREE.Vector3(0.03, 0.022, 0.01))} center className="anim-label">{['甲狀腺', '荷爾蒙不足：機能變慢（示意）', '荷爾蒙過多、甲狀腺腫（示意）'][stage]}</Html>
    </group>
  );
}

const VIEW: Record<Batch3Topic, { cam: [number, number, number]; target?: [number, number, number]; caption: string; bg?: string }> = {
  dementia: { cam: [2.4, 0.8, 3.4], caption: '大腦形狀來自 BodyParts3D 成年男性解剖模型；斑塊、糾結、腦萎縮與血流受影響區域為示意，不是腦部影像。' },
  insomnia: { cam: [2.4, 0.8, 3.4], caption: '大腦形狀來自 BodyParts3D 成年男性解剖模型；光線明暗是比喻，不是腦波或睡眠檢查結果。', bg: '#070d1a' },
  sarcopenia: { cam: [1.4, 0.3, 3.4], caption: '右大腿肌群、股骨與骨盆來自 BodyParts3D 成年男性解剖模型；肌肉變細、油花與收縮的光為示意。' },
  osteoarthritis: { cam: [0.6, 0.3, 3.2], caption: '右膝的股骨、脛骨、腓骨、髕骨與大腿前側肌群來自 BodyParts3D；軟骨、磨損、骨刺與負擔箭頭為示意。' },
  gout: { cam: [1.2, 1.4, 2.6], caption: '右腳骨骼來自 BodyParts3D 成年男性解剖模型；尿酸結晶、紅腫與痛風石為示意，不代表實際大小。' },
  gerd: { cam: [0.5, 0.2, 3.4], caption: '食道與胃形狀來自 BodyParts3D 成年男性解剖模型（胃為剖面）；括約肌環、胃酸與發紅為示意。' },
  'viral-hepatitis': { cam: [0.8, 0.4, 3.6], caption: '肝臟與膽囊形狀來自 BodyParts3D 成年男性解剖模型；病毒、發炎、硬化結節與腫瘤為示意。' },
  'kidney-stones': { cam: [0.4, 0.2, 3.1], caption: '腎臟、輸尿管與膀胱形狀來自 BodyParts3D 成年男性解剖模型（右腎為剖面）；結石、尿液與疼痛發紅為示意。' },
  obesity: { cam: [1.4, 0.6, 5.2], target: [0, -0.15, 0], caption: '皮膚與腹腔器官形狀來自 BodyParts3D 成年男性解剖模型；內臟脂肪與腹部變粗為示意。' },
  'thyroid-disorders': { cam: [1.1, 0.4, 4.2], caption: '甲狀腺來自 Z-Anatomy（CC BY-SA 4.0），甲狀軟骨、氣管與頸部血管來自 BodyParts3D；荷爾蒙顆粒與甲狀腺變大為示意。' },
};

export default function Batch3Anims({ topic }: { topic: Batch3Topic }) {
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
          <color attach="background" args={[v.bg ?? '#101c2b']} />
          <StudioLights />
          <Suspense fallback={null}>
            {topic === 'dementia' && <DementiaScene stage={stage} frozen={frozen} />}
            {topic === 'insomnia' && <InsomniaScene stage={stage} frozen={frozen} />}
            {topic === 'sarcopenia' && <SarcoScene stage={stage} frozen={frozen} />}
            {topic === 'osteoarthritis' && <OAScene stage={stage} frozen={frozen} />}
            {topic === 'gout' && <GoutScene stage={stage} frozen={frozen} />}
            {topic === 'gerd' && <GerdScene stage={stage} frozen={frozen} />}
            {topic === 'viral-hepatitis' && <HepScene stage={stage} frozen={frozen} />}
            {topic === 'kidney-stones' && <StoneScene stage={stage} frozen={frozen} />}
            {topic === 'obesity' && <MetSynScene stage={stage} frozen={frozen} levels={[0.08, 1, 0.6]} showIns={false} />}
            {topic === 'thyroid-disorders' && <ThyroidScene stage={stage} frozen={frozen} />}
          </Suspense>
          <OrbitControls enablePan={false} enableZoom minDistance={1.2} maxDistance={7} enableDamping dampingFactor={0.1} target={v.target ?? [0, 0, 0]} />
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
      <figcaption className="small">衛教示意：{v.caption}可拖曳旋轉、滾輪縮放。診斷需由醫師評估。</figcaption>
    </figure>
  );
}

