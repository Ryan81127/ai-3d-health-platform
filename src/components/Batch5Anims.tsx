import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { centerline, useParts } from '../three/partGeometry';
import { PARTS } from '../three/anatomy';
import StudioLights from '../three/StudioLights';
import { Part, lumpGeometry, phys, rnd, samplePoints, tissue } from '../three/tissue';

/**
 * 第五批常見疾病的 3D 衛教示意：類風濕性關節炎、紅斑性狼瘡、衰弱與跌倒、過敏性鼻炎、聽力損失、膀胱過動症、地中海型貧血、良性攝護腺肥大、勃起功能障礙、男性更年期。
 * 骨骼、皮膚、器官與血管形狀來自 BodyParts3D／Z-Anatomy 真實模型；發炎、紅疹、花粉、耳蝸、血流與荷爾蒙等為示意效果。
 * 情境文字對應 diseases.ts 已核對的 MedlinePlus 與 NIDDK 內容。
 */
export type Batch5Topic = 'rheumatoid-arthritis' | 'sle' | 'frailty-falls' | 'allergic-rhinitis' | 'hearing-loss' | 'overactive-bladder' | 'thalassemia' | 'bph' | 'erectile-dysfunction' | 'late-onset-hypogonadism';

const INFO: Record<Batch5Topic, { label: string; note: string }[]> = {
  'rheumatoid-arthritis': [
    { label: '手部的小關節', note: '類風濕性關節炎最常見於手腕與手指。（右手骨骼來自解剖模型）' },
    { label: '關節發炎腫脹（示意）', note: '自體免疫攻擊關節內襯，造成疼痛、腫脹、僵硬，早上或久未活動後更明顯，通常兩側對稱。紅色區塊為發炎示意。' },
    { label: '及早治療（示意）', note: '類風濕性關節炎無法治癒，但及早治療可避免症狀惡化與關節損傷；保持活動、維持體重、戒菸也有幫助。' },
  ],
  sle: [
    { label: '正常皮膚', note: '紅斑性狼瘡是免疫系統誤攻擊健康組織的慢性自體免疫疾病。（頭部皮膚來自解剖模型）' },
    { label: '蝴蝶斑與發作（示意）', note: '常見臉部紅疹（蝴蝶斑）、關節炎、發燒、疲倦、對陽光敏感等；也可能影響腎臟、心臟、肺與腦。紅疹範圍為示意。' },
    { label: '控制發作', note: '紅斑性狼瘡無法治癒，但藥物與生活調整可以控制；治療目標是預防與治療發作、減少器官損傷。外出做好防曬。' },
  ],
  'frailty-falls': [
    { label: '站立與平衡', note: '肌力、平衡與反射共同維持站穩。（全身骨骼來自解剖模型，搖晃幅度為示意）' },
    { label: '跌倒與髖部骨折（示意）', note: '平衡問題、腿部肌肉無力、視力問題、頭暈的藥物等都可能造成跌倒；長者較容易骨折，髖部骨折可能造成失能。髖部發紅為示意。' },
    { label: '運動與居家安全', note: '規律運動可強化肌肉、改善平衡；定期檢查眼睛、移除絆倒物、樓梯與浴室加扶手，並攝取足夠的鈣質與維生素 D。' },
  ],
  'allergic-rhinitis': [
    { label: '鼻腔與鼻甲', note: '鼻腔內的鼻甲（粉紅色）有黏膜覆蓋，溫暖並濕潤吸入的空氣。（頭部骨骼與鼻甲來自解剖模型）' },
    { label: '花粉引起過敏（示意）', note: '花粉進入鼻子與喉嚨，可能引發過敏：打噴嚏、流鼻水或鼻塞、眼睛鼻子喉嚨癢。鼻甲腫脹與花粉為示意。' },
    { label: '藥物與鼻腔沖洗（示意）', note: '藥物與鼻噴劑可以緩解症狀；沖洗鼻腔要使用蒸餾水或滅菌水調製的生理食鹽水。減敏注射可提供長期緩解。' },
  ],
  'hearing-loss': [
    { label: '聲音傳到內耳', note: '聲波經外耳進入，內耳的毛細胞把聲波轉換成神經訊號。（外耳來自解剖模型；耳蝸與毛細胞為示意）' },
    { label: '毛細胞受損（示意）', note: '毛細胞受損或死亡就會造成聽力損失，毛細胞不會再生，因此是永久的；常見原因包括老化與長期噪音。' },
    { label: '助聽器（示意）', note: '老年性聽力損失無法治癒，治療以改善日常功能為主，例如助聽器；嚴重者可考慮人工電子耳。聽力突然改變請立即就醫。' },
  ],
  'overactive-bladder': [
    { label: '膀胱逐漸充滿', note: '膀胱儲存尿液，平常在充滿後才產生明顯尿意。（膀胱、尿道與骨盆來自解剖模型）' },
    { label: '膀胱在錯誤的時間收縮（示意）', note: '膀胱過動症是膀胱在錯誤的時間把尿液擠出，常突然很想上廁所，可能來不及而漏尿。收縮與發亮為示意。' },
    { label: '膀胱訓練', note: '依排尿日記定時排尿、逐漸拉長間隔，並做凱格爾運動；自我照顧無效時，醫師可能使用放鬆膀胱的藥物。' },
  ],
  thalassemia: [
    { label: '正常的紅血球', note: '紅血球中的血紅素把氧氣運送到全身。（血管段與紅血球為示意）' },
    { label: '健康紅血球與血紅素較少（示意）', note: '地中海型貧血是遺傳性血液疾病，身體製造的健康紅血球與血紅素較少而造成貧血。紅血球變小變淡為示意。不要自行補鐵。' },
    { label: '輸血與排鐵（示意）', note: '治療包括輸血與移除體內過多的鐵；症狀輕微或沒有症狀者可能不需要治療。從左側流入的紅血球表示輸血（示意）。' },
  ],
  bph: [
    { label: '攝護腺與尿道', note: '攝護腺（橘色）位於膀胱正下方，尿道從中穿過。（膀胱、攝護腺、尿道、儲精囊與骨盆來自解剖模型）' },
    { label: '攝護腺變大壓迫尿道（示意）', note: '攝護腺變大時壓迫尿道，尿流變慢、斷斷續續、夜間頻尿、解不乾淨；不是癌症。攝護腺變大的程度為示意。' },
    { label: '生活調整與藥物', note: '睡前少喝水、減少咖啡因與酒精、膀胱訓練；藥物可抑制攝護腺生長或放鬆肌肉改善尿流。完全解不出尿請立即就醫。' },
  ],
  'erectile-dysfunction': [
    { label: '正常血流（示意）', note: '勃起需要足夠的血液流入陰莖海綿體。（骨盆血管與海綿體來自解剖模型，血流為示意）' },
    { label: '血管阻塞、血流不足（示意）', note: '勃起功能障礙可能是健康問題的徵兆，例如血管阻塞或糖尿病造成的神經損傷。動脈斑塊為示意。' },
    { label: '運動、減重、戒菸與就醫', note: '增加運動、減重或戒菸可能有幫助；請告訴醫師，背後的健康問題才能被治療。許多人只需服用藥物。' },
  ],
  'late-onset-hypogonadism': [
    { label: '睪固酮的作用（示意）', note: '睪固酮幫助控制性慾，並協助肌肉與骨骼生長。（睪丸、骨盆、股骨與大腿肌群來自解剖模型，荷爾蒙粒子為示意）' },
    { label: '睪固酮低下（示意）', note: '可能出現性慾低、勃起功能障礙、肌肉量流失、不明原因的骨質變薄或貧血。睪固酮隨年齡下降是正常的，是否需要治療由醫師判斷。' },
    { label: '抽血檢查與醫師評估', note: '醫師可安排總睪固酮等抽血檢查，並依年齡、症狀與其他檢查判斷；規律阻力運動有助維持肌肉與骨骼。' },
  ],
};
const CHIPS: Partial<Record<Batch5Topic, string[][]>> = {
  sle: [[], ['關節炎、晨僵', '發燒、疲倦', '對陽光敏感', '口腔潰瘍', '腎臟、心臟、肺可能受影響'], ['預防與治療發作', '減少器官損傷', '防曬', '新症狀及早告知醫師']],
  'frailty-falls': [[], ['平衡問題', '腿部肌肉無力', '視力問題', '頭暈的藥物', '酒精'], ['規律運動', '定期眼睛檢查', '移除絆倒物', '樓梯與浴室扶手', '鈣質與維生素 D']],
  'late-onset-hypogonadism': [[], ['性慾低', '勃起功能障礙', '肌肉量流失', '骨質變薄', '不明原因貧血'], ['總睪固酮抽血檢查', '醫師依症狀綜合評估', '規律阻力運動', '維持健康體重']],
};
const T_FROZEN = 1.6;
const ease = (cur: number, target: number, dt: number, reduce: boolean, rate = 0.9) => (reduce ? target : cur + (target - cur) * (1 - Math.exp(-dt * rate)));
const boneMatOf = () => tissue({ roughness: 0.55, clearcoat: 0.3 }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));');

