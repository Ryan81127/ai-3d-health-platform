import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

/**
 * 心房顫動與心臟衰竭的 3D 衛教示意：四個心腔、電訊號與血流。
 * 幾何為程序化產生的簡化模型，不是個人心臟影像；情境文字對應 diseases.ts 已核對的內容。
 */
export type HeartTopic = 'atrial-fibrillation' | 'heart-failure';

const INFO: Record<HeartTopic, { label: string; note: string }[]> = {
  'atrial-fibrillation': [
    { label: '正常心律', note: '電訊號從右心房上方的起搏點出發，依序讓心房、心室收縮，心跳規則。（黃色光點＝電訊號，示意）' },
    { label: '心房顫動', note: '心跳不規則、有時快很多，上下心腔無法協調運作，心室無法充分充血與送血。是否為心房顫動需以心電圖確認。' },
    { label: '血液淤積與血塊（示意）', note: '血液可能淤積在心臟裡，增加形成血塊的風險；血塊隨血流到腦部，可能造成中風。圖中血塊位置與大小為示意。' },
  ],
  'heart-failure': [
    { label: '正常打血', note: '心臟規律收縮，把含氧血液送到全身。（紅點＝含氧血，藍點＝回心的血液，示意）' },
    { label: '打血不足', note: '心臟衰竭是心臟無法打出足夠的含氧血液，不是心臟停止跳動。左心可能變得無力，或變得太厚太硬而無法充分充血。' },
    { label: '血液回堵與積水（示意）', note: '血液流經心臟變慢，回心的血管發生回堵，液體滲入組織造成水腫；可能出現喘、平躺難睡、腳踝或小腿腫脹。' },
  ],
};
const OUT: Record<HeartTopic, number[]> = { 'atrial-fibrillation': [100, 80, 80], 'heart-failure': [100, 55, 45] };
const T_FROZEN = 0.35;
const IRREGULAR = [0.55, 0.95, 0.4, 0.75, 0.5, 1.15, 0.45, 0.62];
const IRR_SUM = IRREGULAR.reduce((a, b) => a + b, 0);

type V3 = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const RA = v(-0.48, 0.48, 0.05), LA = v(0.45, 0.52, -0.12), RV = v(-0.33, -0.25, 0.12), LV = v(0.33, -0.3, 0);
const SA = v(-0.6, 0.76, 0.12), AV = v(-0.02, 0.12, 0.14);
const RIGHT: V3[] = [v(-0.58, 1.3, 0.05), v(-0.5, 0.55, 0.05), v(-0.33, 0.02, 0.16), v(-0.3, -0.5, 0.16), v(-0.12, 0.1, 0.26), v(-0.06, 0.78, 0.22), v(-0.5, 1.02, 0.12), v(-1.15, 0.85, 0)];
const LEFT: V3[] = [v(1.15, 0.72, -0.1), v(0.48, 0.52, -0.12), v(0.34, 0.05, 0), v(0.34, -0.72, 0.04), v(0.14, 0.02, 0.08), v(0.12, 0.88, 0), v(0.34, 1.18, -0.05), v(0.68, 0.95, -0.12), v(0.74, 0.1, -0.22)];
const EMBOLUS: V3[] = [v(0.8, 0.64, 0.1), v(0.48, 0.52, -0.12), v(0.34, 0.05, 0), v(0.34, -0.6, 0.04), v(0.14, 0.02, 0.08), v(0.12, 0.88, 0), v(0.3, 1.16, -0.04), v(0.32, 1.72, -0.04)];
const SIGNAL: V3[] = [SA, v(-0.4, 0.45, 0.14), AV, v(0, -0.3, 0.2), v(0.02, -0.78, 0.18)];
const N_R = 34, N_L = 44, N_SPARK = 40, N_FLUID = 60;

function along(path: V3[], s: number, out: V3) {
  const lens = path.slice(1).map((p, i) => p.distanceTo(path[i]));
  let d = lens.reduce((x, y) => x + y, 0) * Math.min(1, Math.max(0, s));
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) return out.copy(path[i]).lerp(path[i + 1], d / lens[i]);
    d -= lens[i];
  }
  return out.copy(path[path.length - 1]);
}
const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

