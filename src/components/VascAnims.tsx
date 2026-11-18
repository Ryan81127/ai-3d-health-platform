import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { centerline, useParts } from '../three/partGeometry';
import StudioLights from '../three/StudioLights';
import { Part, lumpGeometry, phys, rnd, tissue } from '../three/tissue';

/**
 * 靜脈曲張、深部靜脈血栓、淋巴水腫的 3D 衛教示意。
 * 右腿骨骼、小腿肌肉、動脈與皮膚來自 BodyParts3D；模型沒有下肢靜脈與淋巴管，
 * 因此深層靜脈（沿動脈旁）、表淺靜脈、淋巴管、血栓與淋巴液為程式繪製的示意。
 * 情境文字對應 diseases.ts 已核對的 MedlinePlus 內容。
 */
export type VascTopic = 'varicose-veins' | 'dvt' | 'lymphedema';

const INFO: Record<VascTopic, { label: string; note: string }[]> = {
  'varicose-veins': [
    { label: '靜脈與單向瓣膜（示意）', note: '靜脈有單向瓣膜，幫助血液流回心臟。（藍色為皮膚下的表淺靜脈，示意；右腿骨骼、肌肉與動脈來自解剖模型）' },
    { label: '瓣膜無力、血液回堵（示意）', note: '瓣膜無力或受損時，血液回堵並淤積在靜脈中，使靜脈腫脹扭曲，形成靜脈曲張。' },
    { label: '運動、抬腿、避免久站', note: '運動、減重、休息時抬高腿、坐時不翹腳，穿寬鬆衣物並避免長時間站立，可以避免惡化。' },
  ],
  dvt: [
    { label: '深層靜脈的血流（示意）', note: '深層靜脈伴隨動脈走在肌肉之間，把血液送回心臟。（深藍色為深層靜脈，示意）' },
    { label: '血栓形成（示意）', note: '深部靜脈血栓多數發生在小腿或大腿；長時間不動會增加風險。可能出現發熱、壓痛、疼痛腫脹、皮膚發紅。' },
    { label: '血栓脫落：肺栓塞（示意）', note: '血栓可能脫落，隨血流到肺部造成肺栓塞。突然呼吸困難、胸痛或咳血時，請立即撥打 119。' },
  ],
  lymphedema: [
    { label: '淋巴液回流（示意）', note: '淋巴液含有對抗病菌的白血球，沿淋巴管回流。（綠色為淋巴管與淋巴液，示意）' },
    { label: '淋巴回流受阻、腫脹（示意）', note: '淋巴系統受損或阻塞時，淋巴液堆積在軟組織，造成腫脹，通常在手臂或腿部。原因包括感染、癌症、放射治療或淋巴結手術等。' },
    { label: '運動與壓力衣（示意）', note: '治療可以控制症狀，包括運動、壓力裝置（如壓力衣）、皮膚照顧與按摩。' },
  ],
};
const T_FROZEN = 1.6;
const ease = (cur: number, target: number, dt: number, reduce: boolean, rate = 0.9) => (reduce ? target : cur + (target - cur) * (1 - Math.exp(-dt * rate)));
const ARTS = ['BP4-Right-femoral-artery', 'BP4-Right-popliteal-artery', 'BP4-Right-posterior-tibial-artery', 'BP4-Right-anterior-tibial-artery'];

