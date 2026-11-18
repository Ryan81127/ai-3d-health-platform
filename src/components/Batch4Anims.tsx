import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { centerline, useParts } from '../three/partGeometry';
import { PARTS } from '../three/anatomy';
import StudioLights from '../three/StudioLights';
import { Part, lumpGeometry, phys, rnd, samplePoints, tissue } from '../three/tissue';
import { brainMat, useBrain } from './Batch3Anims';

/**
 * 第四批常見疾病的 3D 衛教示意：焦慮症、恐慌症、自律神經失調、肺炎、泌尿道感染、尿失禁、大腸激躁症、膽結石、缺鐵性貧血、下背痛與椎間盤突出。
 * 器官、骨骼、肌肉與神經形狀來自 BodyParts3D／Z-Anatomy 真實模型；細菌、結石、液體、光線與膽管為示意效果。
 * 情境文字對應 diseases.ts 已核對的 MedlinePlus 與 NHLBI 內容。
 */
export type Batch4Topic = 'anxiety' | 'panic-disorder' | 'autonomic-dysfunction' | 'pneumonia' | 'uti' | 'urinary-incontinence' | 'ibs' | 'gallstones' | 'iron-deficiency-anemia' | 'low-back-pain';

const INFO: Record<Batch4Topic, { label: string; note: string }[]> = {
  anxiety: [
    { label: '面對壓力的正常焦慮', note: '面對壓力時的焦慮是正常反應，有時能幫助專注與應對。圖中以腦部光線比喻緊張程度（示意，不是腦部影像）。' },
    { label: '焦慮持續不退（示意）', note: '焦慮症的焦慮持續不退、可能隨時間惡化，並影響工作、課業與人際關係；常同時有難以控制的想法、身體症狀與行為改變。' },
    { label: '治療與壓力管理', note: '主要治療是心理治療（如認知行為治療）、藥物，或兩者合併；支持團體與壓力管理技巧也可能有幫助。' },
  ],
  'panic-disorder': [
    { label: '平靜時的心跳與呼吸', note: '休息時心跳與呼吸平穩。（心臟與肺形狀來自解剖模型，跳動與呼吸速度為示意）' },
    { label: '恐慌發作（示意）', note: '在沒有真正危險時突然強烈恐懼，心跳很快很重、呼吸困難、胸痛、頭暈，感覺像心臟病發作；可持續幾分鐘到超過一小時。第一次出現胸痛請先就醫排除心臟疾病。' },
    { label: '治療後恢復平穩', note: '治療可能包括認知行為治療等心理治療，以及抗憂鬱藥或抗焦慮藥；避免飲酒、減少咖啡因也有幫助。' },
  ],
  'autonomic-dysfunction': [
    { label: '自律神經的調節（示意）', note: '自律神經系統控制心跳、血管擴張與收縮等非自主動作。圖中神經上的光點表示訊號傳遞（示意）。' },
    { label: '功能異常（示意）', note: '自律神經系統出問題時，可能造成血壓問題、心臟問題、呼吸與吞嚥困難等。台灣常說的「自律神經失調」不是單一診斷名稱，需要醫師找出原因。' },
    { label: '找出原因、改善症狀', note: '部分自律神經系統疾病在治療原本的疾病後會改善；無法治癒時，治療目標是改善症狀。規律作息與壓力管理也有幫助。' },
  ],
  pneumonia: [
    { label: '正常的肺', note: '空氣經氣管、支氣管進入肺泡進行氣體交換。（肺葉與支氣管來自解剖模型）' },
    { label: '肺炎：肺泡充滿液體或膿（示意）', note: '肺炎是肺部感染，使肺泡充滿液體或膿；細菌最常見。圖中右下葉的實質化區塊與病菌為示意。常見症狀：發燒、畏寒、咳嗽有痰、呼吸急促、胸痛。' },
    { label: '預防：疫苗、洗手、不吸菸', note: '疫苗可以預防肺炎鏈球菌或流感病毒造成的肺炎；勤洗手、不吸菸與健康的生活方式也可能有幫助。' },
  ],
  uti: [
    { label: '泌尿系統', note: '泌尿系統包括兩個腎臟、兩條輸尿管、膀胱與尿道，負責排除廢物與多餘水分。' },
    { label: '膀胱感染（示意）', note: '細菌（綠色，示意）進入泌尿道造成感染：解尿疼痛或灼熱、頻尿、下腹壓迫感、尿液混濁帶紅。女性約為男性的 4 倍。' },
    { label: '感染往上到腎臟的警訊（示意）', note: '發燒、畏寒、肋骨下方的背部或側腹疼痛時，可能是感染往上影響腎臟，請儘速就醫。泌尿道感染以抗生素治療。' },
  ],
  'urinary-incontinence': [
    { label: '膀胱與骨盆底肌', note: '骨盆底肌（粉紅色）在下方支撐膀胱與尿道，幫助憋住尿液。（骨盆、膀胱與骨盆底肌來自解剖模型）' },
    { label: '腹壓增加時漏尿（示意）', note: '應力性尿失禁：咳嗽、打噴嚏、大笑、提重物時漏尿，原因包括骨盆底肌無力。向下的箭頭表示腹壓（示意）。' },
    { label: '凱格爾運動（示意）', note: '凱格爾運動是收縮與放鬆控制排尿的肌肉；強壯的骨盆底肌比無力的肌肉更能憋住尿液。也可搭配膀胱訓練與生活調整。' },
  ],
  ibs: [
    { label: '大腸的正常蠕動', note: '大腸以規律的蠕動推送內容物。（腸道形狀來自解剖模型，蠕動為示意）' },
    { label: '腹痛、脹氣、排便改變（示意）', note: '大腸激躁症可能造成腹部絞痛、脹氣與便秘、腹瀉或兩者交替；雖然不舒服，但不會傷害腸道。不規則的收縮與氣泡為示意。' },
    { label: '飲食與壓力管理', note: '多數人可透過飲食調整、壓力管理、益生菌與藥物控制症狀。出現血便、體重下降等警訊時請就醫。' },
  ],
  gallstones: [
    { label: '膽囊與膽汁', note: '膽囊位於肝臟下方，儲存消化脂肪用的膽汁，進食時經膽管送到小腸。（肝、膽囊與十二指腸來自解剖模型，膽管為示意）' },
    { label: '膽結石形成（示意）', note: '膽汁中的物質變硬就會形成膽結石。沒有症狀時通常不需要治療。結石數量與大小為示意。' },
    { label: '結石阻塞膽管（示意）', note: '結石阻塞膽汁流動時最容易造成問題：進食後噁心、嘔吐，或腹部、背部、右側腋下附近疼痛。最常見的治療是切除膽囊。' },
  ],
  'iron-deficiency-anemia': [
    { label: '正常的紅血球', note: '紅血球中的血紅素是含鐵的蛋白質，讓血液呈紅色，並把氧氣從肺部送到全身。（血管段與紅血球為示意）' },
    { label: '缺鐵：紅血球變少、攜氧變差（示意）', note: '鐵不足時身體無法製造足夠的健康紅血球；可能疲倦、頭暈、手腳冰冷、皮膚蒼白、呼吸急促。紅血球變少變淡為示意。' },
    { label: '找出原因與補鐵', note: '缺鐵性貧血通常以鐵補充劑治療，但應先找出缺鐵原因，例如腸胃道出血或經血量多。含鐵食物：瘦肉、海鮮、豆類、深綠色蔬菜。' },
  ],
  'low-back-pain': [
    { label: '腰椎與椎間盤', note: '椎骨之間的椎間盤（藍色）有膠狀中心，負責緩衝並固定椎骨。（腰椎、薦骨、椎間盤、馬尾與坐骨神經來自解剖模型）' },
    { label: '椎間盤突出壓迫神經（示意）', note: '椎間盤破裂時，中央的膠狀物質流出刺激附近神經，可能造成坐骨神經痛或背痛。突出位置與神經發紅為示意。' },
    { label: '保持活動與復健', note: '大多數背痛會自行好轉；臥床超過 1–2 天可能讓背痛更糟。治療可能包括冷熱敷、運動、物理治療、藥物，有時需要手術。' },
  ],
};
const CHIPS: Partial<Record<Batch4Topic, string[][]>> = {
  anxiety: [[], ['心跳快或重', '不明原因的疼痛', '頭暈', '呼吸急促', '避開日常活動'], ['心理治療（認知行為治療）', '藥物', '支持團體', '壓力管理', '減少咖啡因']],
  'panic-disorder': [[], ['心跳很快很重', '流汗或發冷', '發抖', '呼吸困難、窒息感', '胸痛', '頭暈'], ['心理治療（認知行為治療）', '抗憂鬱藥或抗焦慮藥', '避免飲酒', '減少咖啡因']],
  'autonomic-dysfunction': [[], ['血壓問題', '心臟問題', '呼吸與吞嚥困難'], ['治療原本的疾病', '改善症狀', '規律作息與睡眠', '壓力管理']],
  'low-back-pain': [[], [], ['保持活動，不要長期臥床', '冷熱敷', '運動與物理治療', '藥物（依醫囑）', '搬重物用腿出力']],
};
const T_FROZEN = 1.6;
const ease = (cur: number, target: number, dt: number, reduce: boolean, rate = 0.9) => (reduce ? target : cur + (target - cur) * (1 - Math.exp(-dt * rate)));