/* ===================== 類風濕性關節炎（右手） ===================== */
const HAND = PARTS.filter((p) => p.layer === 'skeleton' && !p.src && /right/i.test(p.en) && p.c[0] < -0.2 && p.c[1] > 0.6 && p.c[1] < 0.86).map((p) => p.id);
function RAScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const bones = useParts('skeleton', HAND);
  const list = useMemo(() => Object.values(bones), [bones]);
  const C = useMemo(() => { const b = new THREE.Box3(); list.forEach((p) => b.union(p.box)); return b.getCenter(new THREE.Vector3()); }, [list]);
  const S = 12;
  const mat = useMemo(boneMatOf, []);
  // 關節位置：掌骨遠端與近端指骨近端之間（手自然下垂，遠端在下方）
  const joints = useMemo(() => {
    const mc = list.filter((p) => /metacarpal/i.test(PARTS.find((x) => x.id === p.id)?.en ?? ''));
    const pp = list.filter((p) => /proximal phalanx/i.test(PARTS.find((x) => x.id === p.id)?.en ?? ''));
    const out = mc.map((m) => new THREE.Vector3(m.center.x, m.box.min.y, m.center.z));
    pp.forEach((m) => out.push(new THREE.Vector3(m.center.x, m.box.min.y, m.center.z)));
    out.push(C.clone().setY(Math.max(...list.map((p) => p.box.max.y)) - 0.012)); // 手腕
    return out;
  }, [list, C]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const k = useRef(0);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, [0, 1, 0.35][stage], dt, reduce);
    if (ref.current) {
      joints.forEach((p, i) => { d.position.copy(p); d.scale.setScalar(Math.max(0.0001, k.current) * (1 + 0.08 * Math.sin(t * 3 + i))); d.updateMatrix(); ref.current!.setMatrixAt(i, d.matrix); });
      ref.current.instanceMatrix.needsUpdate = true;
      (ref.current.material as THREE.MeshPhysicalMaterial).opacity = 0.35 * Math.min(1, k.current * 1.5);
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {list.map((p) => <Part key={p.id} p={p} m={mat} />)}
      <instancedMesh frustumCulled={false} ref={ref} args={[undefined, undefined, joints.length]}>
        <sphereGeometry args={[0.0075, 24, 16]} /><meshPhysicalMaterial color="#ff3b2f" transparent opacity={0.3} depthWrite={false} emissive="#b31d12" emissiveIntensity={0.6} />
      </instancedMesh>
      {stage === 1 && <Html position={C.clone().add(new THREE.Vector3(0.05, -0.03, 0.03))} center className="anim-label">關節發炎、腫脹（示意）</Html>}
    </group>
  );
}

