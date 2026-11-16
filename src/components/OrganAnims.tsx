import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

/**
 * 腦中風、慢性腎臟病、骨質疏鬆症的 3D 衛教示意。
 * 幾何為程序化產生的簡化模型，不是個人器官影像；情境文字對應 diseases.ts 已核對的內容。
 */
export type OrganAnimTopic = 'stroke' | 'ckd' | 'osteoporosis';

const INFO = {
  stroke: [
    { label: '正常血流', note: '血液經由腦部血管持續供應氧氣與養分。' },
    { label: '缺血性中風', note: '血塊阻塞腦部血管，下游腦組織得不到血流；約佔中風的 80%。' },
    { label: '出血性中風', note: '腦部血管破裂出血，血液流進腦組織。' },
  ],
  ckd: [
    { label: '0 正常過濾', note: '腎絲球的微血管過濾血液，形成原尿，排出廢物與多餘水分。' },
    { label: '1 微血管受損（可能）', note: '血壓、血糖或血脂長期控制不好，可能傷害腎絲球的血管壁。' },
    { label: '2 腎絲球硬化（可能）', note: '高血糖可能導致腎絲球硬化與腎元破壞，過濾功能下降。' },
    { label: '3 廢物與水分堆積（可能）', note: '腎臟無法正常過濾時，廢物與多餘水分可能堆積在體內。早期大多沒有症狀，需靠血液與尿液檢查發現。' },
  ],
  osteoporosis: [
    { label: '骨量高峰（約 20–30 歲）', note: '骨小樑密集交織，骨骼堅固。' },
    { label: '骨量逐漸減少', note: '骨量在高峰後逐漸減少，女性停經後流失加快。' },
    { label: '骨質疏鬆', note: '骨流失過多，骨骼形成許多孔隙，變脆、變弱；輕微跌倒就可能骨折。' },
  ],
} as const;

const T_FROZEN = 3.0;

/* ---------- 腦中風：腦部血管與血流 ---------- */
const BRANCH_PTS: [number, number, number][][] = [
  [[0, -0.4, 0.15], [-0.45, -0.1, 0.4], [-0.75, 0.35, 0.35]],
  [[0, -0.4, 0.15], [0.05, 0.2, 0.5], [0, 0.75, 0.35]],
  [[0, -0.4, 0.15], [0.45, -0.05, 0.4], [0.75, 0.3, 0.3]],
];
const NS = 120;

