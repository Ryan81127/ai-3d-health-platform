import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

/**
 * 第二型糖尿病（胰島素與葡萄糖攝取）與脂肪肝（肝細胞脂肪堆積）的 3D 衛教示意。
 * 幾何為程序化產生的簡化模型，不是個人器官或細胞的影像。階段是可能的機制，不代表每個人都會依序發生。
 */
export type MetabolicTopic = 't2dm' | 'fatty-liver';

const STAGES: Record<MetabolicTopic, { label: string; note: string }[]> = {
  't2dm': [
    { label: '0 正常血糖調節', note: '胰島素與細胞表面的受體結合，葡萄糖轉運蛋白移到細胞膜，葡萄糖進入細胞。' },
    { label: '1 胰島素反應減弱（可能）', note: '細胞對胰島素的反應下降（胰島素阻抗），能進入細胞的葡萄糖減少。' },
    { label: '2 胰臟代償分泌（可能）', note: '胰臟可能分泌更多胰島素來維持血糖，這時胰島素需求增加。' },
    { label: '3 長期高血糖（可能）', note: '血糖長期偏高，可能影響眼睛、腎臟與神經等微血管。需以抽血檢查確認，不能只靠症狀判斷。' },
  ],
  'fatty-liver': [
    { label: '0 正常肝細胞', note: '肝細胞只有少量脂肪滴，脂質代謝大致平衡。' },
    { label: '1 脂肪堆積（脂肪變性）', note: '肝細胞內的脂肪滴增加，與肥胖、血糖、血脂等代謝風險因子有關。' },
    { label: '2 可能的發炎（脂肪性肝炎）', note: '部分人的脂肪堆積可能伴隨肝臟發炎，需以檢查評估。' },
    { label: '3 可能的纖維化', note: '長期發炎可能形成纖維組織，影響肝臟功能。並非每個人都會進展到這一階段。' },
  ],
};

const T_FROZEN = 2.2;
const ACTIVE = [18, 12, 8, 7];       // 有效的葡萄糖轉運位置數（共 18）
const NR = 18;

/** 近似均勻分布在球面上的方向（Fibonacci 球面） */
function fib(n: number, r = 1) {
  const out: THREE.Vector3[] = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    out.push(new THREE.Vector3(Math.cos(g * i) * rr * r, y * r, Math.sin(g * i) * rr * r));
  }
  return out;
}

function CellScene({ stage, frozen, onReadout }: { stage: number; frozen: boolean; onReadout: (pct: number) => void }) {
  const reduce = useStore((s) => s.reduceMotion);
  const dirs = useMemo(() => fib(NR), []);
  const recs = useRef<(THREE.Mesh | null)[]>([]);
  const gPos = useMemo(() => new Float32Array(NR * 3), []);
  const gGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(gPos, 3)); return g; }, [gPos]);
  const gp = useRef<THREE.Points>(null);
  const extra = useMemo(() => fib(8, 1.7), []);
  const extraRefs = useRef<(THREE.Mesh | null)[]>([]);
  const last = useRef(-10);

  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const active = ACTIVE[stage];
    for (let i = 0; i < NR; i++) {
      const on = i < active;
      const m = recs.current[i];
      if (m) (m.material as THREE.MeshStandardMaterial).color.set(on ? '#12a594' : '#b9c3cc');
      const ph = (t * 0.2 + i * 0.0555) % 1;
      if (on) {
        const rad = 2.2 - 1.7 * ph;
        if (rad < 0.5) { gPos[i * 3] = 0; gPos[i * 3 + 1] = 0; gPos[i * 3 + 2] = -100; }
        else { gPos[i * 3] = dirs[i].x * rad; gPos[i * 3 + 1] = dirs[i].y * rad; gPos[i * 3 + 2] = dirs[i].z * rad; }
      } else {
        const rad = 1.3 + 0.35 * Math.sin(Math.PI * ph);
        gPos[i * 3] = dirs[i].x * rad; gPos[i * 3 + 1] = dirs[i].y * rad; gPos[i * 3 + 2] = dirs[i].z * rad;
      }
    }
    if (gp.current) (gp.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    // 第 2 階段起，血中胰島素增加（示意的額外胰島素分子）
    extraRefs.current.forEach((m, i) => { if (m) m.visible = stage >= 2 && i < 8; });

    if (clock.elapsedTime - last.current > 0.3) { last.current = clock.elapsedTime; onReadout(Math.round((active / NR) * 100)); }
    void dt;
  });

  return (
    <>
      <mesh>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color="#f6e9d8" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.005, 48, 32]} />
        <meshStandardMaterial color="#d9c3a3" transparent opacity={0.0} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.28, 24, 16]} />
        <meshStandardMaterial color="#7d5a3c" roughness={0.6} />
      </mesh>
      {dirs.map((d, i) => (
        <mesh key={i} ref={(el) => { recs.current[i] = el; }} position={d.clone().multiplyScalar(1.07)}>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshStandardMaterial color="#b9c3cc" roughness={0.4} />
        </mesh>
      ))}
      {/* 與受體結合的胰島素（示意） */}
      {dirs.map((d, i) => (
        <mesh key={`ins${i}`} position={d.clone().multiplyScalar(1.22)} visible={i < ACTIVE[stage]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color="#f2a33d" />
        </mesh>
      ))}
      {extra.map((v, i) => (
        <mesh key={`x${i}`} ref={(el) => { extraRefs.current[i] = el; }} position={v}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color="#f2a33d" />
        </mesh>
      ))}
      <points ref={gp} geometry={gGeo}>
        <pointsMaterial color="#2f7fe0" size={0.17} sizeAttenuation />
      </points>
    </>
  );
}