/* ===================== 紅斑性狼瘡（臉部蝴蝶斑） ===================== */
function SleScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const skin = useParts('skin', ['FMA7163']).FMA7163;
  const C = useMemo(() => new THREE.Vector3(0, 1.52, 0.04), []);
  const S = 12;
  const u = useMemo(() => ({ uRash: { value: 0 }, uT: { value: 0 } }), []);
  const mat = useMemo(() => tissue({ roughness: 0.55, clearcoat: 0.2, sheen: 0.6, sheenColor: new THREE.Color('#ffd9c4') },
    `vec3 base = vec3(0.92, 0.74, 0.62) * (0.92 + 0.12 * fbm(vP * 900.0));
     // 蝴蝶斑：鼻樑兩側跨過臉頰（示意）
     vec2 q = vec2(abs(vP.x) / 0.045, (vP.y - 1.505) / 0.022);
     float wing = smoothstep(1.0, 0.6, length(vec2(q.x - 0.55, q.y * 1.1))) + smoothstep(0.5, 0.2, length(vec2(q.x, q.y + 0.1)));
     float front = smoothstep(0.06, 0.085, vP.z);
     float rash = uRash * clamp(wing, 0.0, 1.0) * front * (0.7 + 0.5 * fbm(vP * 1500.0));
     diffuseColor.rgb = mix(base, vec3(0.86, 0.3, 0.32), clamp(rash, 0.0, 0.85));`, u, 'uniform float uRash, uT;'), [u]);
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 1, 0), -(1.42 - C.y) * S)], [C]);
  useEffect(() => { mat.clippingPlanes = clip; }, [mat, clip]);
  useFrame((_, dt) => { u.uRash.value = ease(u.uRash.value as number, [0, 1, 0.25][stage], dt, reduce); void frozen; });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <Part p={skin} m={mat} />
      {stage === 1 && <Html position={[0.06, 1.52, 0.08]} center className="anim-label">臉部蝴蝶斑（示意）</Html>}
    </group>
  );
}

/* ===================== 衰弱與跌倒（全身骨骼） ===================== */
const SKEL = PARTS.filter((p) => p.layer === 'skeleton' && !p.src).map((p) => p.id);
const HIP = new Set(['FMA24474', 'FMA16586']);
function FallScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const bones = useParts('skeleton', SKEL);
  const C = useMemo(() => new THREE.Vector3(0, 0.88, 0), []);
  const S = 2.6;
  const u = useMemo(() => ({ uHip: { value: 0 }, uT: { value: 0 } }), []);
  const mats = useMemo(() => ({
    bone: boneMatOf(),
    hip: tissue({ roughness: 0.55, clearcoat: 0.3 }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));', u, 'uniform float uHip, uT;',
      'totalEmissiveRadiance += vec3(1.0, 0.2, 0.1) * uHip * smoothstep(0.98, 0.9, vP.y) * smoothstep(0.82, 0.88, vP.y) * (0.6 + 0.4 * sin(uT * 4.0));'),
  }), [u]);
  const pivot = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uT.value = t; u.uHip.value = ease(u.uHip.value as number, stage === 1 ? 1 : 0, dt, reduce);
    if (!pivot.current) return;
    if (stage === 1 && !(frozen || reduce)) {
      const ph = (t % 6) / 6;
      const sway = 0.06 * Math.sin(t * 2.6);
      const fall = ph > 0.45 && ph < 0.8 ? Math.sin(((ph - 0.45) / 0.35) * Math.PI / 2) * 0.55 : ph >= 0.8 ? 0.55 * (1 - (ph - 0.8) / 0.2) : 0;
      pivot.current.rotation.z = sway + fall;
    } else pivot.current.rotation.z = stage === 0 && !(frozen || reduce) ? 0.012 * Math.sin(t * 1.4) : 0;
  });
  return (
    <group scale={S} position={new THREE.Vector3(0, -C.y * S, 0)}>
      <group ref={pivot}>
        {SKEL.map((id) => <Part key={id} p={bones[id]} m={HIP.has(id) ? mats.hip : mats.bone} />)}
      </group>
      {stage === 1 && <Html position={[-0.15, 0.9, 0.05]} center className="anim-label">髖部骨折風險（示意）</Html>}
    </group>
  );
}