function pointsGeo(n: number) {
  const a = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  return { a, g };
}

function Tube({ path, r, color }: { path: V3[]; r: number; color: string }) {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 40, r, 12, false), [path, r]);
  return <mesh geometry={geo}><meshStandardMaterial color={color} roughness={0.5} transparent opacity={0.55} depthWrite={false} /></mesh>;
}

function HeartScene({ topic, stage, frozen, onReadout }: { topic: HeartTopic; stage: number; frozen: boolean; onReadout: (s: string) => void }) {
  const reduce = useStore((s) => s.reduceMotion);
  const ch = useRef<Record<string, THREE.Object3D | null>>({});
  const sa = useRef<THREE.Mesh>(null), avn = useRef<THREE.Mesh>(null), sig = useRef<THREE.Mesh>(null);
  const clot = useRef<THREE.Mesh>(null), emb = useRef<THREE.Mesh>(null);
  const R = useMemo(() => pointsGeo(N_R), []), L = useMemo(() => pointsGeo(N_L), []);
  const S = useMemo(() => pointsGeo(N_SPARK), []), F = useMemo(() => pointsGeo(N_FLUID), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const lvGrow = useRef(1);
  const last = useRef(-10);
  const afib = topic === 'atrial-fibrillation' && stage >= 1;
  const weak = topic === 'heart-failure' && stage >= 1;
  const backup = topic === 'heart-failure' && stage === 2;

  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    // 收縮節律：正常為規則的心房→心室；心房顫動時心房顫抖、心室不規則跳動
    let a = 0, vv = 0, rate = '規則';
    if (!afib) {
      const P = weak ? 0.9 : 1.0, ph = (t % P) / P;
      a = ph < 0.15 ? Math.sin((ph / 0.15) * Math.PI) : 0;
      vv = ph > 0.2 && ph < 0.5 ? Math.sin(((ph - 0.2) / 0.3) * Math.PI) : 0;
      if (sa.current) (sa.current.material as THREE.MeshStandardMaterial).emissiveIntensity = ph < 0.1 ? 2 : 0.2;
      if (avn.current) (avn.current.material as THREE.MeshStandardMaterial).emissiveIntensity = ph > 0.1 && ph < 0.22 ? 2 : 0.2;
      if (sig.current) { sig.current.visible = ph < 0.4; along(SIGNAL, ph / 0.4, sig.current.position); }
      S.g.setDrawRange(0, 0);
    } else {
      rate = '不規則';
      a = 0.3 + 0.3 * Math.sin(t * 37) * Math.sin(t * 13);
      let tt = t % IRR_SUM, k = 0;
      while (tt > IRREGULAR[k]) { tt -= IRREGULAR[k]; k++; }
      vv = tt < 0.28 ? Math.sin((tt / 0.28) * Math.PI) : 0;
      if (sa.current) (sa.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
      if (avn.current) (avn.current.material as THREE.MeshStandardMaterial).emissiveIntensity = tt < 0.08 ? 1.6 : 0.2;
      if (sig.current) sig.current.visible = false;
      // 心房內雜亂的電訊號（示意）
      const seed = Math.floor(t * 14);
      for (let i = 0; i < N_SPARK; i++) {
        const c = i % 2 ? LA : RA;
        S.a[i * 3] = c.x + (rnd(seed * 97 + i) - 0.5) * 0.48;
        S.a[i * 3 + 1] = c.y + (rnd(seed * 31 + i * 7) - 0.5) * 0.42;
        S.a[i * 3 + 2] = c.z + (rnd(seed * 13 + i * 3) - 0.5) * 0.4;
      }
      S.g.setDrawRange(0, N_SPARK);
      S.g.attributes.position.needsUpdate = true;
    }
    const k = reduce ? 1 : 1 - Math.exp(-dt * 2.5);
    lvGrow.current += ((weak ? 1.2 : 1) - lvGrow.current) * k;
    const amp = weak ? 0.05 : 0.14;
    const set = (id: string, base: number, c: number) => ch.current[id]?.scale.setScalar(base * (1 - c));
    set('ra', 1, 0.1 * a); set('la', 1, 0.1 * a);
    set('rv', 1, amp * vv); set('lv', lvGrow.current, amp * vv);

    // 血流：送出量越低，粒子越慢
    const out = OUT[topic][stage] / 100;
    for (let i = 0; i < N_R; i++) {
      along(RIGHT, ((i / N_R) + t * 0.16 * (0.5 + 0.5 * out)) % 1, tmp);
      R.a[i * 3] = tmp.x; R.a[i * 3 + 1] = tmp.y; R.a[i * 3 + 2] = tmp.z;
    }
    for (let i = 0; i < N_L; i++) {
      let s = ((i / N_L) + t * 0.15 * out) % 1;
      if (backup) s = Math.pow(s, 1.8); // 回堵：粒子擠在進入心臟前的血管（示意）
      along(LEFT, s, tmp);
      L.a[i * 3] = tmp.x; L.a[i * 3 + 1] = tmp.y; L.a[i * 3 + 2] = tmp.z;
    }
    R.g.attributes.position.needsUpdate = true; L.g.attributes.position.needsUpdate = true;

    // 肺部積水（示意）
    if (backup) {
      const n = frozen || reduce ? N_FLUID : Math.min(N_FLUID, Math.floor((clock.elapsedTime % 12) * 8) + 10);
      for (let i = 0; i < N_FLUID; i++) {
        const sx = i % 2 ? 1.38 : -1.38;
        F.a[i * 3] = sx + (rnd(i * 3.1) - 0.5) * 0.55;
        F.a[i * 3 + 1] = 0.18 + rnd(i * 5.7) * 0.42;
        F.a[i * 3 + 2] = (rnd(i * 9.3) - 0.5) * 0.45;
      }
      F.g.setDrawRange(0, n);
      F.g.attributes.position.needsUpdate = true;
    } else F.g.setDrawRange(0, 0);

    // 血塊：淤積處逐漸形成，偶爾隨血流往腦部（示意）
    const clotOn = topic === 'atrial-fibrillation' && stage === 2;
    if (clot.current) { clot.current.visible = clotOn; clot.current.scale.setScalar(frozen || reduce ? 1 : Math.min(1, 0.4 + (clock.elapsedTime % 8) / 5)); }
    if (emb.current) {
      const ph = (t % 8) / 8;
      emb.current.visible = clotOn && ph > 0.55;
      if (emb.current.visible) along(EMBOLUS, (ph - 0.55) / 0.45, emb.current.position);
    }
    if (clock.elapsedTime - last.current > 0.4) {
      last.current = clock.elapsedTime;
      onReadout(topic === 'atrial-fibrillation' ? `心跳節律（示意）：${rate}` : `送出血量（示意）：${OUT[topic][stage]}%`);
    }
  });

  const wall = (color: string) => <meshStandardMaterial color={color} roughness={0.45} transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} />;
  return (
    <>
      <mesh ref={(e) => { ch.current.ra = e; }} position={RA}><sphereGeometry args={[0.3, 28, 20]} />{wall('#b55a63')}</mesh>
      <mesh ref={(e) => { ch.current.la = e; }} position={LA}><sphereGeometry args={[0.28, 28, 20]} />{wall('#c86a62')}</mesh>
      <mesh position={[0.8, 0.64, 0.1]}><sphereGeometry args={[0.1, 16, 12]} />{wall('#c86a62')}</mesh>
      <group ref={(e) => { ch.current.rv = e; }} position={RV}>
        <mesh scale={[0.4, 0.55, 0.38]}><sphereGeometry args={[1, 28, 20]} />{wall('#a9505c')}</mesh>
      </group>
      <group ref={(e) => { ch.current.lv = e; }} position={LV}>
        <mesh scale={[0.44, 0.64, 0.44]}><sphereGeometry args={[1, 28, 20]} />{wall('#c0504a')}</mesh>
      </group>
      <Tube path={[v(0.12, 0.2, 0), v(0.12, 0.88, 0), v(0.34, 1.18, -0.05), v(0.68, 0.95, -0.12), v(0.74, 0.1, -0.22)]} r={0.09} color="#d0605a" />
      <Tube path={[v(0.3, 1.14, -0.04), v(0.32, 1.72, -0.04)]} r={0.04} color="#d0605a" />
      <Tube path={[v(-0.1, 0.25, 0.24), v(-0.06, 0.78, 0.22), v(-0.5, 1.02, 0.12), v(-1.0, 0.88, 0)]} r={0.08} color="#7d86c4" />
      <Tube path={[v(-0.58, 1.35, 0.05), v(-0.52, 0.7, 0.05)]} r={0.08} color="#7d86c4" />
      <Tube path={[v(1.1, 0.72, -0.1), v(0.6, 0.56, -0.12)]} r={0.06} color="#d0605a" />
      <mesh position={[0.32, 1.84, -0.04]}><sphereGeometry args={[0.13, 20, 14]} /><meshStandardMaterial color="#e9b9c0" roughness={0.6} transparent opacity={topic === 'atrial-fibrillation' ? 0.8 : 0} /></mesh>
      <mesh ref={sa} position={SA}><sphereGeometry args={[0.045, 14, 10]} /><meshStandardMaterial color="#ffd54a" emissive="#ffb300" emissiveIntensity={0.2} /></mesh>
      <mesh ref={avn} position={AV}><sphereGeometry args={[0.04, 14, 10]} /><meshStandardMaterial color="#ffd54a" emissive="#ffb300" emissiveIntensity={0.2} /></mesh>
      <mesh ref={sig}><sphereGeometry args={[0.04, 12, 8]} /><meshBasicMaterial color="#fff176" /></mesh>
      <mesh ref={clot} position={[0.8, 0.64, 0.1]} visible={false}><sphereGeometry args={[0.07, 14, 10]} /><meshStandardMaterial color="#5a0f12" roughness={0.8} /></mesh>
      <mesh ref={emb} visible={false}><sphereGeometry args={[0.035, 12, 8]} /><meshStandardMaterial color="#5a0f12" /></mesh>
      {topic === 'heart-failure' && [-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.38, 0.55, 0]} scale={[0.42, 0.68, 0.38]}><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color="#f0c4c0" transparent opacity={0.28} depthWrite={false} /></mesh>
      ))}
      <points geometry={R.g}><pointsMaterial color="#5b7fe0" size={0.07} sizeAttenuation /></points>
      <points geometry={L.g}><pointsMaterial color="#e53935" size={0.07} sizeAttenuation /></points>
      <points geometry={S.g}><pointsMaterial color="#fff176" size={0.05} sizeAttenuation /></points>
      <points geometry={F.g}><pointsMaterial color="#64b5f6" size={0.06} sizeAttenuation transparent opacity={0.85} /></points>
    </>
  );
}