function LegScene({ topic, stage, frozen }: { topic: VascTopic; stage: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const bones = useParts('skeleton', ['FMA24474', 'FMA24477', 'FMA24480', 'FMA24486']);
  const mus = useParts('muscle', ['FMA22558', 'FMA45957', 'FMA45960', 'FMA22544']);
  const ves = useParts('bp4-vessel', ARTS);
  const skin = useParts('skin', ['FMA7163']).FMA7163;
  const C = useMemo(() => new THREE.Vector3(-0.085, topic === 'dvt' ? 0.42 : 0.38, 0), [topic]);
  const S = 3.2;
  const u = useMemo(() => ({ uSw: { value: 0 }, uSock: { value: 0 }, uLegX: { value: -0.06 } }), []);
  const mats = useMemo(() => ({
    bone: tissue({ roughness: 0.55, clearcoat: 0.3 }, 'diffuseColor.rgb = vec3(0.93, 0.89, 0.8) * (0.85 + 0.2 * fbm(vP * 600.0));'),
    mus: phys('#b33a33', { transparent: true, opacity: topic === 'dvt' ? 0.14 : 0.2, depthWrite: false, roughness: 0.5 }),
    art: phys('#c23a33', { roughness: 0.3, clearcoat: 0.8 }),
    skin: tissue({ transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color('#ffd9c4') },
      'diffuseColor.rgb = mix(vec3(0.93, 0.76, 0.64), vec3(0.85, 0.8, 0.78), uSock * smoothstep(0.62, 0.58, vP.y));', u, 'uniform float uSw, uSock, uLegX;', '',
      'float leg = smoothstep(0.62, 0.3, position.y) * step(position.x, uLegX); transformed += objectNormal * uSw * 0.028 * leg;'),
  }), [u, topic]);
  const clip = useMemo(() => [new THREE.Plane(new THREE.Vector3(-1, 0, 0), (-0.035 - C.x) * S), new THREE.Plane(new THREE.Vector3(0, -1, 0), (0.95 - C.y) * S)], [C]);
  useEffect(() => { mats.skin.clippingPlanes = clip; }, [mats, clip]);

  // 深層靜脈：沿股動脈→膕動脈→脛後動脈旁（示意）
  const deep = useMemo(() => {
    const pts = ['BP4-Right-posterior-tibial-artery', 'BP4-Right-popliteal-artery', 'BP4-Right-femoral-artery']
      .flatMap((id) => (ves[id] ? centerline(ves[id].geo, 'y', 8) : []))
      .sort((a, b) => a.y - b.y).map((p) => p.clone().add(new THREE.Vector3(0.006, 0, -0.006)));
    return new THREE.CatmullRomCurve3(pts);
  }, [ves]);
  // 表淺靜脈：沿腿部內側皮膚下（示意）
  const superficial = useMemo(() => {
    const p = skin.geo.attributes.position, v = new THREE.Vector3();
    const pts: THREE.Vector3[] = [];
    for (let y = 0.1; y <= 0.82; y += 0.06) {
      let best: THREE.Vector3 | null = null;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (Math.abs(v.y - y) < 0.012 && v.x < -0.03 && v.x > -0.16 && (!best || v.x > best.x)) best = v.clone(); }
      if (best) pts.push(best.add(new THREE.Vector3(-0.006, 0, 0.004)));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [skin]);
  const deepGeo = useMemo(() => new THREE.TubeGeometry(deep, 80, 0.0045, 12, false), [deep]);
  const supU = useMemo(() => ({ uVar: { value: 0 } }), []);
  const supGeo = useMemo(() => new THREE.TubeGeometry(superficial, 160, 0.0026, 12, false), [superficial]);
  const supMat = useMemo(() => tissue({ roughness: 0.35, clearcoat: 0.8 }, 'diffuseColor.rgb = mix(vec3(0.3, 0.38, 0.75), vec3(0.32, 0.22, 0.58), uVar);', supU, 'uniform float uVar;', '',
    'float tw = sin(position.y * 160.0) * 0.006 + sin(position.y * 63.0 + 1.0) * 0.004; transformed += vec3(tw, 0.0, tw * 0.6) * uVar + objectNormal * uVar * (0.0025 + 0.002 * sin(position.y * 230.0));'), [supU]);
  const lymph = useMemo(() => [0, 1].map((k) => {
    const c = superficial.getPoints(14).map((p, i) => p.clone().add(new THREE.Vector3(k ? -0.03 : -0.015, 0, k ? 0.025 : 0.035 + 0.003 * Math.sin(i))));
    return new THREE.CatmullRomCurve3(c);
  }), [superficial]);
  const lymphGeos = useMemo(() => lymph.map((c) => new THREE.TubeGeometry(c, 60, 0.0016, 8, false)), [lymph]);

  const parts = useRef<THREE.InstancedMesh>(null), clot = useRef<THREE.Mesh>(null), emb = useRef<THREE.Mesh>(null), valves = useRef<THREE.InstancedMesh>(null);
  const clotGeo = useMemo(() => lumpGeometry(0.006, 4, 3), []);
  const d = useMemo(() => new THREE.Object3D(), []);
  const N = 40;
  const k = useRef(0);
  useEffect(() => {
    const m = valves.current; if (!m) return;
    for (let i = 0; i < 8; i++) {
      const s = 0.08 + i * 0.11, p = superficial.getPointAt(s), tg = superficial.getTangentAt(s);
      d.position.copy(p); d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tg); d.scale.setScalar(1); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [superficial, d]);
  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    k.current = ease(k.current, stage >= 1 ? 1 : 0, dt, reduce);
    supU.uVar.value = topic === 'varicose-veins' ? (stage === 1 ? k.current : stage === 2 ? 0.75 : 0) : 0;
    u.uSw.value = topic === 'lymphedema' ? ease(u.uSw.value as number, [0, 1, 0.45][stage], dt, reduce) : 0;
    u.uSock.value = topic === 'lymphedema' && stage === 2 ? 1 : 0;
    // 血液或淋巴液粒子
    if (parts.current) {
      const curve = topic === 'dvt' ? deep : topic === 'lymphedema' ? lymph[0] : superficial;
      for (let i = 0; i < N; i++) {
        let s = (t * 0.1 + i / N) % 1;
        if (topic === 'varicose-veins' && stage === 1) s = 0.25 + 0.15 * Math.sin(t * 1.2 + i) * (rnd(i) - 0.2) + (i / N) * 0.5; // 回堵、來回晃動
        if (topic === 'dvt' && stage >= 1) s = Math.min(s, 0.28 - rnd(i) * 0.12);                                   // 血栓下方堆積
        if (topic === 'lymphedema' && stage === 1) s = Math.min(s, 0.55 - rnd(i) * 0.35);                            // 淋巴回流受阻
        d.position.copy(curve.getPointAt(Math.min(0.999, Math.max(0, s))));
        d.quaternion.identity(); d.scale.setScalar(1); d.updateMatrix(); parts.current.setMatrixAt(i, d.matrix);
      }
      parts.current.instanceMatrix.needsUpdate = true;
      (parts.current.material as THREE.MeshPhysicalMaterial).color.set(topic === 'lymphedema' ? '#9fe08a' : '#3b4fb8');
    }
    const clotAt = deep.getPointAt(0.3);
    if (clot.current) { clot.current.visible = topic === 'dvt' && stage >= 1; clot.current.position.copy(clotAt); clot.current.scale.setScalar(Math.max(0.01, k.current) * (stage === 2 ? 0.8 : 1)); }
    if (emb.current) {
      const ph = (t % 5) / 5;
      emb.current.visible = topic === 'dvt' && stage === 2;
      emb.current.position.copy(deep.getPointAt(Math.min(0.999, 0.32 + ph * 0.67)));
    }
  });
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      {Object.values(bones).map((p) => <Part key={p.id} p={p} m={mats.bone} />)}
      {Object.values(mus).map((p) => <Part key={p.id} p={p} m={mats.mus} />)}
      {ARTS.map((id) => <Part key={id} p={ves[id]} m={mats.art} />)}
      <Part p={skin} m={mats.skin} />
      {topic === 'dvt' && <mesh geometry={deepGeo}><meshPhysicalMaterial color="#2f3f9e" roughness={0.3} clearcoat={0.8} transparent opacity={0.7} /></mesh>}
      {topic === 'varicose-veins' && <>
        <mesh geometry={supGeo} material={supMat} />
        <instancedMesh frustumCulled={false} ref={valves} args={[undefined, undefined, 8]}><torusGeometry args={[0.0028, 0.0008, 8, 20]} /><meshPhysicalMaterial color="#cfd8ff" /></instancedMesh>
      </>}
      {topic === 'lymphedema' && lymphGeos.map((g, i) => <mesh key={i} geometry={g}><meshPhysicalMaterial color="#7fcf6a" roughness={0.3} transparent opacity={0.7} /></mesh>)}
      <instancedMesh frustumCulled={false} ref={parts} args={[undefined, undefined, N]}><sphereGeometry args={[0.0022, 10, 8]} /><meshPhysicalMaterial color="#3b4fb8" roughness={0.2} clearcoat={1} /></instancedMesh>
      <mesh ref={clot} geometry={clotGeo} visible={false}><meshPhysicalMaterial color="#4a0b0e" roughness={0.8} /></mesh>
      <mesh ref={emb} visible={false}><sphereGeometry args={[0.0035, 12, 8]} /><meshPhysicalMaterial color="#4a0b0e" /></mesh>
      {topic === 'dvt' && stage >= 1 && <Html position={deep.getPointAt(stage === 2 ? 0.8 : 0.3).clone().add(new THREE.Vector3(0.02, 0, -0.04))} center className="anim-label">{stage === 2 ? '↑ 血栓往肺部（示意）' : '小腿深層靜脈血栓（示意）'}</Html>}
      {topic === 'varicose-veins' && stage === 1 && <Html position={superficial.getPointAt(0.3).clone().add(new THREE.Vector3(0.05, 0, 0.03))} center className="anim-label">靜脈腫脹扭曲（示意）</Html>}
      {topic === 'lymphedema' && stage >= 1 && <Html position={[-0.02, 0.3, 0.06]} center className="anim-label">{stage === 1 ? '淋巴液堆積、腫脹（示意）' : '壓力衣（示意）'}</Html>}
    </group>
  );
}