/* ===================== 過敏性鼻炎 ===================== */
const NOSE_BONES = ['FMA52892', 'FMA52893', 'FMA53647', 'FMA53648', 'FMA53649', 'FMA53650'];
function NoseScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const sk = useParts('skeleton', [...NOSE_BONES, 'FMA54737', 'FMA54738']);
  const org = useParts('organ', ['FMA71704']);
  const C = useMemo(() => new THREE.Vector3(0, 1.505, 0.06), []);
  const S = 18;
  const u = useMemo(() => ({ uSw: { value: 0 }, uT: { value: 0 } }), []);
  const mats = useMemo(() => ({
    bone: tissue({ roughness: 0.55, clearcoat: 0.3, transparent: true, opacity: 0.3, depthWrite: false }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));'),
    concha: tissue({ roughness: 0.3, clearcoat: 0.9, sheen: 0.5, sheenColor: new THREE.Color('#ffc0c0') },
      'diffuseColor.rgb = mix(vec3(0.85, 0.42, 0.48), vec3(0.78, 0.12, 0.2), uSw) * (0.88 + 0.15 * fbm(vP * 1200.0));', u, 'uniform float uSw, uT;', '',
      'transformed += objectNormal * uSw * 0.0025;'),
    cart: phys('#ead9cf', { roughness: 0.4, clearcoat: 0.6, transparent: true, opacity: 0.6 }),
  }), [u]);
  const N = 40;
  const pol = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const pGeo = useMemo(() => new THREE.IcosahedronGeometry(0.0012, 0), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uT.value = t; u.uSw.value = ease(u.uSw.value as number, [0, 1, 0.3][stage], dt, reduce);
    if (pol.current) {
      for (let i = 0; i < N; i++) {
        const s = (t * 0.18 + i / N) % 1;
        const side = i % 2 ? 1 : -1;
        d.position.set(side * (0.006 + rnd(i) * 0.004), 1.49 + rnd(i + 3) * 0.012 + s * 0.006, 0.12 - s * 0.07);
        d.rotation.set(t + i, i, 0); d.scale.setScalar(1); d.updateMatrix(); pol.current.setMatrixAt(i, d.matrix);
      }
      pol.current.instanceMatrix.needsUpdate = true;
      const m = pol.current.material as THREE.MeshPhysicalMaterial;
      m.color.set(stage === 2 ? '#8fd3ff' : '#f2c230');
      pol.current.count = stage === 0 ? 0 : N;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {NOSE_BONES.map((id) => <Part key={id} p={sk[id]} m={mats.bone} />)}
      <Part p={sk.FMA54737} m={mats.concha} /><Part p={sk.FMA54738} m={mats.concha} />
      <Part p={org.FMA71704} m={mats.cart} />
      <instancedMesh frustumCulled={false} ref={pol} args={[pGeo, undefined, N]}><meshPhysicalMaterial color="#f2c230" emissive="#6b5200" emissiveIntensity={0.4} flatShading roughness={0.4} /></instancedMesh>
      <Html position={[0.03, 1.47, 0.08]} center className="anim-label">{['下鼻甲（粉紅色）', '花粉、鼻甲腫脹（示意）', '生理食鹽水沖洗（示意）'][stage]}</Html>
    </group>
  );
}

/* ===================== 聽力損失 ===================== */
function EarScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const ear = useParts('skin', ['FMA52780']).FMA52780;
  const rEar = useMemo(() => {
    const p = ear.geo.attributes.position, v = new THREE.Vector3(), s = new THREE.Vector3(); let n = 0;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (v.x < -0.04) { s.add(v); n++; } }
    return n ? s.divideScalar(n) : new THREE.Vector3(-0.07, 1.51, -0.01);
  }, [ear]);
  const cochC = useMemo(() => rEar.clone().add(new THREE.Vector3(0.03, 0.002, 0.012)), [rEar]);
  const C = useMemo(() => rEar.clone().add(new THREE.Vector3(0.012, 0, 0)), [rEar]);
  const S = 22;
  // 耳蝸：逐漸變細的螺旋（示意）
  const spiral = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 5, r = 0.008 * (1 - i / 150); pts.push(new THREE.Vector3(0, Math.sin(a) * r, Math.cos(a) * r).add(new THREE.Vector3(i * 0.00003, 0, 0)).add(cochC)); }
    return new THREE.CatmullRomCurve3(pts);
  }, [cochC]);
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(spiral, 160, 0.0016, 12, false), [spiral]);
  const NH = 70;
  const hair = useRef<THREE.InstancedMesh>(null), waves = useRef<THREE.Group>(null), aid = useRef<THREE.Mesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const skinMat = useMemo(() => tissue({ roughness: 0.55, clearcoat: 0.2, sheen: 0.6, sheenColor: new THREE.Color('#ffd9c4') }, 'diffuseColor.rgb = vec3(0.92, 0.74, 0.62) * (0.92 + 0.12 * fbm(vP * 900.0));'), []);
  useEffect(() => { skinMat.clippingPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), (0 - C.x) * S)]; }, [skinMat, C]); // 只顯示右耳
  const k = useRef(1);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, [1, 0.3, 0.3][stage], dt, reduce);
    if (hair.current) {
      for (let i = 0; i < NH; i++) {
        const s = i / NH, p = spiral.getPointAt(s), tan = spiral.getTangentAt(s);
        const alive = rnd(i + 5) < k.current;
        const wave = Math.max(0, Math.sin(t * 6 - s * 12)) * (stage === 2 ? 1 : k.current);
        d.position.copy(p); d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().crossVectors(tan, new THREE.Vector3(1, 0, 0)).normalize());
        d.scale.set(1, alive ? 1 + wave * 0.6 : 0.25, 1); d.updateMatrix(); hair.current.setMatrixAt(i, d.matrix);
      }
      hair.current.instanceMatrix.needsUpdate = true;
    }
    if (waves.current) waves.current.children.forEach((c, i) => {
      const s = ((t * 0.5 + i / 4) % 1);
      c.position.set(rEar.x - 0.05 + s * 0.04, rEar.y, rEar.z);
      const amp = stage === 2 ? 1.3 : 1;
      c.scale.setScalar((0.6 + s * 1.4) * amp);
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - s) * 0.6;
    });
    if (aid.current) aid.current.visible = stage === 2;
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <Part p={ear} m={skinMat} />
      <mesh geometry={tubeGeo}><meshPhysicalMaterial color="#f3e2c8" roughness={0.3} clearcoat={0.8} transparent opacity={0.75} /></mesh>
      <instancedMesh frustumCulled={false} ref={hair} args={[undefined, undefined, NH]}><cylinderGeometry args={[0.00018, 0.00018, 0.0024, 6]} /><meshPhysicalMaterial color="#ffd36b" emissive="#8a5a00" emissiveIntensity={0.6} /></instancedMesh>
      <group ref={waves}>{[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.006, 0.0003, 6, 40]} /><meshBasicMaterial color="#7fd0ff" transparent opacity={0.5} /></mesh>
      ))}</group>
      <mesh ref={aid} position={rEar.clone().add(new THREE.Vector3(-0.004, 0.012, -0.012))} rotation={[0.4, 0, 0.3]} visible={false}>
        <capsuleGeometry args={[0.0035, 0.012, 6, 12]} /><meshPhysicalMaterial color="#d9c3a5" roughness={0.3} clearcoat={1} />
      </mesh>
      <Html position={cochC.clone().add(new THREE.Vector3(0, 0.014, 0))} center className="anim-label">{['耳蝸毛細胞（示意）', '毛細胞受損（示意）', '助聽器放大聲音（示意）'][stage]}</Html>
    </group>
  );
}