/* ===================== 焦慮症（大腦） ===================== */
function AnxietyScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const { list, C } = useBrain();
  const S = 14;
  const u = useMemo(() => ({ uAct: { value: 0.5 }, uT: { value: 0 }, uAtro: { value: 0 }, uIsch: { value: 0 }, uNight: { value: 0 } }), []);
  const mat = useMemo(() => brainMat(u), [u]);
  const grp = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const speed = [1, 3.2, 1][stage];
    u.uT.value = t * speed;
    u.uAct.value = ease(u.uAct.value as number, [0.5, 1.3, 0.45][stage], dt, reduce);
    if (grp.current) grp.current.position.x = stage === 1 && !(frozen || reduce) ? Math.sin(t * 40) * 0.0004 : 0; // 緊繃的微顫（示意）
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <group ref={grp}>{list.map((p) => <mesh key={p.id} geometry={p.geo} material={mat} />)}</group>
    </group>
  );
}

/* ===================== 恐慌症（心臟與肺） ===================== */
const LUNGS = ['FMA7333', 'FMA7337', 'FMA7370', 'FMA7371', 'FMA7383'];
function PanicScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', ['FMA7274', 'FMA7394', 'FMA7409', ...LUNGS]);
  const heart = org.FMA7274;
  const C = heart.center.clone().add(new THREE.Vector3(0, 0.04, 0));
  const S = 6;
  const gu = useMemo(() => ({ uG: { value: 0 } }), []);
  const mats = useMemo(() => ({
    heart: tissue({ roughness: 0.42, clearcoat: 0.6, sheen: 0.7, sheenColor: new THREE.Color('#ff8f80') }, 'diffuseColor.rgb = vec3(0.64, 0.19, 0.17) * (0.82 + 0.3 * fbm(vP * 260.0));', gu, 'uniform float uG;', 'totalEmissiveRadiance += vec3(1.0, 0.2, 0.1) * uG;'),
    lung: tissue({ transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color('#ffd0d0') }, 'diffuseColor.rgb = mix(vec3(0.93, 0.6, 0.6), vec3(0.75, 0.42, 0.45), fbm(vP * 220.0));'),
    air: tissue({ roughness: 0.35, clearcoat: 0.8 }, 'diffuseColor.rgb = vec3(0.92, 0.76, 0.72) * (0.85 + 0.2 * fbm(vP * 400.0));'),
  }), [gu]);
  const hg = useRef<THREE.Group>(null), lg = useRef<THREE.Group>(null);
  const hr = useRef(1), br = useRef(1);
  const ph = useRef({ h: 0, b: 0 });
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    hr.current = ease(hr.current, [1, 2.3, 1.05][stage], dt, reduce, 1.5);
    br.current = ease(br.current, [1, 2.6, 1][stage], dt, reduce, 1.5);
    if (!(frozen || reduce)) { ph.current.h += dt * 1.15 * hr.current; ph.current.b += dt * 0.25 * br.current; } else { ph.current.h = t; ph.current.b = t * 0.2; }
    const beat = Math.pow(Math.max(0, Math.sin(ph.current.h * Math.PI * 2)), 6);
    if (hg.current) hg.current.scale.setScalar(1 - 0.06 * beat);
    const breath = 0.5 - 0.5 * Math.cos(ph.current.b * Math.PI * 2);
    if (lg.current) lg.current.scale.setScalar(1 + 0.035 * breath);
    gu.uG.value = stage === 1 ? 0.25 * (0.5 + 0.5 * beat) : 0;
  });
  const center = heart.center;
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <group ref={lg} position={center}><group position={center.clone().negate()}>{LUNGS.map((id) => <Part key={id} p={org[id]} m={mats.lung} />)}</group></group>
      <Part p={org.FMA7394} m={mats.air} /><Part p={org.FMA7409} m={mats.air} />
      <group ref={hg} position={center}><group position={center.clone().negate()}><Part p={heart} m={mats.heart} /></group></group>
    </group>
  );
}

