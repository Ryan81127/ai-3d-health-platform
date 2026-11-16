import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

/**
 * 氣喘與慢性阻塞性肺病的 3D 衛教示意：氣管、支氣管分支與肺泡，隨呼吸進出的氣流。
 * 幾何為程序化產生的簡化模型，不是個人肺部影像；情境文字對應 diseases.ts 已核對的內容。
 */
export type LungTopic = 'asthma' | 'copd';

const INFO: Record<LungTopic, { label: string; note: string }[]> = {
  asthma: [
    { label: '正常氣道', note: '空氣順暢進出支氣管與肺泡。' },
    { label: '氣喘發作', note: '小氣道發炎，加上周圍肌肉收縮，使氣道變窄、呼吸變得困難。' },
    { label: '使用支氣管擴張劑後（示意）', note: '支氣管擴張劑幫助打開氣道、緩解症狀；吸入型類固醇用來減少發炎。用藥需遵照醫囑。' },
  ],
  copd: [
    { label: '正常氣道與肺泡', note: '空氣經支氣管進入肺泡，進行氣體交換。' },
    { label: '慢性支氣管炎（示意）', note: '呼吸道長期發炎，造成無法恢復的呼吸道阻塞，常見咳、痰、悶、喘。' },
    { label: '肺氣腫（示意）', note: '肺氣腫是慢性阻塞性肺病的類型之一，肺部氣體交換功能變差。圖中肺泡變大、變少為示意。' },
  ],
};
const FLOW: Record<LungTopic, number[]> = { asthma: [1, 0.45, 0.85], copd: [1, 0.7, 0.5] };
const NARROW: Record<LungTopic, number[]> = { asthma: [1, 0.55, 0.9], copd: [1, 0.75, 0.85] };
const T_FROZEN = 1.6;
const N = 96;

type V3 = THREE.Vector3;
interface Seg { a: V3; b: V3; r: number; depth: number }

function buildTree() {
  const segs: Seg[] = [];
  const leaves: V3[][] = [];
  const top = new THREE.Vector3(0, 1.25, 0), carina = new THREE.Vector3(0, 0.45, 0);
  segs.push({ a: top, b: carina, r: 0.12, depth: 0 });
  const rec = (a: V3, dir: V3, len: number, r: number, depth: number, path: V3[]) => {
    const b = a.clone().add(dir.clone().multiplyScalar(len));
    segs.push({ a, b, r, depth });
    const p = [...path, b];
    if (depth === 3) { leaves.push(p); return; }
    const side = new THREE.Vector3(dir.y, -dir.x, 0).normalize();
    for (const s of [-1, 1]) {
      const nd = dir.clone().add(side.clone().multiplyScalar(0.55 * s)).add(new THREE.Vector3(0, 0, 0.3 * s * (depth % 2 ? 1 : -1))).normalize();
      rec(b, nd, len * 0.72, r * 0.72, depth + 1, p);
    }
  };
  rec(carina, new THREE.Vector3(-0.75, -0.65, 0).normalize(), 0.55, 0.085, 1, [top, carina]);
  rec(carina, new THREE.Vector3(0.75, -0.65, 0).normalize(), 0.55, 0.085, 1, [top, carina]);
  return { segs, leaves };
}

/** 沿折線取點，s 為 0–1 的路徑比例 */
function along(path: V3[], s: number, out: V3) {
  const lens = path.slice(1).map((p, i) => p.distanceTo(path[i]));
  let d = lens.reduce((x, y) => x + y, 0) * Math.min(1, Math.max(0, s));
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) return out.copy(path[i]).lerp(path[i + 1], d / lens[i]);
    d -= lens[i];
  }
  return out.copy(path[path.length - 1]);
}

function fib(n: number) {
  const out: V3[] = [], g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y); out.push(new THREE.Vector3(Math.cos(g * i) * r, y, Math.sin(g * i) * r)); }
  return out;
}

