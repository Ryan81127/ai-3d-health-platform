import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

/**
 * 血管與血壓的 3D 衛教示意（高血壓、動脈粥狀硬化）。
 * 幾何為程序化產生的簡化血管段，不是個人血管影像。所有情境都是可能的機制，不是每個人都會依序發生。
 */
export type VesselTopic = 'hypertension' | 'atherosclerosis';
type HMode = 'normal' | 'constrict' | 'remodel';

const HYP: Record<HMode, { r: number; wall: number; label: string; note: string }> = {
  normal: { r: 0.42, wall: 0.06, label: '正常血管', note: '血管彈性良好，血流阻力低。' },
  constrict: { r: 0.3, wall: 0.07, label: '血管收縮', note: '小動脈收縮、管腔變窄，血流阻力上升；同樣的血量需要更大的推力（示意）。' },
  remodel: { r: 0.36, wall: 0.16, label: '長期高血壓可能造成的血管重塑', note: '長期血壓偏高時，動脈壁可能增厚、管腔變窄。進展速度因人而異，並非每個人都會發生。' },
};
const STAGES = [
  { label: '0 正常內皮', note: '內皮細胞平滑完整，調節血管舒張，減少血球黏附。' },
  { label: '1 LDL 進入血管壁', note: 'LDL 脂蛋白可能進入內皮下層並被修飾，引發發炎反應。' },
  { label: '2 發炎與泡沫細胞', note: '單核球進入血管壁轉為巨噬細胞，吞噬脂質後形成泡沫細胞。' },
  { label: '3 斑塊形成', note: '脂質與細胞堆積形成斑塊，管腔逐漸變窄。' },
  { label: '4 斑塊破裂與血栓（可能機制）', note: '部分斑塊可能破裂引發血栓，阻塞血流。這是可能的機制，並非每個斑塊都會發生。' },
];

const L = 2.4;
const N = 90;      // 血球示意點數
const NL = 26;     // LDL 示意點數
const CLR = { blood: '#c5222f', wall: '#f2cfc6', plaque: '#e9d27a', foam: '#f7eaa4', ldl: '#ffb84d', clot: '#5a0f18' };

function tube() {
  const g = new THREE.CylinderGeometry(1, 1, L, 48, 1, true);
  g.rotateX(Math.PI / 2); // 血管軸向改為 z
  return g;
}