/* ===================== 自律神經失調 ===================== */
const ANS_NERVES = PARTS.filter((p) => p.layer === 'nerve' && p.src === 'za' && p.c[1] > 0.95 && p.c[1] < 1.5 && Math.abs(p.c[0]) < 0.16 && p.r < 0.12).map((p) => p.id).slice(0, 80);
const ANS_VES = ['FMA3736', 'FMA3768', 'FMA3784', 'FMA4720', 'FMA3941', 'FMA4058'];
function AnsScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const nerves = useParts('za-nerve', [...ANS_NERVES, 'ZA-White-matter-of-spinal-cord']);
  const org = useParts('organ', ['FMA7274']);
  const ves = useParts('vessel', ANS_VES);
  const C = org.FMA7274.center.clone().add(new THREE.Vector3(0, 0.03, -0.02));
  const S = 5.5;
  const u = useMemo(() => ({ uT: { value: 0 }, uIrr: { value: 0 } }), []);
  const mats = useMemo(() => ({
    nerve: tissue({ roughness: 0.45, clearcoat: 0.4 }, 'diffuseColor.rgb = vec3(0.96, 0.86, 0.5) * (0.85 + 0.2 * fbm(vP * 500.0));', u, 'uniform float uT, uIrr;',
      `float band = exp(-pow((fract(vP.y * 6.0 - uT * 0.6) - 0.5) / 0.06, 2.0));
       float chaos = smoothstep(0.75, 0.95, vnoise(vP * 300.0 + vec3(0.0, uT * 4.0, uT * 2.0)));
       totalEmissiveRadiance += vec3(1.0, 0.85, 0.35) * mix(band * 0.9, chaos * 1.2, uIrr);`),
    heart: tissue({ roughness: 0.42, clearcoat: 0.6, sheen: 0.7, sheenColor: new THREE.Color('#ff8f80') }, 'diffuseColor.rgb = vec3(0.64, 0.19, 0.17) * (0.82 + 0.3 * fbm(vP * 260.0));'),
    art: tissue({ roughness: 0.3, clearcoat: 0.8 }, 'diffuseColor.rgb = vec3(0.76, 0.22, 0.2);', u, 'uniform float uT, uIrr;',
      'totalEmissiveRadiance += vec3(1.0, 0.25, 0.1) * uIrr * 0.6 * max(0.0, sin(uT * 3.7) * sin(uT * 1.3));'),
  }), [u]);
  const hg = useRef<THREE.Group>(null);
  const ph = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uT.value = t; u.uIrr.value = ease(u.uIrr.value as number, stage === 1 ? 1 : 0, dt, reduce);
    const rate = stage === 1 ? 1.2 + 0.8 * Math.sin(t * 0.7) : 1.1;
    ph.current = frozen || reduce ? t : ph.current + dt * rate;
    const beat = Math.pow(Math.max(0, Math.sin(ph.current * Math.PI * 2)), 6);
    if (hg.current) hg.current.scale.setScalar(1 - 0.05 * beat);
  });
  const hc = org.FMA7274.center;
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {Object.values(nerves).map((p) => <Part key={p.id} p={p} m={mats.nerve} />)}
      {ANS_VES.map((id) => <Part key={id} p={ves[id]} m={mats.art} />)}
      <group ref={hg} position={hc}><group position={hc.clone().negate()}><Part p={org.FMA7274} m={mats.heart} /></group></group>
    </group>
  );
}