function LungScene({ topic, stage, frozen, onReadout }: { topic: LungTopic; stage: number; frozen: boolean; onReadout: (n: number) => void }) {
  const reduce = useStore((s) => s.reduceMotion);
  const { segs, leaves } = useMemo(buildTree, []);
  const segRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const cur = useRef(1);
  const pos = useMemo(() => new Float32Array(N * 3), []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g; }, [pos]);
  const pts = useRef<THREE.Points>(null);
  const mucus = useMemo(() => {
    const big = segs.filter((s) => s.depth <= 1);
    const a = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) {
      const s = big[i % big.length], u = ((i * 0.618) % 1) * 0.8 + 0.1;
      const p = s.a.clone().lerp(s.b, u).add(new THREE.Vector3(Math.sin(i * 2.1), Math.cos(i * 1.3), Math.sin(i * 0.7)).multiplyScalar(s.r * 0.45));
      a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g;
  }, [segs]);
  const sacs = useMemo(() => fib(7).map((v) => v.multiplyScalar(0.085)), []);
  const last = useRef(-10);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  const inflamed = (topic === 'asthma' && stage === 1) || (topic === 'copd' && stage >= 1);
  const emphysema = topic === 'copd' && stage === 2;

  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const k = reduce ? 1 : 1 - Math.exp(-dt * 3);
    cur.current += (NARROW[topic][stage] - cur.current) * k;
    const f = cur.current;
    segs.forEach((s, i) => {
      const m = segRefs.current[i];
      if (!m) return;
      const thick = topic === 'copd' && stage === 1 ? 1.15 : 1; // 管壁增厚（示意）
      const rr = s.depth === 0 ? s.r : s.r * f * thick;
      m.scale.set(rr, s.a.distanceTo(s.b), rr);
      (m.material as THREE.MeshStandardMaterial).color.set(inflamed && s.depth > 0 ? '#d0605a' : '#e8a5a0');
    });
    ringRefs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = topic === 'asthma' && stage === 1;
      m.scale.setScalar(segs[i].r * f * 1.25);
    });
    const flow = FLOW[topic][stage];
    const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 4.5); // 吸氣→呼氣
    for (let i = 0; i < N; i++) {
      const s = breath * flow * 1.05 - (i / N) * 0.35;
      if (s <= 0) { pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = -100; continue; }
      along(leaves[i % leaves.length], s, tmp);
      pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z;
    }
    if (pts.current) (pts.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    if (clock.elapsedTime - last.current > 0.3) { last.current = clock.elapsedTime; onReadout(Math.round(flow * 100)); }
  });

  return (
    <>
      {segs.map((s, i) => {
        const d = s.b.clone().sub(s.a);
        const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
        return (
          <mesh key={i} ref={(el) => { segRefs.current[i] = el; }} position={s.a.clone().add(s.b).multiplyScalar(0.5)} quaternion={q}>
            <cylinderGeometry args={[1, 1, 1, 14, 1, true]} />
            <meshStandardMaterial color="#e8a5a0" roughness={0.5} side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        );
      })}
      {/* 氣喘發作時氣道周圍收縮的肌肉（示意） */}
      {segs.map((s, i) => {
        const d = s.b.clone().sub(s.a).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(zAxis, d);
        return (
          <mesh key={`r${i}`} ref={(el) => { ringRefs.current[i] = el; }} position={s.a.clone().lerp(s.b, 0.5)} quaternion={q} visible={false}>
            <torusGeometry args={[1, 0.22, 8, 24]} />
            <meshStandardMaterial color="#e8871e" roughness={0.5} />
          </mesh>
        );
      })}
      {leaves.map((p, li) => {
        const end = p[p.length - 1];
        return (
          <group key={`a${li}`} position={end}>
            {!emphysema && sacs.map((o, j) => (
              <mesh key={j} position={o}><sphereGeometry args={[0.06, 14, 10]} /><meshStandardMaterial color="#f2b8b0" roughness={0.5} /></mesh>
            ))}
            {emphysema && [-1, 1].map((sgn) => (
              <mesh key={sgn} position={[sgn * 0.05, -0.02, 0]}><sphereGeometry args={[0.11, 18, 12]} /><meshStandardMaterial color="#e9c4be" roughness={0.5} transparent opacity={0.85} /></mesh>
            ))}
          </group>
        );
      })}
      <points ref={pts} geometry={geo}><pointsMaterial color="#4aa3ff" size={0.05} sizeAttenuation /></points>
      <points geometry={mucus} visible={topic === 'copd' && stage === 1}><pointsMaterial color="#f0e6b4" size={0.06} sizeAttenuation /></points>
    </>
  );
}

export default function LungAnims({ topic }: { topic: LungTopic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [flow, setFlow] = useState(100);
  const [paused, setPaused] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { setStage(0); }, [topic]);
  const info = INFO[topic][stage];
  return (
    <figure className="vessel">
      <div className="tear-canvas" role="img" aria-label={`${info.label}的衛教示意動畫`}>
        <Canvas camera={{ position: [0.4, 0.2, 3.6], fov: 34, near: 0.05, far: 30 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={['#eef3f7']} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[2, 3, 4]} intensity={1.2} />
          <LungScene topic={topic} stage={stage} frozen={frozen} onReadout={setFlow} />
          <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.1} target={[0, 0.25, 0]} />
        </Canvas>
      </div>
      <div className="seg" role="group" aria-label="情境">
        {INFO[topic].map((x, i) => <button key={x.label} className={stage === i ? 'on' : ''} aria-pressed={stage === i} onClick={() => setStage(i)}>{x.label}</button>)}
      </div>
      <div className="tear-controls">
        <div className="tear-readout"><b>{info.label}</b><span>{topic === 'asthma' ? '氣流（示意）' : '氣體交換（示意）'} {flow}%</span></div>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      <p className="small">{info.note}</p>
      <figcaption className="small">衛教示意：簡化的氣道與肺泡模型，不是個人肺部影像或肺功能檢查結果。診斷需由醫師評估。</figcaption>
    </figure>
  );
}