const LIVER_C: [number, number, number][] = [[-0.8, -0.1, 0], [0.8, -0.05, 0.1], [0.05, 0.75, -0.1]];
const DROP_N = 14;
const DROP_COUNT = [2, 8, 12, 12];

function LiverScene({ stage, frozen, onReadout }: { stage: number; frozen: boolean; onReadout: (pct: number) => void }) {
  const reduce = useStore((s) => s.reduceMotion);
  const drops = useMemo(() => {
    const out: { pos: THREE.Vector3; cell: number }[] = [];
    LIVER_C.forEach((c, ci) => {
      for (let k = 0; k < DROP_N; k++) {
        const a = k * 2.4 + ci;
        const rad = 0.18 + 0.36 * ((k * 0.37 + ci * 0.2) % 1);
        const y = ((k * 0.61) % 1 - 0.5) * 0.8;
        out.push({ pos: new THREE.Vector3(c[0] + Math.cos(a) * rad, c[1] + y * 0.7, c[2] + Math.sin(a) * rad), cell: ci });
      }
    });
    return out;
  }, []);
  const dropRefs = useRef<(THREE.Mesh | null)[]>([]);
  const cellRefs = useRef<(THREE.Mesh | null)[]>([]);
  const infRefs = useRef<(THREE.Mesh | null)[]>([]);
  const infPos = useMemo(() => fib(8, 0.9).map((v, i) => { const c = LIVER_C[i % 3]; return new THREE.Vector3(c[0] + v.x * 0.5, c[1] + v.y * 0.5, c[2] + v.z * 0.5); }), []);
  const strands = useMemo(() => {
    const pairs: [number, number][] = [[0, 1], [1, 2], [2, 0]];
    return pairs.map(([a, b]) => {
      const A = new THREE.Vector3(...LIVER_C[a]), B = new THREE.Vector3(...LIVER_C[b]);
      const mid = A.clone().add(B).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.3, 0.45));
      return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, mid, B), 40, 0.03, 8, false);
    });
  }, []);
  const strandRefs = useRef<(THREE.Mesh | null)[]>([]);
  const last = useRef(-10);

  useFrame(({ clock }) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const n = DROP_COUNT[stage];
    dropRefs.current.forEach((m, i) => { if (m) m.visible = (i % DROP_N) < n; });
    cellRefs.current.forEach((m, ci) => {
      if (m) (m.material as THREE.MeshStandardMaterial).color.set(stage >= 2 ? '#e9b26a' : '#f2d7a0');
      void ci;
    });
    infRefs.current.forEach((m, i) => {
      if (!m) return;
      m.visible = stage >= 2;
      m.scale.setScalar(0.85 + 0.25 * Math.sin(t * 4 + i));
    });
    strandRefs.current.forEach((m) => { if (m) m.visible = stage >= 3; });
    if (clock.elapsedTime - last.current > 0.3) { last.current = clock.elapsedTime; onReadout(Math.round((n / DROP_N) * 100)); }
  });

  return (
    <>
      {LIVER_C.map((c, ci) => (
        <group key={ci}>
          <mesh ref={(el) => { cellRefs.current[ci] = el; }} position={c}>
            <sphereGeometry args={[0.72, 40, 28]} />
            <meshStandardMaterial color="#f2d7a0" transparent opacity={0.55} depthWrite={false} />
          </mesh>
          <mesh position={[c[0] + 0.18, c[1], c[2] + 0.1]}>
            <sphereGeometry args={[0.2, 20, 14]} />
            <meshStandardMaterial color="#7d5a3c" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {drops.map((d, i) => (
        <mesh key={i} ref={(el) => { dropRefs.current[i] = el; }} position={d.pos} scale={DROP_COUNT[stage] ? 1 : 1}>
          <sphereGeometry args={[0.085, 14, 10]} />
          <meshStandardMaterial color="#f7e07a" roughness={0.3} />
        </mesh>
      ))}
      {infPos.map((p, i) => (
        <mesh key={`inf${i}`} ref={(el) => { infRefs.current[i] = el; }} position={p}>
          <sphereGeometry args={[0.055, 12, 10]} />
          <meshStandardMaterial color="#4a6fb5" />
        </mesh>
      ))}
      {strands.map((g, i) => (
        <mesh key={`s${i}`} ref={(el) => { strandRefs.current[i] = el; }} geometry={g}>
          <meshStandardMaterial color="#e8e2d2" roughness={0.7} />
        </mesh>
      ))}
    </>
  );
}

export default function MetabolismAnim({ topic }: { topic: MetabolicTopic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [pct, setPct] = useState(topic === 't2dm' ? 100 : 0);
  const [paused, setPaused] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { setStage(0); }, [topic]);
  const info = STAGES[topic][stage];
  const readLabel = topic === 't2dm' ? '細胞攝取葡萄糖（示意）' : '脂肪滴佔比（示意）';

  return (
    <figure className="vessel">
      <div className="tear-canvas" role="img" aria-label={topic === 't2dm' ? '胰島素與葡萄糖進入細胞的衛教示意動畫' : '肝細胞脂肪堆積的衛教示意動畫'}>
        <Canvas camera={{ position: [0.2, 1.0, 5.4], fov: 34, near: 0.05, far: 30 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={['#eef3f7']} />
          <ambientLight intensity={0.75} />
          <directionalLight position={[2, 3, 4]} intensity={1.2} />
          {topic === 't2dm'
            ? <CellScene stage={stage} frozen={frozen} onReadout={setPct} />
            : <LiverScene stage={stage} frozen={frozen} onReadout={setPct} />}
          <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.1} target={topic === 't2dm' ? [0, 0, 0] : [0, 0.3, 0]} />
        </Canvas>
      </div>
      <label className="stage-slider">
        <span>可能的進展階段：{info.label}</span>
        <input type="range" min={0} max={3} step={1} value={stage} onChange={(e) => setStage(Number(e.target.value))} aria-label="可能的進展階段" />
        <small>階段是示意的可能機制，不代表每個人都會依序發生。</small>
      </label>
      <div className="tear-controls">
        <div className="tear-readout"><b>{readLabel}</b><span>{pct}%</span></div>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      <p className="small">{info.note}</p>
      <figcaption className="small">衛教示意：細胞與器官為簡化模型，不是個人的影像或檢查結果。確診需由醫師依血液或影像檢查判斷。</figcaption>
    </figure>
  );
}