/* ===================== 肺炎 ===================== */
function PneumoniaScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', [...LUNGS, 'FMA7394', 'FMA7409']);
  const rl = org.FMA7337;
  const C = org.FMA7409.center;
  const S = 8;
  const u = useMemo(() => ({ uCon: { value: 0 }, uT: { value: 0 } }), []);
  const mats = useMemo(() => ({
    lung: tissue({ transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color('#ffd0d0') }, 'diffuseColor.rgb = mix(vec3(0.93, 0.6, 0.6), vec3(0.75, 0.42, 0.45), fbm(vP * 220.0));'),
    sick: tissue({ transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.6, sheen: 0.6 },
      `float k = uCon * smoothstep(0.35, 0.6, fbm(vP * 90.0 + 3.0));
       diffuseColor.rgb = mix(mix(vec3(0.93, 0.6, 0.6), vec3(0.75, 0.42, 0.45), fbm(vP * 220.0)), vec3(0.95, 0.86, 0.6), k);
       diffuseColor.a = mix(0.3, 0.92, k);`, u, 'uniform float uCon, uT;'),
    air: tissue({ roughness: 0.35, clearcoat: 0.8 }, 'diffuseColor.rgb = vec3(0.92, 0.76, 0.72) * (0.85 + 0.2 * fbm(vP * 400.0));'),
  }), [u]);
  const bugs = useMemo(() => samplePoints(rl.geo, 50, 13).map((v) => v.lerp(rl.center, 0.35)), [rl]);
  const bRef = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uT.value = t; u.uCon.value = ease(u.uCon.value as number, stage === 1 ? 1 : 0, dt, reduce);
    if (bRef.current) {
      bugs.forEach((p, i) => { d.position.copy(p).add(new THREE.Vector3(Math.sin(t + i) * 0.003, Math.cos(t * 0.8 + i) * 0.003, 0)); d.rotation.set(t + i, i, 0); d.scale.setScalar(1); d.updateMatrix(); bRef.current!.setMatrixAt(i, d.matrix); });
      bRef.current.count = stage === 1 ? bugs.length : 0; bRef.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {LUNGS.map((id) => <Part key={id} p={org[id]} m={id === 'FMA7337' ? mats.sick : mats.lung} />)}
      <Part p={org.FMA7394} m={mats.air} /><Part p={org.FMA7409} m={mats.air} />
      <instancedMesh frustumCulled={false} ref={bRef} args={[undefined, undefined, bugs.length]}>
        <capsuleGeometry args={[0.0012, 0.003, 4, 8]} /><meshPhysicalMaterial color="#7fd36a" emissive="#2e7a1c" emissiveIntensity={0.5} roughness={0.4} />
      </instancedMesh>
      {stage === 1 && <Html position={rl.center.clone().add(new THREE.Vector3(0.01, -0.04, 0.05))} center className="anim-label">右下葉發炎、實質化（示意）</Html>}
    </group>
  );
}

/* ===================== 泌尿道（感染、尿失禁） ===================== */
const URO = ['FMA7204', 'FMA7205', 'FMA15571', 'FMA15572', 'FMA15900', 'FMA19667'];
function UtiScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', URO);
  const bl = org.FMA15900, ure = org.FMA19667, ur = org.FMA15571, rk = org.FMA7204;
  const C = useMemo(() => new THREE.Vector3(0, 0.93, 0), []);
  const S = 5;
  const u = useMemo(() => ({ uB: { value: 0 }, uK: { value: 0 }, uT: { value: 0 } }), []);
  const mats = useMemo(() => ({
    kid: tissue({ roughness: 0.3, clearcoat: 0.8 }, 'diffuseColor.rgb = mix(vec3(0.55, 0.2, 0.17), vec3(0.45, 0.14, 0.13), fbm(vP * 600.0));', u, 'uniform float uK, uT;', 'totalEmissiveRadiance += vec3(1.0, 0.25, 0.1) * uK * (0.4 + 0.25 * sin(uT * 3.0));'),
    bla: tissue({ roughness: 0.35, clearcoat: 0.7 }, 'diffuseColor.rgb = mix(vec3(0.91, 0.78, 0.63), vec3(0.85, 0.25, 0.2), uB * smoothstep(0.4, 0.7, fbm(vP * 500.0)));', u, 'uniform float uB, uT;', 'totalEmissiveRadiance += vec3(0.9, 0.2, 0.1) * uB * 0.35;'),
    tube: tissue({ roughness: 0.35, clearcoat: 0.7 }, 'diffuseColor.rgb = vec3(0.92, 0.78, 0.62);'),
  }), [u]);
  const path = useMemo(() => {
    const ucl = centerline(ure.geo, 'y', 6);                     // 尿道由下往上
    const rcl = centerline(ur.geo, 'y', 10);                     // 輸尿管由下往上
    return { into: new THREE.CatmullRomCurve3([...ucl, bl.center]), up: new THREE.CatmullRomCurve3([bl.center, ...rcl, rk.center]) };
  }, [ure, ur, bl, rk]);
  const N = 40;
  const bRef = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uT.value = t;
    u.uB.value = ease(u.uB.value as number, stage >= 1 ? 1 : 0, dt, reduce);
    u.uK.value = ease(u.uK.value as number, stage === 2 ? 1 : 0, dt, reduce);
    if (bRef.current) {
      for (let i = 0; i < N; i++) {
        const s = (t * 0.08 + i / N) % 1;
        if (stage === 2 && i % 2 === 0) d.position.copy(path.up.getPointAt(s));
        else if (s < 0.5) d.position.copy(path.into.getPointAt(s * 2));
        else d.position.copy(bl.center).add(new THREE.Vector3(Math.sin(i * 2.3) * 0.02, Math.cos(i * 1.7) * 0.015, Math.sin(i * 0.9) * 0.015));
        d.rotation.set(t + i, i * 0.7, 0); d.scale.setScalar(1); d.updateMatrix(); bRef.current.setMatrixAt(i, d.matrix);
      }
      bRef.current.count = stage >= 1 ? N : 0; bRef.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <Part p={rk} m={mats.kid} /><Part p={org.FMA7205} m={mats.kid} />
      <Part p={ur} m={mats.tube} /><Part p={org.FMA15572} m={mats.tube} /><Part p={ure} m={mats.tube} />
      <Part p={bl} m={mats.bla} />
      <instancedMesh frustumCulled={false} ref={bRef} args={[undefined, undefined, N]}>
        <capsuleGeometry args={[0.003, 0.007, 4, 8]} /><meshPhysicalMaterial color="#7fd36a" emissive="#2e7a1c" emissiveIntensity={0.5} roughness={0.4} />
      </instancedMesh>
      {stage >= 1 && <Html position={(stage === 2 ? rk.center : bl.center).clone().add(new THREE.Vector3(-0.02, 0.05, 0))} center className="anim-label">{stage === 2 ? '腎臟感染警訊（示意）' : '膀胱發炎（示意）'}</Html>}
    </group>
  );
}