/* ===================== 骨盆內：膀胱過動、攝護腺肥大 ===================== */
const PELVIS = ['FMA16586', 'FMA16587', 'FMA16202'];
function BladderScene({ topic, stage, frozen }: { topic: 'overactive-bladder' | 'bph'; stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', ['FMA15900', 'FMA19667', 'FMA9600', 'FMA19387', 'FMA19388']);
  const bones = useParts('skeleton', PELVIS);
  const bl = org.FMA15900, ure = org.FMA19667, pro = org.FMA9600;
  const C = bl.center.clone().add(new THREE.Vector3(0, -0.02, 0));
  const S = 9;
  const u = useMemo(() => ({ uSq: { value: 0 }, uT: { value: 0 } }), []);
  const mats = useMemo(() => ({
    bone: tissue({ roughness: 0.55, clearcoat: 0.3, transparent: true, opacity: 0.4, depthWrite: false }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));'),
    bla: tissue({ roughness: 0.3, clearcoat: 0.8, transparent: true, opacity: 0.85 }, 'diffuseColor.rgb = vec3(0.91, 0.78, 0.63) * (0.9 + 0.12 * fbm(vP * 700.0));', u, 'uniform float uSq, uT;',
      'totalEmissiveRadiance += vec3(1.0, 0.45, 0.15) * uSq * 0.5;'),
    pro: tissue({ roughness: 0.4, clearcoat: 0.6 }, 'diffuseColor.rgb = mix(vec3(0.9, 0.55, 0.3), vec3(0.8, 0.45, 0.25), fbm(vP * 1200.0));'),
    ure: phys('#e9c9a6', { roughness: 0.3, clearcoat: 0.8 }),
    sv: phys('#e0b48a', { roughness: 0.4, clearcoat: 0.6 }),
  }), [u]);
  const blG = useRef<THREE.Group>(null), proG = useRef<THREE.Group>(null), urine = useRef<THREE.InstancedMesh>(null);
  const urCl = useMemo(() => centerline(ure.geo, 'y', 8, true), [ure]); // 由上往下
  const urCurve = useMemo(() => new THREE.CatmullRomCurve3([bl.center.clone().setY(bl.box.min.y + 0.004), ...urCl]), [bl, urCl]);
  const d = useMemo(() => new THREE.Object3D(), []);
  const pk = useRef(1);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uT.value = t;
    let sq = 0, fill = 0.85 + 0.15 * ((t * 0.08) % 1);
    if (topic === 'overactive-bladder' && stage === 1) { const ph = (t % 4) / 4; sq = ph > 0.6 && ph < 0.8 ? Math.sin(((ph - 0.6) / 0.2) * Math.PI) : 0; fill = 0.88; }
    u.uSq.value = sq;
    if (blG.current) blG.current.scale.setScalar(fill * (1 - 0.08 * sq));
    if (topic === 'bph') pk.current = ease(pk.current, [1, 1.45, 1.28][stage], dt, reduce);
    if (proG.current) proG.current.scale.setScalar(topic === 'bph' ? pk.current : 1);
    if (urine.current) {
      const flowing = topic === 'bph' ? true : sq > 0.2;
      const rate = topic === 'bph' ? [0.35, 0.1, 0.22][stage] : 0.6;
      const n = topic === 'bph' ? [14, 5, 10][stage] : 10;
      for (let i = 0; i < 14; i++) {
        const s = (t * rate + i / 14) % 1;
        d.position.copy(urCurve.getPointAt(s));
        d.scale.setScalar(flowing && i < n ? 1 : 0.0001); d.updateMatrix(); urine.current.setMatrixAt(i, d.matrix);
      }
      urine.current.instanceMatrix.needsUpdate = true;
    }
  });
  const label = topic === 'bph' ? ['攝護腺（橘色）', '攝護腺變大、壓迫尿道（示意）', '藥物改善尿流（示意）'][stage] : ['膀胱逐漸充滿', '膀胱不自主收縮、急尿（示意）', '膀胱訓練'][stage];
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {PELVIS.map((id) => <Part key={id} p={bones[id]} m={mats.bone} />)}
      <group ref={blG} position={bl.center}><group position={bl.center.clone().negate()}><Part p={bl} m={mats.bla} /></group></group>
      <group ref={proG} position={pro.center}><group position={pro.center.clone().negate()}><Part p={pro} m={mats.pro} /></group></group>
      <Part p={ure} m={mats.ure} /><Part p={org.FMA19387} m={mats.sv} /><Part p={org.FMA19388} m={mats.sv} />
      <instancedMesh frustumCulled={false} ref={urine} args={[undefined, undefined, 14]}><sphereGeometry args={[0.0018, 10, 8]} /><meshPhysicalMaterial color="#f5d742" transparent opacity={0.9} clearcoat={1} /></instancedMesh>
      <Html position={(topic === 'bph' ? pro.center : bl.center).clone().add(new THREE.Vector3(0.06, 0.01, 0.02))} center className="anim-label">{label}</Html>
    </group>
  );
}

