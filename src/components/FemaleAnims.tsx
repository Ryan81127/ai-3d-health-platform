import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import StudioLights from '../three/StudioLights';
import { lumpGeometry, rnd, tissue } from '../three/tissue';

/**
 * 女性器官相關疾病的 3D 衛教示意：多囊性卵巢症候群、子宮肌瘤、子宮內膜異位症、子宮頸癌、乳癌。
 * 目前的真實解剖模型（BodyParts3D、Z-Anatomy）沒有女性生殖器官與乳房，
 * 因此這裡的子宮、卵巢、輸卵管、子宮頸與乳房是「程式繪製的示意模型」，形狀與比例經過簡化，不是真實解剖模型。
 * 情境文字對應 diseases.ts 已核對的 MedlinePlus 與國健署內容。
 */
export type FemaleTopic = 'pcos' | 'uterine-fibroids' | 'endometriosis' | 'cervical-cancer' | 'breast-cancer';

const INFO: Record<FemaleTopic, { label: string; note: string }[]> = {
  pcos: [
    { label: '正常排卵（示意）', note: '卵巢每個月讓一個濾泡成熟並排出卵子，卵子經輸卵管前往子宮。（程式繪製的示意模型）' },
    { label: '濾泡停止發育、不排卵（示意）', note: '多囊性卵巢症候群時，卵子可能沒有正常發育或排出；卵巢上常有許多停止發育的濾泡聚集，看起來像小囊泡。也可能有雄性素過高。' },
    { label: '生活調整與治療', note: '維持健康體重、規律活動與健康飲食可減少許多症狀；藥物可能包括荷爾蒙避孕藥、抗雄性素藥物與改善胰島素阻抗的藥物。' },
  ],
  'uterine-fibroids': [
    { label: '子宮的構造（示意）', note: '子宮壁由肌肉層構成，內面是子宮內膜。圖為剖面。（程式繪製的示意模型）' },
    { label: '肌瘤在子宮壁生長（示意）', note: '子宮肌瘤是良性腫瘤，由肌肉細胞與其他組織構成，生長在子宮壁內或周圍，數量與大小不一。白色螺紋團塊為示意。' },
    { label: '依症狀決定治療', note: '沒有症狀可能不需要治療；有症狀時依年齡、肌瘤位置大小與是否想懷孕決定，可能使用藥物或手術。' },
  ],
  endometriosis: [
    { label: '子宮內膜（示意）', note: '子宮內面覆蓋著子宮內膜（深粉紅色）。（子宮、卵巢、輸卵管、膀胱與腸道為程式繪製的示意模型）' },
    { label: '內膜組織長在子宮外（示意）', note: '類似子宮內膜的組織長在其他地方：最常見於卵巢、輸卵管、子宮後方，以及腸道或膀胱。深色病灶的位置與大小為示意。' },
    { label: '止痛、荷爾蒙與手術', note: '目前無法治癒，但可治療症狀：止痛藥、荷爾蒙治療，嚴重疼痛可手術移除病灶；不孕可考慮腹腔鏡手術或試管嬰兒。' },
  ],
  'cervical-cancer': [
    { label: '子宮頸（示意）', note: '子宮頸是子宮下端、連接陰道的部分。（程式繪製的示意模型）' },
    { label: '癌前病變（示意）', note: '子宮頸細胞可能先出現癌前病變，再逐漸發展；疾病發展相當緩慢，定期抹片就能早期發現。病變區域為示意。' },
    { label: '子宮頸抹片檢查（示意）', note: '以擴陰器擴張陰道，輕輕刮取子宮頸剝落的細胞，以顯微鏡觀察是否有癌前病變或癌症。30 歲以上婦女政府補助每年 1 次（建議每 3 年至少 1 次）。' },
  ],
  'breast-cancer': [
    { label: '乳房的乳小葉與乳管（示意）', note: '乳房內有製造乳汁的乳小葉（粉紅色）與通往乳頭的乳管。（程式繪製的示意模型）' },
    { label: '乳房腫瘤（示意）', note: '乳房組織中的細胞不正常增生形成腫瘤。不能只靠自我檢查，要透過專科醫師檢查及乳房攝影篩檢才能早期發現。腫瘤位置為示意。' },
    { label: '乳房 X 光攝影（示意）', note: '檢查時以壓迫板緊壓乳房，以取得清晰影像並減少輻射劑量，因此會有疼痛感。政府補助 40 至 74 歲婦女每 2 年 1 次。' },
  ],
};
const CHIPS: Partial<Record<FemaleTopic, string[][]>> = {
  pcos: [[], ['月經不規則或沒來', '毛髮過多', '青春痘、皮膚油', '體重增加', '不孕'], ['維持健康體重', '規律身體活動', '健康飲食', '荷爾蒙避孕藥', '改善胰島素阻抗的藥物']],
  'uterine-fibroids': [[], ['經血量多或經痛', '下腹脹滿', '頻尿', '下背痛', '不易懷孕'], ['沒有症狀可能不需治療', '藥物減緩生長', '手術', '更年期後可能縮小']],
  endometriosis: [[], ['骨盆疼痛（常在經期）', '不孕', '經痛愈來愈嚴重', '性交疼痛', '經期排便或解尿痛'], ['止痛藥', '荷爾蒙治療', '手術移除病灶', '腹腔鏡或試管嬰兒']],
};
const T_FROZEN = 1.6;
const ease = (cur: number, target: number, dt: number, reduce: boolean, rate = 0.9) => (reduce ? target : cur + (target - cur) * (1 - Math.exp(-dt * rate)));