const PELVIS = ['FMA16586', 'FMA16587', 'FMA16202'];
const FLOOR = ['FMA45854', 'FMA45855', 'FMA45858', 'FMA45859', 'FMA46443', 'FMA46444'];
function IncontScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', ['FMA15900', 'FMA19667']);
  const bones = useParts('skeleton', PELVIS);
  const mus = useParts('muscle', FLOOR);
  const bl = org.FMA15900, ure = org.FMA19667;
  const C = bl.center.clone().add(new THREE.Vector3(0, -0.01, -0.01));
  const S = 9;
  const u = useMemo(() => ({ uK: { value: 0 }, uWeak: { value: 0 } }), []);
  const mats = useMemo(() => ({
    bone: tissue({ roughness: 0.55, clearcoat: 0.3, transparent: true, opacity: 0.55, depthWrite: false }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));'),
    floor: tissue({ roughness: 0.45, clearcoat: 0.5, sheen: 0.5 },
      `float fib = 0.86 + 0.16 * sin(dot(vP, vec3(1.0, 0.2, 0.3)) * 900.0);
       diffuseColor.rgb = mix(vec3(0.85, 0.36, 0.42), vec3(0.75, 0.55, 0.55), uWeak) * fib;`, u, 'uniform float uK, uWeak;',
      'totalEmissiveRadiance += vec3(1.0, 0.4, 0.5) * uK * 0.6;'),
    bla: phys('#e9c9a6', { roughness: 0.3, clearcoat: 0.8, transparent: true, opacity: 0.85 }),
    ure: phys('#e9c9a6', { roughness: 0.3, clearcoat: 0.8 }),
  }), [u]);
  const urCl = useMemo(() => centerline(ure.geo, 'y', 6), [ure]);
  const drops = useRef<THREE.InstancedMesh>(null), arrow = useRef<THREE.Group>(null), fg = useRef<THREE.Group>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const kegel = stage === 2 ? 0.5 + 0.5 * Math.sin(t * 1.6) : 0;
    u.uK.value = kegel; u.uWeak.value = ease(u.uWeak.value as number, stage === 1 ? 1 : 0, dt, reduce);
    if (fg.current) fg.current.position.y = kegel * 0.0025; // 收縮時向上提（示意）
    const cough = stage === 1 ? Math.max(0, Math.sin(t * 2.2)) : 0;
    if (arrow.current) { arrow.current.visible = stage === 1; arrow.current.position.y = bl.box.max.y + 0.03 - cough * 0.008; }
    if (drops.current) {
      for (let i = 0; i < 8; i++) {
        const s = ((t * 0.6 + i / 8) % 1);
        d.position.copy(urCl[0]).add(new THREE.Vector3(0, -s * 0.03, 0.002));
        d.scale.setScalar(stage === 1 && cough > 0.2 ? 1 : 0.0001); d.updateMatrix(); drops.current.setMatrixAt(i, d.matrix);
      }
      drops.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {PELVIS.map((id) => <Part key={id} p={bones[id]} m={mats.bone} />)}
      <group ref={fg}>{FLOOR.map((id) => <Part key={id} p={mus[id]} m={mats.floor} />)}</group>
      <Part p={bl} m={mats.bla} /><Part p={ure} m={mats.ure} />
      <instancedMesh frustumCulled={false} ref={drops} args={[undefined, undefined, 8]}><sphereGeometry args={[0.0016, 10, 8]} /><meshPhysicalMaterial color="#f5d742" transparent opacity={0.85} clearcoat={1} /></instancedMesh>
      <group ref={arrow} position={[bl.center.x, bl.box.max.y + 0.03, bl.center.z]} visible={false}>
        <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.0025, 0.0025, 0.02, 12]} /><meshStandardMaterial color="#ff9a2e" emissive="#a04800" /></mesh>
        <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.006, 0.01, 16]} /><meshStandardMaterial color="#ff9a2e" emissive="#a04800" /></mesh>
      </group>
      <Html position={C.clone().add(new THREE.Vector3(0.06, -0.035, 0.03))} center className="anim-label">{['骨盆底肌（粉紅色）', '咳嗽時腹壓增加、漏尿（示意）', '收縮骨盆底肌（示意）'][stage]}</Html>
    </group>
  );
}