/* ===================== 地中海型貧血（血管段） ===================== */
function rbcGeometry() {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24, r = 0.07 * Math.sin((t * Math.PI) / 2); pts.push(new THREE.Vector2(r, 0.012 + 0.018 * Math.pow(r / 0.07, 2) * (1 - Math.pow(r / 0.07, 8)))); }
  for (let i = 24; i >= 0; i--) { const p = pts[i]; pts.push(new THREE.Vector2(p.x, -p.y)); }
  const g = new THREE.LatheGeometry(pts, 28); g.computeVertexNormals(); return g;
}
function ThalScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const L = 4.6, R = 0.55, N = 150;
  const wall = useMemo(() => { const g = new THREE.CylinderGeometry(R, R, L, 64, 1, true, Math.PI * 0.12, Math.PI * 1.76); g.rotateZ(Math.PI / 2); return g; }, []);
  const wallMat = useMemo(() => tissue({ roughness: 0.4, clearcoat: 0.6, sheen: 0.4, sheenColor: new THREE.Color('#ffc4b8') },
    'diffuseColor.rgb = gl_FrontFacing ? vec3(0.8, 0.45, 0.42) * (0.85 + 0.2 * fbm(vP * 6.0)) : vec3(0.95, 0.78, 0.74) * (0.9 + 0.12 * fbm(vP * 9.0));'), []);
  const rbcGeo = useMemo(rbcGeometry, []);
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ x: rnd(i) * L, th: rnd(i + 300) * Math.PI * 2, r: Math.sqrt(rnd(i + 600)) * (R - 0.09), sp: 0.7 + rnd(i + 900) * 0.6, rot: rnd(i + 1200) * 6 })), []);
  const own = useRef<THREE.InstancedMesh>(null), tx = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const ownMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b3121c', roughness: 0.35, clearcoat: 0.6, sheen: 0.5, sheenColor: new THREE.Color('#ff6b6b') }), []);
  const k = useRef(1);
  const pale = useMemo(() => new THREE.Color('#d9928c'), []), red = useMemo(() => new THREE.Color('#b3121c'), []);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, stage === 0 ? 1 : 0, dt, reduce);
    ownMat.color.copy(pale).lerp(red, k.current);
    const place = (m: THREE.InstancedMesh | null, n: number, size: number, off: number) => {
      if (!m) return;
      for (let i = 0; i < N; i++) {
        const s = seeds[(i + off) % N];
        const x = ((s.x + t * 0.4 * s.sp) % L) - L / 2;
        d.position.set(x, s.r * Math.cos(s.th), s.r * Math.sin(s.th));
        d.rotation.set(s.rot + t * 0.7 * s.sp, s.rot * 2, t * 0.4 + s.rot); d.scale.setScalar(size); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      }
      m.count = n; m.instanceMatrix.needsUpdate = true;
    };
    place(own.current, Math.round(N * (0.5 + 0.5 * k.current)), 0.7 + 0.3 * k.current, 0);
    place(tx.current, stage === 2 ? 45 : 0, 1, 37);
  });
  return (
    <group rotation={[0.12, -0.32, 0]}>
      <mesh geometry={wall} material={wallMat} />
      <instancedMesh frustumCulled={false} ref={own} args={[rbcGeo, ownMat, N]} />
      <instancedMesh frustumCulled={false} ref={tx} args={[rbcGeo, undefined, N]}><meshPhysicalMaterial color="#c0141f" roughness={0.3} clearcoat={0.7} emissive="#4a0000" emissiveIntensity={0.3} /></instancedMesh>
    </group>
  );
}