/** 子宮外形（倒梨形）：由下（子宮頸）往上（子宮底）的旋轉輪廓，單位公尺 */
function uterusProfile(scale = 1) {
  const pts: THREE.Vector2[] = [];
  const H = 0.075 * scale;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, y = t * H;
    let r: number;
    if (t < 0.32) r = 0.011 + 0.004 * Math.sin((t / 0.32) * Math.PI * 0.5);            // 子宮頸
    else r = 0.015 + 0.013 * Math.sin(((t - 0.32) / 0.68) * Math.PI * 0.62);            // 子宮體
    if (t > 0.9) r *= Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) * 0.98 + 0.02 * (1 - (t - 0.9) / 0.1); // 子宮底收圓
    pts.push(new THREE.Vector2(Math.max(r * scale, 0.0005), y - H * 0.45));
  }
  pts.push(new THREE.Vector2(0.0001, H * 0.55));
  return pts;
}
function useUterus() {
  return useMemo(() => {
    const outer = new THREE.LatheGeometry(uterusProfile(1), 64); outer.scale(1, 1, 0.68); outer.computeVertexNormals();
    // 子宮腔（三角形扁腔）與子宮頸管
    const cav = new THREE.LatheGeometry(uterusProfile(1).map((p, i, a) => new THREE.Vector2(p.x * (i / a.length > 0.32 ? 0.42 : 0.18), p.y * 0.86 + 0.004)), 48);
    cav.scale(1, 1, 0.25); cav.computeVertexNormals();
    return { outer, cav };
  }, []);
}
function tubeCurve(side: number) {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.024, 0.032, 0), new THREE.Vector3(side * 0.045, 0.038, 0.004), new THREE.Vector3(side * 0.068, 0.03, 0.008),
    new THREE.Vector3(side * 0.08, 0.012, 0.006), new THREE.Vector3(side * 0.074, -0.002, 0.012),
  ]);
}
const OVARY = (side: number) => new THREE.Vector3(side * 0.064, 0.004, -0.004);