/* ===================== 大腸激躁症 ===================== */
function IbsScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', ['FMA14543nsn', 'FMA14544', 'FMA14542', 'FMA7207', 'FMA7208']);
  const colon = org['FMA14543nsn'];
  const C = colon.center;
  const S = 7.5;
  const u = useMemo(() => ({ uT: { value: 0 }, uAmp: { value: 1 }, uIrr: { value: 0 } }), []);
  const gutMat = (main: boolean) => tissue({ roughness: 0.38, clearcoat: 0.8, sheen: 0.5, sheenColor: new THREE.Color('#ffc6b8') },
    `diffuseColor.rgb = ${main ? 'mix(vec3(0.86, 0.6, 0.5), vec3(0.78, 0.48, 0.42), fbm(vP * 500.0))' : 'mix(vec3(0.9, 0.66, 0.6), vec3(0.8, 0.52, 0.5), fbm(vP * 500.0)) * 0.95'};`,
    u, 'uniform float uT, uAmp, uIrr;', `totalEmissiveRadiance += vec3(1.0, 0.3, 0.15) * uIrr * 0.35 * smoothstep(0.6, 0.9, vnoise(vP * 120.0 + vec3(uT * 1.5, 0.0, 0.0)));`,
    `float wave = sin(position.y * 160.0 + position.x * 120.0 - uT * ${main ? '2.2' : '2.8'});
     float spasm = uIrr * smoothstep(0.7, 0.95, vnoise(position * 60.0 + vec3(uT * 2.0, 0.0, 0.0)));
     transformed += objectNormal * (0.0012 * uAmp * wave - 0.003 * spasm + 0.002 * uIrr * smoothstep(0.6, 0.9, vnoise(position * 40.0 + 4.0)));`);
  const mats = useMemo(() => ({ colon: gutMat(true), small: gutMat(false) }), [u]); // eslint-disable-line react-hooks/exhaustive-deps
  const gas = useMemo(() => samplePoints(colon.geo, 30, 17).map((v) => v.lerp(colon.center, 0.1)), [colon]);
  const gRef = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uT.value = t; u.uIrr.value = ease(u.uIrr.value as number, stage === 1 ? 1 : 0, dt, reduce); u.uAmp.value = stage === 1 ? 1.6 : 1;
    if (gRef.current) {
      gas.forEach((p, i) => { d.position.copy(p).add(new THREE.Vector3(0, 0, 0.012)); d.scale.setScalar(stage === 1 ? 0.7 + 0.5 * Math.sin(t * 2 + i) : 0.0001); d.updateMatrix(); gRef.current!.setMatrixAt(i, d.matrix); });
      gRef.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <Part p={colon} m={mats.colon} /><Part p={org.FMA14544} m={mats.colon} /><Part p={org.FMA14542} m={mats.colon} />
      <Part p={org.FMA7207} m={mats.small} /><Part p={org.FMA7208} m={mats.small} />
      <instancedMesh frustumCulled={false} ref={gRef} args={[undefined, undefined, gas.length]}><sphereGeometry args={[0.004, 14, 10]} /><meshPhysicalMaterial color="#dff3ff" transparent opacity={0.45} roughness={0.05} clearcoat={1} depthWrite={false} /></instancedMesh>
      {stage === 1 && <Html position={C.clone().add(new THREE.Vector3(0.09, 0.08, 0.05))} center className="anim-label">不規則收縮、脹氣（示意）</Html>}
    </group>
  );
}

/* ===================== 膽結石 ===================== */
function GallScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', ['FMA7197', 'FMA7202', 'FMA7206', 'FMA7148', 'FMA7198nsn']);
  const gb = org.FMA7202, duo = org.FMA7206, liver = org.FMA7197;
  const C = gb.center.clone().add(new THREE.Vector3(0.02, -0.01, 0));
  const S = 9;
  const duct = useMemo(() => {
    const neck = gb.center.clone().add(new THREE.Vector3(0.006, 0.012, -0.006));
    const target = samplePoints(duo.geo, 1, 3, (v) => v.y > duo.center.y)[0] ?? duo.center;
    const mid = neck.clone().lerp(target, 0.5).add(new THREE.Vector3(0.01, 0.01, -0.01));
    return new THREE.CatmullRomCurve3([neck, mid, target]);
  }, [gb, duo]);
  const ductGeo = useMemo(() => new THREE.TubeGeometry(duct, 40, 0.0025, 12, false), [duct]);
  const cut = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), (gb.center.z - C.z) * S), [gb, C]);
  const mats = useMemo(() => ({
    liver: phys('#7b2a24', { roughness: 0.3, clearcoat: 0.9, transparent: true, opacity: 0.45, depthWrite: false }),
    gb: tissue({ roughness: 0.25, clearcoat: 1 }, `diffuseColor.rgb = gl_FrontFacing ? mix(vec3(0.3, 0.5, 0.22), vec3(0.24, 0.42, 0.18), fbm(vP * 600.0)) : vec3(0.42, 0.55, 0.2);`),
    duct: tissue({ roughness: 0.3, clearcoat: 0.8 }, 'diffuseColor.rgb = vec3(0.45, 0.6, 0.28);', { uP: { value: 0 } }, 'uniform float uP;'),
    gut: phys('#e2a090', { roughness: 0.4, clearcoat: 0.7 }),
    stone: phys('#c9a85a', { roughness: 0.75, clearcoat: 0.3 }),
  }), []);
  useEffect(() => { mats.gb.clippingPlanes = [cut]; }, [mats, cut]);
  const stones = useMemo(() => Array.from({ length: 6 }, (_, i) => gb.center.clone().add(new THREE.Vector3((rnd(i) - 0.5) * 0.012, -0.006 + (rnd(i + 1) - 0.5) * 0.01, -0.002 + (rnd(i + 2) - 0.5) * 0.006))), [gb]);
  const sGeo = useMemo(() => lumpGeometry(0.0035, 6, 3), []);
  const sRef = useRef<THREE.InstancedMesh>(null), moving = useRef<THREE.Mesh>(null), bile = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const g = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    g.current = ease(g.current, stage >= 1 ? 1 : 0, dt, reduce);
    if (sRef.current) {
      stones.forEach((p, i) => { d.position.copy(p); d.scale.setScalar(Math.max(0.0001, g.current) * (0.6 + rnd(i) * 0.6)); d.rotation.set(i, i * 2, 0); d.updateMatrix(); sRef.current!.setMatrixAt(i, d.matrix); });
      sRef.current.instanceMatrix.needsUpdate = true;
    }
    if (moving.current) { moving.current.visible = stage === 2; moving.current.position.copy(duct.getPointAt(0.45)); }
    if (bile.current) {
      for (let i = 0; i < 16; i++) {
        let s = (t * 0.15 + i / 16) % 1;
        if (stage === 2) s = Math.min(s, 0.38 - rnd(i) * 0.15);
        d.position.copy(duct.getPointAt(s)); d.scale.setScalar(1); d.rotation.set(0, 0, 0); d.updateMatrix(); bile.current.setMatrixAt(i, d.matrix);
      }
      bile.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <Part p={liver} m={mats.liver} />
      <Part p={gb} m={mats.gb} />
      <Part p={duo} m={mats.gut} /><Part p={org.FMA7198nsn} m={phys('#e8c08a', { roughness: 0.5 })} />
      <mesh geometry={ductGeo} material={mats.duct} />
      <instancedMesh frustumCulled={false} ref={sRef} args={[sGeo, mats.stone, stones.length]} />
      <mesh ref={moving} geometry={sGeo} material={mats.stone} visible={false} />
      <instancedMesh frustumCulled={false} ref={bile} args={[undefined, undefined, 16]}><sphereGeometry args={[0.0014, 8, 6]} /><meshPhysicalMaterial color="#9fd04a" emissive="#3d6b00" emissiveIntensity={0.4} /></instancedMesh>
      <Html position={duct.getPointAt(0.5).clone().add(new THREE.Vector3(0.04, 0.02, 0.01))} center className="anim-label">{['膽管（示意）', '膽囊內的結石（示意）', '結石阻塞膽管（示意）'][stage]}</Html>
    </group>
  );
}