/* ===================== 勃起功能障礙 ===================== */
const ILIAC = ['FMA3784', 'FMA14765', 'FMA14766', 'FMA18806', 'FMA18807', 'FMA18809', 'FMA18810'];
function EdScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', ['FMA19618', 'FMA19617nsn', 'FMA18247', 'FMA15900', 'FMA9600']);
  const ves = useParts('vessel', ILIAC);
  const bones = useParts('skeleton', PELVIS);
  const cav = org.FMA19618;
  const C = useMemo(() => new THREE.Vector3(0, 0.82, 0.01), []);
  const S = 6;
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -(0.7 - C.y) * S), [C]);
  const mats = useMemo(() => ({
    bone: tissue({ roughness: 0.55, clearcoat: 0.3, transparent: true, opacity: 0.35, depthWrite: false }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8);'),
    art: tissue({ roughness: 0.3, clearcoat: 0.8 }, 'diffuseColor.rgb = vec3(0.76, 0.22, 0.2);'),
    tis: phys('#d99a8e', { roughness: 0.4, clearcoat: 0.6, transparent: true, opacity: 0.55, depthWrite: false }),
    bla: phys('#e9c9a6', { roughness: 0.3, clearcoat: 0.8, transparent: true, opacity: 0.6 }),
  }), []);
  useEffect(() => { mats.art.clippingPlanes = [clip]; }, [mats, clip]);
  const iliac = ves.FMA14765;
  const plaques = useMemo(() => (iliac ? samplePoints(iliac.geo, 6, 3) : []), [iliac]);
  const pGeo = useMemo(() => lumpGeometry(0.0035, 5, 2), []);
  const flowPts = useMemo(() => samplePoints(cav.geo, 50, 9).map((v) => v.lerp(cav.center, 0.5)), [cav]);
  const flow = useRef<THREE.InstancedMesh>(null), plq = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const k = useRef(1);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, [1, 0.3, 0.75][stage], dt, reduce);
    if (flow.current) {
      flowPts.forEach((p, i) => { d.position.copy(p).add(new THREE.Vector3(0, Math.sin(t * 2 + i) * 0.002, 0)); d.scale.setScalar(rnd(i + 3) < k.current ? 1 : 0.0001); d.updateMatrix(); flow.current!.setMatrixAt(i, d.matrix); });
      flow.current.instanceMatrix.needsUpdate = true;
    }
    if (plq.current) {
      plaques.forEach((p, i) => { d.position.copy(p); d.scale.setScalar(stage === 1 ? 1 : stage === 2 ? 0.8 : 0.0001); d.updateMatrix(); plq.current!.setMatrixAt(i, d.matrix); });
      plq.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {PELVIS.map((id) => <Part key={id} p={bones[id]} m={mats.bone} />)}
      {ILIAC.map((id) => <Part key={id} p={ves[id]} m={mats.art} />)}
      <Part p={cav} m={mats.tis} /><Part p={org.FMA19617nsn} m={mats.tis} /><Part p={org.FMA18247} m={mats.tis} />
      <Part p={org.FMA15900} m={mats.bla} />
      <instancedMesh frustumCulled={false} ref={flow} args={[undefined, undefined, flowPts.length]}><sphereGeometry args={[0.0018, 8, 6]} /><meshPhysicalMaterial color="#d0142a" emissive="#5a0008" emissiveIntensity={0.3} /></instancedMesh>
      <instancedMesh frustumCulled={false} ref={plq} args={[pGeo, undefined, plaques.length]}><meshPhysicalMaterial color="#f0d070" roughness={0.6} /></instancedMesh>
      {stage === 1 && iliac && <Html position={iliac.center.clone().add(new THREE.Vector3(-0.05, 0.02, 0.02))} center className="anim-label">動脈斑塊、血流不足（示意）</Html>}
    </group>
  );
}