export default function HeartAnims({ topic }: { topic: HeartTopic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [readout, setReadout] = useState('');
  const [paused, setPaused] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { setStage(0); }, [topic]);
  const info = INFO[topic][stage];
  return (
    <figure className="vessel">
      <div className="tear-canvas" role="img" aria-label={`${info.label}的衛教示意動畫`}>
        <Canvas camera={{ position: [0, 0.5, 5.2], fov: 34, near: 0.05, far: 30 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={['#eef3f7']} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 3, 4]} intensity={1.1} />
          <HeartScene topic={topic} stage={stage} frozen={frozen} onReadout={setReadout} />
          <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.1} target={[0, 0.45, 0]} />
        </Canvas>
      </div>
      <div className="seg" role="group" aria-label="情境">
        {INFO[topic].map((x, i) => <button key={x.label} className={stage === i ? 'on' : ''} aria-pressed={stage === i} onClick={() => setStage(i)}>{x.label}</button>)}
      </div>
      <div className="tear-controls">
        <div className="tear-readout"><b>{info.label}</b><span>{readout}</span></div>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      <p className="small">{info.note}</p>
      <figcaption className="small">衛教示意：簡化的四個心腔模型（前方視角，畫面左側為右心），不是個人心臟影像或心電圖結果。診斷需由醫師評估。</figcaption>
    </figure>
  );
}