/* ===================== 缺鐵性貧血（血管段與紅血球） ===================== */
function rbcGeometry() {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, r = 0.07 * Math.sin((t * Math.PI) / 2);
    pts.push(new THREE.Vector2(r, 0.012 + 0.018 * Math.pow(r / 0.07, 2) * (1 - Math.pow(r / 0.07, 8))));
  }
  for (let i = 24; i >= 0; i--) { const p = pts[i]; pts.push(new THREE.Vector2(p.x, -p.y)); }
  const g = new THREE.LatheGeometry(pts, 28); g.computeVertexNormals(); return g;
}
function AnemiaScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const L = 4.6, R = 0.55, N = 140;
  const wall = useMemo(() => { const g = new THREE.CylinderGeometry(R, R, L, 64, 1, true, Math.PI * 0.12, Math.PI * 1.76); g.rotateZ(Math.PI / 2); return g; }, []);
  const wallMat = useMemo(() => tissue({ roughness: 0.4, clearcoat: 0.6, sheen: 0.4, sheenColor: new THREE.Color('#ffc4b8') },
    'diffuseColor.rgb = gl_FrontFacing ? vec3(0.8, 0.45, 0.42) * (0.85 + 0.2 * fbm(vP * 6.0)) : vec3(0.95, 0.78, 0.74) * (0.9 + 0.12 * fbm(vP * 9.0));'), []);
  const rbcGeo = useMemo(rbcGeometry, []);
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ x: rnd(i) * L, th: rnd(i + 300) * Math.PI * 2, r: Math.sqrt(rnd(i + 600)) * (R - 0.09), sp: 0.7 + rnd(i + 900) * 0.6, rot: rnd(i + 1200) * 6 })), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b3121c', roughness: 0.35, clearcoat: 0.6, sheen: 0.5, sheenColor: new THREE.Color('#ff6b6b') }), []);
  const k = useRef(1);
  const pale = useMemo(() => new THREE.Color('#d98a84'), []), red = useMemo(() => new THREE.Color('#b3121c'), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, [1, 0, 0.8][stage], dt, reduce);
    mat.color.copy(pale).lerp(red, k.current);
    const n = Math.round(N * (0.45 + 0.55 * k.current));
    const size = 0.78 + 0.22 * k.current;
    if (ref.current) {
      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        const x = ((s.x + t * 0.4 * s.sp) % L) - L / 2;
        d.position.set(x, s.r * Math.cos(s.th), s.r * Math.sin(s.th));
        d.rotation.set(s.rot + t * 0.7 * s.sp, s.rot * 2, t * 0.4 + s.rot); d.scale.setScalar(size); d.updateMatrix(); ref.current.setMatrixAt(i, d.matrix);
      }
      ref.current.count = n; ref.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group rotation={[0.12, -0.32, 0]}>
      <mesh geometry={wall} material={wallMat} />
      <instancedMesh frustumCulled={false} ref={ref} args={[rbcGeo, mat, N]} />
    </group>
  );
}

/* ===================== 下背痛與椎間盤突出 ===================== */
const LUMBAR = ['FMA13072', 'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076', 'FMA16202'];
const DISKS = ['FMA16033', 'FMA16034', 'FMA16035', 'FMA16036', 'FMA16037'];
function SpineScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const bones = useParts('skeleton', [...LUMBAR, ...DISKS]);
  const nerves = useParts('za-nerve', ['ZA-Cauda-equina', 'ZA-Sciatic-nerve-r', 'ZA-Sciatic-nerve-l']);
  const L4 = bones.FMA16036 ?? bones.FMA13075;
  const C = bones.FMA13074.center.clone().add(new THREE.Vector3(0, -0.04, 0));
  const S = 7;
  const u = useMemo(() => ({ uPain: { value: 0 }, uT: { value: 0 }, uDisk: { value: L4.center } }), [L4]);
  const mats = useMemo(() => ({
    bone: tissue({ roughness: 0.55, clearcoat: 0.3 }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));'),
    disk: tissue({ roughness: 0.25, clearcoat: 1 }, 'diffuseColor.rgb = vec3(0.55, 0.78, 0.95) * (0.9 + 0.15 * fbm(vP * 800.0));'),
    nerve: tissue({ roughness: 0.45, clearcoat: 0.4 }, 'diffuseColor.rgb = vec3(0.96, 0.86, 0.5) * (0.85 + 0.2 * fbm(vP * 500.0));', u, 'uniform float uPain, uT; uniform vec3 uDisk;',
      `float near = smoothstep(0.0, -0.25, vP.y - uDisk.y) * step(vP.x, uDisk.x + 0.004);
       totalEmissiveRadiance += vec3(1.0, 0.18, 0.08) * uPain * near * (0.5 + 0.4 * sin(uT * 3.0 - vP.y * 30.0));`),
  }), [u]);
  const bulge = useRef<THREE.Mesh>(null);
  const bGeo = useMemo(() => lumpGeometry(0.0095, 3, 3), []);
  const k = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, stage === 1 ? 1 : stage === 2 ? 0.35 : 0, dt, reduce);
    u.uT.value = t; u.uPain.value = stage === 1 ? 1 : 0;
    if (bulge.current) { bulge.current.visible = k.current > 0.03; bulge.current.scale.set(k.current, k.current * 0.6, k.current); }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {LUMBAR.map((id) => <Part key={id} p={bones[id]} m={mats.bone} />)}
      {DISKS.map((id) => <Part key={id} p={bones[id]} m={mats.disk} />)}
      {Object.values(nerves).map((p) => <Part key={p.id} p={p} m={mats.nerve} />)}
      <mesh ref={bulge} geometry={bGeo} position={[L4.center.x - 0.017, L4.center.y, L4.center.z - (L4.box.max.z - L4.box.min.z) * 0.3]} visible={false}>
        <meshPhysicalMaterial color="#f0e28a" roughness={0.3} clearcoat={0.8} emissive="#6b5a00" emissiveIntensity={0.3} />
      </mesh>
      {stage === 1 && <Html position={[L4.center.x - 0.02, L4.center.y + 0.035, L4.center.z - 0.03]} center className="anim-label">椎間盤突出、刺激神經（示意）</Html>}
    </group>
  );
}