/* ===================== 男性更年期（睪固酮） ===================== */
const THIGH = ['FMA38928', 'FMA38930', 'FMA38932', 'FMA38934', 'FMA22354', 'FMA43883'];
function TestoScene({ stage, frozen }: { stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const org = useParts('organ', ['FMA7211', 'FMA7212']);
  const bones = useParts('skeleton', [...PELVIS, 'FMA24474', 'FMA24475']);
  const mus = useParts('muscle', THIGH);
  const fem = bones.FMA24474;
  const C = useMemo(() => new THREE.Vector3(0, 0.75, 0.01), []);
  const S = 3.4;
  const A = useMemo(() => new THREE.Vector3(fem.center.x, fem.box.max.y, fem.center.z), [fem]);
  const B = useMemo(() => new THREE.Vector3(fem.center.x, fem.box.min.y, fem.center.z), [fem]);
  const u = useMemo(() => ({ uK: { value: 1 }, uA: { value: A }, uB: { value: B }, uLoss: { value: 0 } }), [A, B]);
  const mats = useMemo(() => ({
    mus: tissue({ roughness: 0.45, clearcoat: 0.5, sheen: 0.6, sheenColor: new THREE.Color('#ffb0a0') },
      'diffuseColor.rgb = vec3(0.68, 0.18, 0.17) * (0.88 + 0.14 * sin(dot(vP, vec3(0.3, 1.0, 0.0)) * 700.0 + fbm(vP * 300.0) * 3.0));', u,
      'uniform float uK, uLoss; uniform vec3 uA, uB;', '',
      'vec3 ab = uB - uA; float h = clamp(dot(position - uA, ab) / dot(ab, ab), 0.0, 1.0); vec3 c = uA + ab * h; transformed = c + (position - c) * uK;'),
    bone: tissue({ roughness: 0.6, clearcoat: 0.25 },
      `vec3 b = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));
       float pore = smoothstep(0.7 - 0.2 * uLoss, 0.76 - 0.2 * uLoss, vnoise(vP * 900.0));
       diffuseColor.rgb = mix(b, vec3(0.42, 0.34, 0.28), pore * uLoss);`, u, 'uniform float uK, uLoss; uniform vec3 uA, uB;'),
    tes: phys('#e8c8b4', { roughness: 0.35, clearcoat: 0.7 }),
  }), [u]);
  const N = 40;
  const hor = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(() => new THREE.Object3D(), []);
  const targets = useMemo(() => [...samplePoints(mus.FMA38928?.geo ?? fem.geo, 20, 3), ...samplePoints(fem.geo, 20, 7)], [mus, fem]);
  const src = org.FMA7211?.center ?? C;
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    u.uK.value = ease(u.uK.value as number, [1, 0.84, 0.9][stage], dt, reduce);
    u.uLoss.value = ease(u.uLoss.value as number, [0, 0.8, 0.5][stage], dt, reduce);
    if (hor.current) {
      const n = Math.round(N * [1, 0.3, 0.55][stage]);
      for (let i = 0; i < N; i++) {
        const s = (t * 0.2 + i / N) % 1;
        d.position.copy(src).lerp(targets[i % targets.length], s);
        d.scale.setScalar(i < n ? 1 - s * 0.5 : 0.0001); d.updateMatrix(); hor.current.setMatrixAt(i, d.matrix);
      }
      hor.current.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {Object.values(bones).map((p) => <Part key={p.id} p={p} m={mats.bone} />)}
      {THIGH.map((id) => <Part key={id} p={mus[id]} m={mats.mus} />)}
      <Part p={org.FMA7211} m={mats.tes} /><Part p={org.FMA7212} m={mats.tes} />
      <instancedMesh frustumCulled={false} ref={hor} args={[undefined, undefined, N]}><sphereGeometry args={[0.003, 10, 8]} /><meshPhysicalMaterial color="#5fb8ff" emissive="#0b4a8a" emissiveIntensity={0.6} /></instancedMesh>
    </group>
  );
}

const VIEW: Record<Batch5Topic, { cam: [number, number, number]; target?: [number, number, number]; caption: string; bg?: string }> = {
  'rheumatoid-arthritis': { cam: [0.4, 0.2, 3.4], caption: '右手骨骼來自 BodyParts3D 成年男性解剖模型；關節發炎紅腫為示意。' },
  sle: { cam: [0.9, 0.2, 3.0], caption: '頭部皮膚來自 BodyParts3D 成年男性解剖模型；蝴蝶斑範圍為示意，女性較常罹患，模型僅供參考。' },
  'frailty-falls': { cam: [0.6, 0.6, 7.2], target: [0, 0.2, 0], caption: '全身骨骼來自 BodyParts3D 成年男性解剖模型；搖晃、跌倒與髖部發紅為示意。' },
  'allergic-rhinitis': { cam: [1.3, 0.1, 2.8], caption: '頭部骨骼、下鼻甲與鼻軟骨來自 BodyParts3D；花粉、鼻甲腫脹與食鹽水為示意。' },
  'hearing-loss': { cam: [-1.7, 0.9, 2.3], caption: '外耳來自 BodyParts3D；目前模型沒有內耳，耳蝸、毛細胞、聲波與助聽器為示意。' },
  'overactive-bladder': { cam: [0.9, 0.5, 3.2], caption: '膀胱、尿道與骨盆來自 BodyParts3D 成年男性解剖模型；收縮、發亮與尿流為示意。' },
  thalassemia: { cam: [0, 0.4, 4.6], caption: '剖開的血管段與紅血球為示意，數量與大小經放大簡化，不是血液檢查結果。' },
  bph: { cam: [1.2, 0.4, 3.0], caption: '膀胱、攝護腺、尿道、儲精囊與骨盆來自 BodyParts3D 成年男性解剖模型；攝護腺變大與尿流為示意。' },
  'erectile-dysfunction': { cam: [1.6, 0.3, 3.6], caption: '骨盆動脈、海綿體與膀胱來自 BodyParts3D 成年男性解剖模型；血流與斑塊為示意。' },
  'late-onset-hypogonadism': { cam: [1.6, 0.3, 4.4], caption: '睪丸、骨盆、股骨與大腿肌群來自 BodyParts3D；荷爾蒙粒子、肌肉變細與骨質變化為示意。' },
};

export default function Batch5Anims({ topic }: { topic: Batch5Topic }) {
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
            {topic === 'rheumatoid-arthritis' && <RAScene stage={stage} frozen={frozen} />}
            {topic === 'sle' && <SleScene stage={stage} frozen={frozen} />}
            {topic === 'frailty-falls' && <FallScene stage={stage} frozen={frozen} />}
            {topic === 'allergic-rhinitis' && <NoseScene stage={stage} frozen={frozen} />}
            {topic === 'hearing-loss' && <EarScene stage={stage} frozen={frozen} />}
            {(topic === 'overactive-bladder' || topic === 'bph') && <BladderScene topic={topic} stage={stage} frozen={frozen} />}
            {topic === 'thalassemia' && <ThalScene stage={stage} frozen={frozen} />}
            {topic === 'erectile-dysfunction' && <EdScene stage={stage} frozen={frozen} />}
            {topic === 'late-onset-hypogonadism' && <TestoScene stage={stage} frozen={frozen} />}
          </Suspense>
          <OrbitControls enablePan={false} enableZoom minDistance={1.2} maxDistance={9} enableDamping dampingFactor={0.1} target={v.target ?? [0, 0, 0]} />
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