export default function VascAnims({ topic }: { topic: VascTopic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { setStage(0); }, [topic]);
  const info = INFO[topic][stage];
  return (
    <figure className="vessel">
      <div className="tear-canvas tall" role="img" aria-label={`${info.label}的衛教示意動畫`}>
        <Canvas key={topic} camera={{ position: topic === 'dvt' ? [-1.2, 0.3, -3.4] : [1.6, 0.4, 3.6], fov: 34, near: 0.02, far: 40 }} dpr={[1, 2]} gl={{ antialias: true, localClippingEnabled: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <color attach="background" args={['#101c2b']} />
          <StudioLights />
          <Suspense fallback={null}><LegScene topic={topic} stage={stage} frozen={frozen} /></Suspense>
          <OrbitControls enablePan={false} enableZoom minDistance={1.2} maxDistance={8} enableDamping dampingFactor={0.1} />
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
      <figcaption className="small">衛教示意：右腿骨骼、小腿肌肉、動脈與皮膚來自 BodyParts3D 成年男性解剖模型；模型沒有下肢靜脈與淋巴管，靜脈、瓣膜、淋巴管、血栓與液體為程式繪製的示意。可拖曳旋轉、滾輪縮放。診斷需由醫師評估。</figcaption>
    </figure>
  );
}