function StrokeScene({ mode, frozen }: { mode: number; frozen: boolean }) {
  const reduce = useStore((s) => s.reduceMotion);
  const trunk = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(0, -1.4, 0.15), new THREE.Vector3(0, -0.9, 0.1), new THREE.Vector3(0, -0.4, 0.15)]), []);
  const branches = useMemo(() => BRANCH_PTS.map((pts) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)))), []);
  const tubes = useMemo(() => [new THREE.TubeGeometry(trunk, 32, 0.06, 10, false), ...branches.map((c) => new THREE.TubeGeometry(c, 32, 0.045, 10, false))], [trunk, branches]);
  const pos = useMemo(() => new Float32Array(NS * 3), []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g; }, [pos]);
  const pts = useRef<THREE.Points>(null);
  const clotPos = useMemo(() => branches[1].getPoint(0.45), [branches]);
  const poolPos = useMemo(() => branches[2].getPoint(0.55), [branches]);
  const pool = useRef<THREE.Mesh>(null);
  const zone = useRef<THREE.Mesh>(null);
  const zoneMat = useRef<THREE.MeshStandardMaterial>(null);
  const start = useRef(0);
  useEffect(() => { start.current = -1; }, [mode]);
  useEffect(() => () => tubes.forEach((g) => g.dispose()), [tubes]);

  useFrame(({ clock }) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    if (start.current < 0) start.current = clock.elapsedTime;
    const since = frozen || reduce ? 2 : clock.elapsedTime - start.current;
    const v = new THREE.Vector3();
    for (let i = 0; i < NS; i++) {
      const b = i % 3;
      const s = ((i * 0.618) % 1 + t * 0.25) % 2; // 0–1 主幹，1–2 分支
      if (s < 1) trunk.getPoint(s, v);
      else {
        let u = s - 1;
        if (mode === 1 && b === 1 && u > 0.43) u = 0.43 - ((i * 0.37) % 1) * 0.08; // 血塊前堆積
        branches[b].getPoint(u, v);
        if (mode === 2 && b === 2 && u > 0.55 && i % 2 === 0) {
          v.copy(poolPos).add(new THREE.Vector3(Math.sin(i * 1.7), Math.cos(i * 2.3), Math.sin(i * 0.9)).multiplyScalar(0.12));
        }
      }
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
    if (pts.current) (pts.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    if (pool.current) { pool.current.visible = mode === 2; pool.current.scale.setScalar(Math.min(1, 0.35 + since * 0.25)); }
    if (zone.current && zoneMat.current) {
      const target = mode === 1 ? BRANCH_PTS[1][2] : BRANCH_PTS[2][2];
      zone.current.position.set(...target);
      zone.current.visible = mode !== 0;
      zoneMat.current.opacity = Math.min(0.55, 0.15 + since * 0.15);
    }
  });

  return (
    <>
      <mesh position={[0, 0.15, 0]} scale={[1.15, 0.9, 1.0]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color="#e7b8b0" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {tubes.map((g, i) => (
        <mesh key={i} geometry={g}><meshStandardMaterial color="#c5222f" roughness={0.45} /></mesh>
      ))}
      <points ref={pts} geometry={geo}><pointsMaterial color="#ff8080" size={0.06} sizeAttenuation /></points>
      <mesh position={clotPos} visible={mode === 1}>
        <sphereGeometry args={[0.085, 20, 14]} />
        <meshStandardMaterial color="#3d0a10" roughness={0.7} />
      </mesh>
      <mesh ref={pool} position={poolPos} visible={false}>
        <sphereGeometry args={[0.22, 24, 16]} />
        <meshStandardMaterial color="#8b0d1a" transparent opacity={0.85} />
      </mesh>
      <mesh ref={zone} visible={false}>
        <sphereGeometry args={[0.32, 24, 16]} />
        <meshStandardMaterial ref={zoneMat} color="#5b4a7a" transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

/* ---------- 慢性腎臟病：腎絲球過濾 ---------- */
function knotPoint(u: number, out: THREE.Vector3, p = 3, q = 5, r = 0.45) {
  const cu = Math.cos(u), su = Math.sin(u), qp = (q / p) * u, cs = Math.cos(qp);
  return out.set(r * (2 + cs) * 0.5 * cu, r * (2 + cs) * su * 0.5, r * Math.sin(qp) * 0.5);
}
const NB = 70, NF = 30, NW = 24;
const FILTER = [1, 0.7, 0.4, 0.25];

function KidneyScene({ stage, frozen, onReadout }: { stage: number; frozen: boolean; onReadout: (n: number) => void }) {
  const reduce = useStore((s) => s.reduceMotion);
  const knot = useRef<THREE.Mesh>(null);
  const bPos = useMemo(() => new Float32Array(NB * 3), []);
  const fPos = useMemo(() => new Float32Array(NF * 3), []);
  const wPos = useMemo(() => {
    const a = new Float32Array(NW * 3);
    for (let i = 0; i < NW; i++) { const th = i * 2.399, y = ((i * 0.618) % 1) * 2 - 1; const r = Math.sqrt(1 - y * y) * 1.45; a[i * 3] = Math.cos(th) * r; a[i * 3 + 1] = y * 1.2; a[i * 3 + 2] = Math.sin(th) * r; }
    return a;
  }, []);
  const mk = (arr: Float32Array) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); return g; };
  const bGeo = useMemo(() => mk(bPos), [bPos]);
  const fGeo = useMemo(() => mk(fPos), [fPos]);
  const wGeo = useMemo(() => mk(wPos), [wPos]);
  const bp = useRef<THREE.Points>(null), fp = useRef<THREE.Points>(null), wp = useRef<THREE.Points>(null);
  const last = useRef(-10);
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    for (let i = 0; i < NB; i++) {
      knotPoint(((i / NB + t * 0.05) % 1) * Math.PI * 6, v);
      bPos[i * 3] = v.x; bPos[i * 3 + 1] = v.y; bPos[i * 3 + 2] = v.z;
    }
    if (bp.current) (bp.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    const rate = FILTER[stage];
    for (let i = 0; i < NF; i++) {
      const on = i / NF < rate;
      const ph = (t * 0.3 + i * 0.137) % 1;
      if (!on) { fPos[i * 3] = 0; fPos[i * 3 + 1] = 0; fPos[i * 3 + 2] = -100; continue; }
      knotPoint(i * 0.9, v).multiplyScalar(1.15);
      const outlet = new THREE.Vector3(0, -0.95, 0);
      const pnt = ph < 0.6 ? v.clone().lerp(outlet, ph / 0.6) : new THREE.Vector3(0, -0.95 - (ph - 0.6) * 1.6, 0);
      fPos[i * 3] = pnt.x; fPos[i * 3 + 1] = pnt.y; fPos[i * 3 + 2] = pnt.z;
    }
    if (fp.current) (fp.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    if (wp.current) wp.current.visible = stage >= 3;
    if (knot.current) (knot.current.material as THREE.MeshStandardMaterial).color.set(['#c5222f', '#a83a3a', '#8a6060', '#7d6a6a'][stage]);
    if (clock.elapsedTime - last.current > 0.3) { last.current = clock.elapsedTime; onReadout(Math.round(rate * 100)); }
  });

  return (
    <>
      <mesh>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color="#cfe3f5" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={knot}>
        <torusKnotGeometry args={[0.45, 0.075, 220, 14, 3, 5]} />
        <meshStandardMaterial color="#c5222f" roughness={0.45} />
      </mesh>
      <mesh position={[-1.25, 0.35, 0]} rotation={[0, 0, Math.PI / 2.4]}>
        <cylinderGeometry args={[0.08, 0.08, 0.9, 16]} />
        <meshStandardMaterial color="#c5222f" />
      </mesh>
      <mesh position={[1.25, 0.35, 0]} rotation={[0, 0, -Math.PI / 2.4]}>
        <cylinderGeometry args={[0.065, 0.065, 0.9, 16]} />
        <meshStandardMaterial color="#9b1d28" />
      </mesh>
      <mesh position={[0, -1.3, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.7, 16, 1, true]} />
        <meshStandardMaterial color="#f2e2a0" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <points ref={bp} geometry={bGeo}><pointsMaterial color="#ff8a8a" size={0.06} sizeAttenuation /></points>
      <points ref={fp} geometry={fGeo}><pointsMaterial color="#f2c230" size={0.07} sizeAttenuation /></points>
      <points ref={wp} geometry={wGeo} visible={false}><pointsMaterial color="#6b6b6b" size={0.08} sizeAttenuation /></points>
    </>
  );
}

/* ---------- 骨質疏鬆症：骨小樑 ---------- */
const GRID = 6;
const REMOVE = [0, 0.35, 0.65];
const RADIUS = [0.05, 0.04, 0.028];

function BoneScene({ stage, onReadout }: { stage: number; onReadout: (n: number) => void }) {
  const inst = useRef<THREE.InstancedMesh>(null);
  const struts = useMemo(() => {
    const h = (a: number, b: number, c: number) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
    const P = (i: number, j: number, k: number) => new THREE.Vector3(
      (i / (GRID - 1) - 0.5) * 1.6 + (h(i, j, k) - 0.5) * 0.14,
      (j / (GRID - 1) - 0.5) * 1.6 + (h(j, k, i) - 0.5) * 0.14,
      (k / (GRID - 1) - 0.5) * 1.6 + (h(k, i, j) - 0.5) * 0.14);
    const out: { a: THREE.Vector3; b: THREE.Vector3; r: number }[] = [];
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) for (let k = 0; k < GRID; k++) {
      const a = P(i, j, k);
      if (i + 1 < GRID) out.push({ a, b: P(i + 1, j, k), r: h(i + 0.3, j, k) });
      if (j + 1 < GRID) out.push({ a, b: P(i, j + 1, k), r: h(i, j + 0.3, k) });
      if (k + 1 < GRID) out.push({ a, b: P(i, j, k + 1), r: h(i, j, k + 0.3) });
    }
    return out;
  }, []);

  useEffect(() => {
    const m = inst.current;
    if (!m) return;
    const o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
    let shown = 0;
    struts.forEach((s, i) => {
      const on = s.r >= REMOVE[stage];
      const d = s.b.clone().sub(s.a);
      o.position.copy(s.a).add(s.b).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(up, d.clone().normalize());
      const r = on ? RADIUS[stage] : 0;
      o.scale.set(r, on ? d.length() : 0, r);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (on) shown++;
    });
    m.instanceMatrix.needsUpdate = true;
    onReadout(Math.round((shown / struts.length) * 100));
  }, [stage, struts, onReadout]);

  return (
    <>
      <instancedMesh ref={inst} args={[undefined, undefined, struts.length]}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial color="#e9dcc0" roughness={0.6} />
      </instancedMesh>
      <mesh>
        <cylinderGeometry args={[1.25, 1.25, 1.95, 40, 1, true]} />
        <meshStandardMaterial color="#f3ead6" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

export default function OrganAnims({ topic }: { topic: OrganAnimTopic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [readout, setReadout] = useState(100);
  const [paused, setPaused] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { setStage(0); }, [topic]);
  const info = INFO[topic][stage];
  const max = INFO[topic].length - 1;
  const readLabel = topic === 'ckd' ? '過濾功能（示意）' : topic === 'osteoporosis' ? '骨小樑密度（示意）' : '';

  return (
    <figure className="vessel">
      <div className="tear-canvas" role="img" aria-label={`${info.label}的衛教示意動畫`}>
        <Canvas camera={{ position: topic === 'osteoporosis' ? [2.6, 1.6, 3.6] : [0.3, 0.4, 4.4], fov: 34, near: 0.05, far: 30 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={['#eef3f7']} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[2, 3, 4]} intensity={1.2} />
          {topic === 'stroke' && <StrokeScene mode={stage} frozen={frozen} />}
          {topic === 'ckd' && <KidneyScene stage={stage} frozen={frozen} onReadout={setReadout} />}
          {topic === 'osteoporosis' && <BoneScene stage={stage} onReadout={setReadout} />}
          <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.1}
            autoRotate={topic === 'osteoporosis' && !frozen} autoRotateSpeed={0.8} />
        </Canvas>
      </div>
      {topic === 'stroke' ? (
        <div className="seg" role="group" aria-label="中風類型">
          {INFO.stroke.map((x, i) => <button key={x.label} className={stage === i ? 'on' : ''} aria-pressed={stage === i} onClick={() => setStage(i)}>{x.label}</button>)}
        </div>
      ) : (
        <label className="stage-slider">
          <span>{topic === 'ckd' ? '可能的變化階段' : '骨量變化'}：{info.label}</span>
          <input type="range" min={0} max={max} step={1} value={stage} onChange={(e) => setStage(Number(e.target.value))} aria-label="階段" />
          <small>階段是示意的可能變化，不代表每個人都會依序發生。</small>
        </label>
      )}
      <div className="tear-controls">
        <div className="tear-readout"><b>{info.label}</b>{readLabel && <span>{readLabel} {readout}%</span>}</div>
        {topic !== 'osteoporosis' && <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>}
      </div>
      <p className="small">{info.note}</p>
      <figcaption className="small">衛教示意：簡化模型，不是個人器官的影像或檢查結果。診斷需由醫師依檢查判斷。</figcaption>
    </figure>
  );
}