function Scene({ topic, hMode, stage, frozen, onReadout }: {
  topic: VesselTopic; hMode: HMode; stage: number; frozen: boolean; onReadout: (flow: number) => void;
}) {
  const reduce = useStore((s) => s.reduceMotion);
  const lumen = useRef<THREE.Mesh>(null);
  const wall = useRef<THREE.Mesh>(null);
  const plaque = useRef<THREE.Mesh>(null);
  const clot = useRef<THREE.Mesh>(null);
  const foam = useRef<THREE.Group>(null);
  const blood = useRef<THREE.Points>(null);
  const ldl = useRef<THREE.Points>(null);
  const cur = useRef({ r: 0.42, wall: 0.06 });
  const lastRead = useRef(-10);

  const geo = useMemo(tube, []);
  const bpos = useMemo(() => new Float32Array(N * 3), []);
  const bseed = useMemo(() => Array.from({ length: N }, (_, i) => ({ z: (i / N) * L, a: (i * 2.399) % (2 * Math.PI), rr: 0.25 + ((i * 37) % 17) / 30, sp: 0.8 + ((i * 13) % 9) / 14 })), []);
  const lpos = useMemo(() => new Float32Array(NL * 3), []);
  const lseed = useMemo(() => Array.from({ length: NL }, (_, i) => ({ z: (i / NL) * L, a: Math.PI / 2 + ((i * 0.9) % 1.3) - 0.65, ph: (i * 0.618) % 1 })), []);
  const bGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(bpos, 3)); return g; }, [bpos]);
  const lGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(lpos, 3)); return g; }, [lpos]);
  const foamSpots = useMemo(() => [[-0.12, 0.02], [0.05, -0.06], [0.14, 0.05], [-0.04, 0.12], [0.1, -0.14], [-0.15, -0.08]], []);

  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? 2.4 : clock.elapsedTime;
    const tgt = topic === 'hypertension' ? HYP[hMode] : { r: 0.42, wall: 0.06 };
    const k = reduce ? 1 : 1 - Math.exp(-dt * 2.5);
    cur.current.r += (tgt.r - cur.current.r) * k;
    cur.current.wall += (tgt.wall - cur.current.wall) * k;
    const r = cur.current.r, w = cur.current.wall;

    if (lumen.current) lumen.current.scale.set(r, r, 1);
    if (wall.current) wall.current.scale.set(r + w, r + w, 1);

    // 血流速度 ∝ 1/管腔截面積（示意）
    const flow = Math.min(3, (0.42 / r) ** 2);
    for (let i = 0; i < N; i++) {
      const s = bseed[i];
      const z = (((s.z + t * 0.7 * s.sp * flow) % L) + L) % L - L / 2;
      bpos[i * 3] = Math.cos(s.a) * r * s.rr;
      bpos[i * 3 + 1] = Math.sin(s.a) * r * s.rr;
      bpos[i * 3 + 2] = z;
    }
    if (blood.current) (blood.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // 斑塊與 LDL（僅動脈粥狀硬化）
    const f = topic === 'atherosclerosis' ? stage / 4 : 0;
    if (plaque.current) {
      plaque.current.visible = f > 0;
      plaque.current.scale.set(0.3 * f + 0.001, 0.2 * f + 0.001, 0.22 * f + 0.001);
      plaque.current.position.set(0, 0.42 - 0.03, 0);
    }
    if (foam.current) foam.current.visible = topic === 'atherosclerosis' && stage >= 2;
    if (clot.current) {
      clot.current.visible = topic === 'atherosclerosis' && stage >= 4;
      clot.current.position.set(0.02, 0.3, 0.05);
    }
    const ldlOn = topic === 'atherosclerosis' && stage >= 1;
    for (let i = 0; i < NL; i++) {
      const s = lseed[i];
      const p = (t * 0.35 + s.ph) % 1;
      const rad = r * (0.95 - 0.12 * Math.sin(Math.PI * p)); // 由管腔走向管壁
      lpos[i * 3] = Math.cos(s.a) * rad;
      lpos[i * 3 + 1] = Math.sin(s.a) * rad;
      lpos[i * 3 + 2] = s.z - L / 2 + 0.25 * Math.sin(s.ph * 6);
    }
    if (ldl.current) {
      (ldl.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      ldl.current.visible = ldlOn;
    }

    if (clock.elapsedTime - lastRead.current > 0.25) {
      lastRead.current = clock.elapsedTime;
      onReadout(Math.round(flow * 100));
    }
  });

  return (
    <>
      <color attach="background" args={['#eef3f7']} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 3, 4]} intensity={1.2} />
      <mesh ref={lumen} geometry={geo} rotation={[0, 0, 0]}>
        <meshStandardMaterial color={CLR.blood} transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={wall} geometry={geo}>
        <meshStandardMaterial color={CLR.wall} transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
      <points ref={blood} geometry={bGeo}>
        <pointsMaterial color="#ff6b6b" size={0.07} sizeAttenuation transparent opacity={0.95} />
      </points>
      <mesh ref={plaque} position={[0, 0.39, 0]}>
        <sphereGeometry args={[1, 32, 20]} />
        <meshStandardMaterial color={CLR.plaque} roughness={0.5} />
      </mesh>
      <group ref={foam}>
        {foamSpots.map(([x, z], i) => (
          <mesh key={i} position={[x, 0.36, z]}>
            <sphereGeometry args={[0.045, 16, 12]} />
            <meshStandardMaterial color={CLR.foam} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <mesh ref={clot} visible={false}>
        <sphereGeometry args={[0.14, 24, 16]} />
        <meshStandardMaterial color={CLR.clot} roughness={0.6} />
      </mesh>
      <points ref={ldl} geometry={lGeo} visible={false}>
        <pointsMaterial color={CLR.ldl} size={0.06} sizeAttenuation />
      </points>
      <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.1} />
    </>
  );
}

export default function VesselFlow({ topic }: { topic: VesselTopic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [hMode, setHMode] = useState<HMode>('normal');
  const [stage, setStage] = useState(0);
  const [flow, setFlow] = useState(100);
  const [paused, setPaused] = useState(false);
  const frozen = paused || reduce;
  const note = topic === 'hypertension' ? HYP[hMode].note : STAGES[stage].note;
  const title = topic === 'hypertension' ? HYP[hMode].label : STAGES[stage].label;

  return (
    <figure className="vessel">
      <div className="tear-canvas" role="img" aria-label="血管與血流的衛教示意動畫">
        <Canvas camera={{ position: [1.5, 0.9, 2.7], fov: 34, near: 0.05, far: 30 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <Scene topic={topic} hMode={hMode} stage={stage} frozen={frozen} onReadout={setFlow} />
        </Canvas>
      </div>
      {topic === 'hypertension' ? (
        <div className="seg" role="group" aria-label="血管情境">
          {(Object.keys(HYP) as HMode[]).map((m) => (
            <button key={m} className={hMode === m ? 'on' : ''} aria-pressed={hMode === m} onClick={() => setHMode(m)}>{HYP[m].label.replace('長期高血壓可能造成的', '').replace('血管', '血管')}</button>
          ))}
        </div>
      ) : (
        <label className="stage-slider">
          <span>可能的進展階段：{STAGES[stage].label}</span>
          <input type="range" min={0} max={4} step={1} value={stage} onChange={(e) => setStage(Number(e.target.value))} aria-label="動脈粥狀硬化的可能階段" />
          <small>階段只是示意的可能順序，不代表每個人都會依序發生。</small>
        </label>
      )}
      <div className="tear-controls">
        <div className="tear-readout"><b>{title}</b><span>示意血流速度 {flow}%</span></div>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      <p className="small">{note}</p>
      <figcaption className="small">衛教示意：血流速度與管腔粗細為簡化示意，不是個人血管的影像或量測結果。血壓與血管狀況需由醫師評估。</figcaption>
    </figure>
  );
}