const VIEW: Record<Batch4Topic, { cam: [number, number, number]; target?: [number, number, number]; caption: string; bg?: string }> = {
  anxiety: { cam: [2.4, 0.8, 3.4], caption: '大腦形狀來自 BodyParts3D 成年男性解剖模型；光線與微顫是比喻，不是腦部影像或檢查結果。' },
  'panic-disorder': { cam: [0.8, 0.4, 3.6], caption: '心臟、肺葉與支氣管形狀來自 BodyParts3D 成年男性解剖模型；跳動、呼吸速度與發紅為示意。' },
  'autonomic-dysfunction': { cam: [1.5, 0.4, 3.6], caption: '脊髓與神經來自 Z-Anatomy（CC BY-SA 4.0），心臟與血管來自 BodyParts3D；神經訊號光點與不規則變化為示意。' },
  pneumonia: { cam: [0.7, 0.5, 4.4], caption: '肺葉、氣管與支氣管形狀來自 BodyParts3D 成年男性解剖模型；實質化區塊與病菌為示意。' },
  uti: { cam: [0.4, 0.2, 3.6], caption: '腎臟、輸尿管、膀胱與尿道形狀來自 BodyParts3D 成年男性解剖模型；細菌與發紅為示意。' },
  'urinary-incontinence': { cam: [0.9, 0.5, 3.0], caption: '骨盆、膀胱、尿道與骨盆底肌來自 BodyParts3D 成年男性解剖模型；腹壓箭頭、漏尿與肌肉收縮為示意。女性骨盆構造不同，模型僅供參考。' },
  ibs: { cam: [0.6, 0.3, 4.2], caption: '大腸、小腸與直腸形狀來自 BodyParts3D 成年男性解剖模型；蠕動、收縮與脹氣為示意。' },
  gallstones: { cam: [0.8, 0.5, 4.2], caption: '肝臟、膽囊（剖面）、十二指腸與胰臟來自 BodyParts3D；膽管、膽汁與結石為示意。' },
  'iron-deficiency-anemia': { cam: [0, 0.4, 4.6], caption: '剖開的血管段與雙凹圓盤狀紅血球為示意，數量與大小經放大簡化，不是實際比例，也不是血液檢查結果。' },
  'low-back-pain': { cam: [-3.0, 0.35, -0.7], caption: '腰椎、薦骨與椎間盤來自 BodyParts3D，馬尾與坐骨神經來自 Z-Anatomy（CC BY-SA 4.0）；椎間盤突出與神經發紅為示意。' },
};

export default function Batch4Anims({ topic }: { topic: Batch4Topic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { setStage(0); }, [topic]);
  const info = INFO[topic][stage];
  const v = VIEW[topic];
  const chips = CHIPS[topic]?.[stage] ?? [];
  return (
    <figure className="vessel">
      <div className="tear-canvas tall" role="img" aria-label={`${info.label}的衛教示意動畫`}>
        <Canvas camera={{ position: v.cam, fov: 34, near: 0.02, far: 40 }} dpr={[1, 2]} gl={{ antialias: true, localClippingEnabled: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <color attach="background" args={[v.bg ?? '#101c2b']} />
          <StudioLights />
          <Suspense fallback={null}>
            {topic === 'anxiety' && <AnxietyScene stage={stage} frozen={frozen} />}
            {topic === 'panic-disorder' && <PanicScene stage={stage} frozen={frozen} />}
            {topic === 'autonomic-dysfunction' && <AnsScene stage={stage} frozen={frozen} />}
            {topic === 'pneumonia' && <PneumoniaScene stage={stage} frozen={frozen} />}
            {topic === 'uti' && <UtiScene stage={stage} frozen={frozen} />}
            {topic === 'urinary-incontinence' && <IncontScene stage={stage} frozen={frozen} />}
            {topic === 'ibs' && <IbsScene stage={stage} frozen={frozen} />}
            {topic === 'gallstones' && <GallScene stage={stage} frozen={frozen} />}
            {topic === 'iron-deficiency-anemia' && <AnemiaScene stage={stage} frozen={frozen} />}
            {topic === 'low-back-pain' && <SpineScene stage={stage} frozen={frozen} />}
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
      {chips.length > 0 && <ul className="anim-chips">{chips.map((c) => <li key={c} className="on">{c}</li>)}</ul>}
      <p className="small">{info.note}</p>
      <figcaption className="small">衛教示意：{v.caption}可拖曳旋轉、滾輪縮放。診斷需由醫師評估。</figcaption>
    </figure>
  );
}