function useMats(u: Record<string, THREE.IUniform>) {
  return useMemo(() => ({
    myo: tissue({ roughness: 0.38, clearcoat: 0.7, sheen: 0.6, sheenColor: new THREE.Color('#ffc6c6'), side: THREE.DoubleSide },
      `vec3 outside = mix(vec3(0.88, 0.56, 0.58), vec3(0.8, 0.46, 0.5), fbm(vP * 600.0));
       vec3 cut = vec3(0.8, 0.42, 0.45) * (0.85 + 0.2 * sin(length(vP.xz) * 900.0 + fbm(vP * 300.0) * 3.0));
       diffuseColor.rgb = gl_FrontFacing ? outside : cut;`),
    endo: tissue({ roughness: 0.3, clearcoat: 0.9, side: THREE.DoubleSide }, 'diffuseColor.rgb = mix(vec3(0.75, 0.16, 0.24), vec3(0.6, 0.1, 0.18), fbm(vP * 1200.0));'),
    tube: tissue({ roughness: 0.4, clearcoat: 0.6 }, 'diffuseColor.rgb = mix(vec3(0.9, 0.62, 0.62), vec3(0.82, 0.52, 0.55), fbm(vP * 900.0));'),
    ovary: tissue({ roughness: 0.5, clearcoat: 0.4 }, 'diffuseColor.rgb = mix(vec3(0.93, 0.8, 0.74), vec3(0.85, 0.7, 0.66), fbm(vP * 1500.0));'),
    cervix: tissue({ roughness: 0.3, clearcoat: 0.8 },
      `vec3 base = mix(vec3(0.92, 0.62, 0.64), vec3(0.85, 0.52, 0.56), fbm(vP * 1500.0));
       // 子宮頸外口圓盤的區域座標（xy 平面）
       float d = length(vec2(vP.x - 0.003, vP.y - 0.002)) / 0.0055 + (fbm(vP * 2500.0) - 0.5) * 0.6;
       float hole = smoothstep(0.0022, 0.0016, length(vP.xy));
       float patchK = uLes * (1.0 - smoothstep(0.7, 1.0, d)) * (1.0 - hole);
       base = mix(base, vec3(0.35, 0.1, 0.14), hole);
       diffuseColor.rgb = mix(base, vec3(0.95, 0.9, 0.86) * (0.8 + 0.25 * fbm(vP * 4000.0)), patchK);`, u, 'uniform float uLes, uCervY;'),
  }), [u]);
}

/* ===================== 子宮、卵巢、輸卵管（多囊、肌瘤、內膜異位、子宮頸） ===================== */
function PelvicScene({ topic, stage, frozen }: { topic: Exclude<FemaleTopic, 'breast-cancer'>; stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const { outer, cav } = useUterus();
  const u = useMemo(() => ({ uLes: { value: 0 }, uCervY: { value: -0.034 } }), []);
  const mats = useMats(u);
  const cut = topic !== 'pcos';
  const S = topic === 'cervical-cancer' ? 26 : 18;
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.0005 * S), [S]);
  useEffect(() => { for (const m of [mats.myo, mats.endo]) { m.clippingPlanes = cut ? [plane] : []; m.needsUpdate = true; } }, [mats, plane, cut]);
  const tubes = useMemo(() => [-1, 1].map((s) => new THREE.TubeGeometry(tubeCurve(s), 40, 0.0028, 12, false)), []);
  // 濾泡：卵巢周邊許多小濾泡（多囊）
  const fol = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2, b = (rnd(i) - 0.5) * 1.2;
    return new THREE.Vector3(Math.cos(a) * 0.0145 * Math.cos(b), Math.sin(b) * 0.009, Math.sin(a) * 0.009 * Math.cos(b));
  }), []);
  const fRef = useRef<THREE.InstancedMesh>(null), dom = useRef<THREE.Mesh>(null), egg = useRef<THREE.Mesh>(null);
  const fibRef = useRef<THREE.InstancedMesh>(null), lesRef = useRef<THREE.InstancedMesh>(null), brush = useRef<THREE.Group>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const fibroids = useMemo(() => [
    { p: new THREE.Vector3(0.016, 0.02, 0.004), s: 1.2 }, { p: new THREE.Vector3(-0.012, 0.03, 0.0), s: 0.9 },
    { p: new THREE.Vector3(0.026, 0.006, -0.002), s: 0.8 }, { p: new THREE.Vector3(-0.004, 0.012, 0.0), s: 0.6 },
  ], []);
  const fibGeo = useMemo(() => lumpGeometry(0.008, 13, 3), []);
  const lesions = useMemo(() => [
    OVARY(1).add(new THREE.Vector3(0.004, 0.006, 0.006)), OVARY(-1).add(new THREE.Vector3(-0.006, -0.004, 0.006)),
    new THREE.Vector3(0.05, 0.036, 0.005), new THREE.Vector3(-0.055, 0.034, 0.006),
    new THREE.Vector3(0.006, 0.0, -0.022), new THREE.Vector3(-0.01, 0.018, -0.02), new THREE.Vector3(0.012, -0.014, -0.019),
    new THREE.Vector3(0.004, -0.006, 0.042), new THREE.Vector3(-0.008, -0.03, -0.045),
  ], []);
  const lesGeo = useMemo(() => lumpGeometry(0.0028, 3, 2), []);
  const eggCurve = useMemo(() => new THREE.CatmullRomCurve3([OVARY(1).add(new THREE.Vector3(0.008, 0.006, 0.006)), ...tubeCurve(1).getPoints(8).reverse()]), []);
  const k = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, stage >= 1 ? 1 : 0, dt, reduce);
    // 多囊：周邊小濾泡；正常：一個優勢濾泡成熟後排卵
    if (fRef.current) {
      fol.forEach((p, i) => { d.position.copy(OVARY(i % 2 ? 1 : -1)).add(p); d.scale.setScalar(topic === 'pcos' && stage >= 1 ? 1 : 0.45); d.updateMatrix(); fRef.current!.setMatrixAt(i, d.matrix); });
      fRef.current.instanceMatrix.needsUpdate = true;
    }
    const cyc = (t % 8) / 8;
    if (dom.current) { const on = topic === 'pcos' && stage === 0 && cyc < 0.5; dom.current.visible = on; dom.current.scale.setScalar(0.4 + cyc * 1.4); }
    if (egg.current) { const on = topic === 'pcos' && stage === 0 && cyc >= 0.5; egg.current.visible = on; if (on) egg.current.position.copy(eggCurve.getPointAt((cyc - 0.5) / 0.5)); }
    if (fibRef.current) {
      fibroids.forEach((f, i) => { d.position.copy(f.p); d.scale.setScalar(Math.max(0.0001, k.current * f.s)); d.rotation.set(i, i * 2, 0); d.updateMatrix(); fibRef.current!.setMatrixAt(i, d.matrix); });
      fibRef.current.count = topic === 'uterine-fibroids' ? fibroids.length : 0; fibRef.current.instanceMatrix.needsUpdate = true;
    }
    if (lesRef.current) {
      lesions.forEach((p, i) => { d.position.copy(p); d.scale.setScalar(Math.max(0.0001, k.current * (0.8 + 0.4 * rnd(i)) * (1 + 0.12 * Math.sin(t * 2 + i)))); d.updateMatrix(); lesRef.current!.setMatrixAt(i, d.matrix); });
      lesRef.current.count = topic === 'endometriosis' ? lesions.length : 0; lesRef.current.instanceMatrix.needsUpdate = true;
    }
    u.uLes.value = topic === 'cervical-cancer' ? k.current : 0;
    if (brush.current) { brush.current.visible = topic === 'cervical-cancer' && stage === 2; brush.current.rotation.y = t * 2; }
  });
  const bigUterus = topic === 'uterine-fibroids' ? 1 + 0.12 * k.current : 1;
  const label = {
    pcos: ['卵巢：濾泡成熟、排卵（示意）', '卵巢：許多停止發育的濾泡（示意）', '生活調整與治療'][stage],
    'uterine-fibroids': ['子宮剖面（示意）', '子宮肌瘤（示意）', '依症狀決定治療'][stage],
    endometriosis: ['子宮內膜（示意）', '子宮外的內膜異位病灶（示意）', '止痛、荷爾蒙與手術'][stage],
    'cervical-cancer': ['子宮頸（示意）', '子宮頸癌前病變（示意）', '刮取子宮頸細胞（示意）'][stage],
  }[topic];
  const focus = topic === 'cervical-cancer' ? new THREE.Vector3(0, -0.03, 0) : new THREE.Vector3(0, 0.008, 0);
  return (
    <group scale={S} position={focus.clone().multiplyScalar(-S)}>
      <group scale={[bigUterus, bigUterus, bigUterus]}>
        <mesh geometry={outer} material={mats.myo} />
        <mesh geometry={cav} material={mats.endo} />
      </group>
      {topic === 'cervical-cancer' && <pointLight position={[0.02, -0.09, 0.05]} intensity={1.6} distance={0} decay={0} />}
      {/* 子宮頸外口（示意） */}
      <mesh position={[0, -0.0337, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.68, 1]} material={mats.cervix}><circleGeometry args={[0.0115, 40]} /></mesh>
      {tubes.map((g, i) => <mesh key={i} geometry={g} material={mats.tube} />)}
      {[-1, 1].map((s) => (
        <mesh key={s} position={OVARY(s)} scale={[0.016, 0.01, 0.0105]} material={mats.ovary}><sphereGeometry args={[1, 32, 20]} /></mesh>
      ))}
      <instancedMesh frustumCulled={false} ref={fRef} args={[undefined, undefined, fol.length]}><sphereGeometry args={[0.003, 14, 10]} /><meshPhysicalMaterial color="#fff6e0" transparent opacity={0.9} roughness={0.15} clearcoat={1} /></instancedMesh>
      <mesh ref={dom} position={OVARY(1).add(new THREE.Vector3(0.008, 0.006, 0.006))} visible={false}><sphereGeometry args={[0.004, 20, 14]} /><meshPhysicalMaterial color="#fff3d6" transparent opacity={0.8} roughness={0.1} clearcoat={1} /></mesh>
      <mesh ref={egg} visible={false}><sphereGeometry args={[0.0018, 14, 10]} /><meshPhysicalMaterial color="#fff8e6" emissive="#a07a20" emissiveIntensity={0.5} /></mesh>
      <instancedMesh frustumCulled={false} ref={fibRef} args={[fibGeo, undefined, fibroids.length]}><meshPhysicalMaterial color="#efe6dc" roughness={0.55} clearcoat={0.4} /></instancedMesh>
      <instancedMesh frustumCulled={false} ref={lesRef} args={[lesGeo, undefined, lesions.length]}><meshPhysicalMaterial color="#5a1420" roughness={0.6} emissive="#3a0610" emissiveIntensity={0.4} /></instancedMesh>
      {topic === 'endometriosis' && <>
        <mesh position={[0, -0.012, 0.042]} scale={[0.017, 0.012, 0.011]}><sphereGeometry args={[1, 28, 20]} /><meshPhysicalMaterial color="#e9c9a6" roughness={0.3} clearcoat={0.8} transparent opacity={0.45} depthWrite={false} /></mesh>
        <mesh position={[-0.006, -0.01, -0.05]}><cylinderGeometry args={[0.012, 0.014, 0.08, 24]} /><meshPhysicalMaterial color="#d99a8a" roughness={0.4} clearcoat={0.6} transparent opacity={0.6} /></mesh>
      </>}
      <group ref={brush} position={[0.002, -0.036, 0.002]} visible={false}>
        <mesh position={[0, -0.03, 0]}><cylinderGeometry args={[0.0015, 0.0015, 0.05, 10]} /><meshPhysicalMaterial color="#cfd8e0" roughness={0.3} /></mesh>
        <mesh position={[0, -0.003, 0]}><cylinderGeometry args={[0.0035, 0.0035, 0.007, 16]} /><meshPhysicalMaterial color="#8fb7e8" roughness={0.9} /></mesh>
      </group>
      <Html position={topic === 'cervical-cancer' ? [0.025, -0.03, 0.01] : [0.05, 0.05, 0.01]} center className="anim-label">{label}</Html>
    </group>
  );
}

/* ===================== 乳房（乳癌） ===================== */
function BreastScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const S = 14;
  const R = 0.065;
  const k = useRef(0), press = useRef(0);
  const breastGeo = useMemo(() => { const g = new THREE.SphereGeometry(R, 64, 40, 0, Math.PI * 2, 0, Math.PI / 2); g.rotateX(Math.PI / 2); g.scale(1, 1, 0.75); return g; }, []);
  const u = useMemo(() => ({ uPress: { value: 0 } }), []);
  const skin = useMemo(() => tissue({ roughness: 0.5, clearcoat: 0.3, sheen: 0.6, sheenColor: new THREE.Color('#ffd9c4'), transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide },
    'diffuseColor.rgb = vec3(0.92, 0.74, 0.62) * (0.92 + 0.12 * fbm(vP * 900.0));', u, 'uniform float uPress;', '',
    'transformed.y *= 1.0 - 0.45 * uPress; transformed.x *= 1.0 + 0.2 * uPress;'), [u]);
  // 乳管：從乳頭往外放射的分支；乳小葉：末端的小葡萄串
  const ducts = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const end = new THREE.Vector3(Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75, 0.008 + rnd(i) * 0.01);
    const mid = new THREE.Vector3(Math.cos(a + 0.2) * R * 0.38, Math.sin(a + 0.2) * R * 0.38, R * 0.42);
    return { curve: new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, R * 0.74), mid, end]), end };
  }), []);
  const ductGeos = useMemo(() => ducts.map((x) => new THREE.TubeGeometry(x.curve, 24, 0.0012, 8, false)), [ducts]);
  const lob = useMemo(() => ducts.flatMap((x, i) => Array.from({ length: 8 }, (_, j) => x.end.clone().add(new THREE.Vector3((rnd(i * 9 + j) - 0.5) * 0.012, (rnd(i * 9 + j + 3) - 0.5) * 0.012, (rnd(i * 9 + j + 5) - 0.5) * 0.008)))), [ducts]);
  const lRef = useRef<THREE.InstancedMesh>(null), tum = useRef<THREE.Mesh>(null), plates = useRef<THREE.Group>(null), inner = useRef<THREE.Group>(null);
  useEffect(() => {
    const m = lRef.current; if (!m) return;
    const d = new THREE.Object3D();
    lob.forEach((p, i) => { d.position.copy(p); d.scale.setScalar(0.7 + rnd(i) * 0.6); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [lob]);
  const tumGeo = useMemo(() => lumpGeometry(0.009, 8, 4), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, stage >= 1 ? 1 : 0, dt, reduce);
    press.current = ease(press.current, stage === 2 ? 1 : 0, dt, reduce, 1.2);
    u.uPress.value = press.current;
    if (tum.current) { tum.current.visible = k.current > 0.03; tum.current.scale.setScalar(k.current); (tum.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = stage === 2 ? 0.4 + 0.3 * Math.sin(t * 3) : 0; }
    if (plates.current) { plates.current.visible = stage === 2; plates.current.children[0].position.y = R * (1.05 - 0.45 * press.current); plates.current.children[1].position.y = -R * (1.05 - 0.45 * press.current); }
    if (inner.current) inner.current.scale.set(1 + 0.2 * press.current, 1 - 0.45 * press.current, 1);
  });
  return (
    <group scale={S}>
      <mesh position={[0, 0, -0.004]}><boxGeometry args={[0.2, 0.2, 0.008]} /><meshPhysicalMaterial color="#b4504a" roughness={0.6} /></mesh>
      <mesh geometry={breastGeo} material={skin} />
      <group ref={inner}>
        {ductGeos.map((g, i) => <mesh key={i} geometry={g}><meshPhysicalMaterial color="#f2d3c6" roughness={0.4} clearcoat={0.5} /></mesh>)}
        <instancedMesh frustumCulled={false} ref={lRef} args={[undefined, undefined, lob.length]}><sphereGeometry args={[0.0028, 12, 8]} /><meshPhysicalMaterial color="#e88f9c" roughness={0.4} clearcoat={0.5} /></instancedMesh>
        <mesh ref={tum} geometry={tumGeo} position={[R * 0.4, R * 0.38, 0.02]} visible={false}><meshPhysicalMaterial color="#d8c8b8" roughness={0.7} emissive="#ffb070" emissiveIntensity={0} /></mesh>
      </group>
      <mesh position={[0, 0, R * 0.76]}><sphereGeometry args={[0.006, 20, 14]} /><meshPhysicalMaterial color="#b9706a" roughness={0.5} /></mesh>
      <group ref={plates} visible={false}>
        <mesh><boxGeometry args={[0.2, 0.004, 0.16]} /><meshPhysicalMaterial color="#cfe8ff" transparent opacity={0.35} roughness={0.05} clearcoat={1} depthWrite={false} /></mesh>
        <mesh><boxGeometry args={[0.2, 0.004, 0.16]} /><meshPhysicalMaterial color="#9aa6b2" roughness={0.3} metalness={0.4} /></mesh>
      </group>
      {stage >= 1 && <Html position={[R * 0.4 + 0.03, R * 0.38 + 0.02, 0.03]} center className="anim-label">{stage === 2 ? '乳房攝影找到可疑腫塊（示意）' : '腫瘤（示意）'}</Html>}
    </group>
  );
}

const VIEW: Record<FemaleTopic, { cam: [number, number, number] }> = {
  pcos: { cam: [0.6, 0.6, 4.4] },
  'uterine-fibroids': { cam: [0.3, 0.3, 3.0] },
  endometriosis: { cam: [1.6, 0.8, 3.0] },
  'cervical-cancer': { cam: [0.8, -1.3, 1.6] },
  'breast-cancer': { cam: [1.9, 0.6, 2.2] },
};

export default function FemaleAnims({ topic }: { topic: FemaleTopic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { setStage(0); }, [topic]);
  const info = INFO[topic][stage];
  const chips = CHIPS[topic]?.[stage] ?? [];
  return (
    <figure className="vessel">
      <div className="tear-canvas tall" role="img" aria-label={`${info.label}的衛教示意動畫`}>
        <Canvas camera={{ position: VIEW[topic].cam, fov: 34, near: 0.02, far: 40 }} dpr={[1, 2]} gl={{ antialias: true, localClippingEnabled: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <color attach="background" args={['#101c2b']} />
          <StudioLights />
          <Suspense fallback={null}>
            {topic === 'breast-cancer' ? <BreastScene stage={stage} frozen={frozen} /> : <PelvicScene topic={topic} stage={stage} frozen={frozen} />}
          </Suspense>
          <OrbitControls enablePan={false} enableZoom minDistance={1.2} maxDistance={7} enableDamping dampingFactor={0.1} />
        </Canvas>
      </div>
      <div className="seg" role="group" aria-label="情境">
        {INFO[topic].map((x, i) => <button key={x.label} className={stage === i ? 'on' : ''} aria-pressed={stage === i} onClick={() => setStage(i)}>{x.label}</button>)}
      </div>
      <div className="tear-controls">
        <div className="tear-readout"><b>{info.label}</b></div>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      {chips.length > 0 && <ul className="anim-chips">{chips.map((c) => <li key={c} className="on">{c}</li>)}</ul>}
      <p className="small">{info.note}</p>
      <figcaption className="small">衛教示意：目前的真實解剖模型為成年男性，沒有女性器官；這裡是<b>程式繪製的示意模型</b>，形狀、比例與位置經過簡化，不是真實解剖模型，也不是個人影像或檢查結果。可拖曳旋轉、滾輪縮放。診斷需由醫師評估。</figcaption>
    </figure>
  );
}
