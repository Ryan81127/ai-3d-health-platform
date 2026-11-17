import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

/**
 * 白內障與青光眼的 3D 衛教示意：眼球剖面（角膜、虹膜、水晶體、視網膜、視神經）、
 * 光線對焦與眼內液體循環，旁邊附「看到的畫面」示意。
 * 幾何為程序化產生的簡化模型，不是個人眼睛影像；情境文字對應 diseases.ts 已核對的內容。
 */
export type EyeTopic = 'cataract' | 'glaucoma';

const INFO: Record<EyeTopic, { label: string; note: string }[]> = {
  cataract: [
    { label: '透明水晶體', note: '水晶體是眼睛裡幫助對焦的透明構造，光線通過後清楚地落在視網膜上。（藍點＝光線，示意）' },
    { label: '水晶體混濁', note: '約 40 歲起，水晶體中的蛋白質開始分解並聚集，形成混濁區域；光線被阻擋與散射，看東西模糊、顏色變淡、燈光刺眼。' },
    { label: '人工水晶體（示意）', note: '白內障手術是移除混濁的水晶體，換上人工水晶體；10 位接受手術者中有 9 位視力改善。是否手術由眼科醫師評估。' },
  ],
  glaucoma: [
    { label: '眼內液體循環', note: '眼睛前方的液體持續產生、流動並排出。（綠點＝眼內液體，黃色＝視神經，示意）' },
    { label: '眼壓升高（示意）', note: '許多青光眼患者眼壓偏高，但最常見類型的確切原因仍不清楚，也有人眼壓高卻沒有青光眼。初期通常沒有症狀。' },
    { label: '視神經受損與視野縮小', note: '視神經受損後，視力通常從周邊（特別是靠近鼻側）慢慢喪失，進展很慢而不易察覺。治療能保護視力，但已失去的視力無法恢復。' },
  ],
};
const CLARITY: Record<EyeTopic, number[]> = { cataract: [100, 35, 92], glaucoma: [100, 85, 40] };
const T_FROZEN = 1.2;
const N_RAY = 70, N_AQ = 70;

type V3 = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
function along(path: V3[], s: number, out: V3) {
  const lens = path.slice(1).map((p, i) => p.distanceTo(path[i]));
  let d = lens.reduce((x, y) => x + y, 0) * Math.min(1, Math.max(0, s));
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) return out.copy(path[i]).lerp(path[i + 1], d / lens[i]);
    d -= lens[i];
  }
  return out.copy(path[path.length - 1]);
}
function pointsGeo(n: number) {
  const a = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  return { a, g };
}

const LENS_X = -0.45, RETINA_X = 0.97;
/** 光線路徑：遠方 → 角膜 → 水晶體 → 視網膜；白內障時部分被擋下或散射 */
function rayPaths(scatter: boolean) {
  return Array.from({ length: 9 }, (_, i) => {
    const y = -0.32 + i * 0.08;
    const focus = scatter ? v(RETINA_X * Math.cos((rnd(i) - 0.5) * 1.2), Math.sin((rnd(i) - 0.5) * 1.2) * 0.95, 0) : v(RETINA_X, 0, 0);
    return [v(-2.3, y, 0), v(-1.02, y * 0.97, 0), v(LENS_X, y * 0.9, 0), focus];
  });
}
/** 眼內液體：睫狀體 → 經過瞳孔 → 前房 → 隅角排出 */
const AQ_PATHS = [1, -1].map((s) => [v(-0.5, 0.52 * s, 0), v(-0.56, 0.22 * s, 0), v(-0.72, 0.1 * s, 0), v(-0.88, 0.32 * s, 0), v(-0.7, 0.6 * s, 0), v(-0.64, 0.74 * s, 0)]);

function EyeScene({ topic, stage, frozen, onReadout }: { topic: EyeTopic; stage: number; frozen: boolean; onReadout: (n: number) => void }) {
  const reduce = useStore((s) => s.reduceMotion);
  const P = useMemo(() => pointsGeo(N_RAY), []), A = useMemo(() => pointsGeo(N_AQ), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const nerve = useRef<THREE.Mesh>(null), cloud = useRef<THREE.Points>(null);
  const press = useRef<THREE.Group>(null);
  const nerveK = useRef(1);
  const last = useRef(-10);
  const cataract = topic === 'cataract' && stage === 1;
  const iol = topic === 'cataract' && stage === 2;
  const highP = topic === 'glaucoma' && stage >= 1;
  const rays = useMemo(() => rayPaths(cataract), [cataract]);
  const cloudGeo = useMemo(() => {
    const a = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) {
      const th = rnd(i) * Math.PI * 2, r = Math.sqrt(rnd(i + 50)) * 0.36;
      a[i * 3] = LENS_X + (rnd(i + 99) - 0.5) * 0.2; a[i * 3 + 1] = Math.cos(th) * r; a[i * 3 + 2] = Math.sin(th) * r;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g;
  }, []);

  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    // 光線（白內障主題）
    const showRays = topic === 'cataract';
    for (let i = 0; i < N_RAY; i++) {
      const path = rays[i % rays.length];
      const s = ((i / N_RAY) * 3 + t * 0.35) % 1;
      // 混濁時約一半光線停在水晶體（被擋下），其餘散射
      const blocked = cataract && i % 2 === 0;
      along(path, blocked ? Math.min(s, 0.6) : s, tmp);
      const hide = !showRays || (blocked && s > 0.6);
      P.a[i * 3] = tmp.x; P.a[i * 3 + 1] = tmp.y; P.a[i * 3 + 2] = hide ? -100 : tmp.z;
    }
    P.g.attributes.position.needsUpdate = true;

    // 眼內液體（青光眼主題）：眼壓升高時排出受阻，液體留在前房
    for (let i = 0; i < N_AQ; i++) {
      const path = AQ_PATHS[i % 2];
      let s = ((i / N_AQ) * 2 + t * 0.12) % 1;
      if (highP) s = Math.min(s, 0.62 + 0.08 * Math.sin(i * 1.7 + t)); // 停在前房（示意）
      along(path, s, tmp);
      const j = highP ? 0.04 : 0.015;
      A.a[i * 3] = tmp.x + (rnd(i) - 0.5) * j; A.a[i * 3 + 1] = tmp.y + (rnd(i + 7) - 0.5) * j;
      A.a[i * 3 + 2] = topic === 'glaucoma' ? (rnd(i + 3) - 0.5) * 0.3 : -100;
    }
    A.g.attributes.position.needsUpdate = true;

    const k = reduce ? 1 : 1 - Math.exp(-dt * 2);
    const target = topic === 'glaucoma' ? [1, 0.85, 0.4][stage] : 1;
    nerveK.current += (target - nerveK.current) * k;
    if (nerve.current) {
      const m = nerve.current.material as THREE.MeshStandardMaterial;
      m.color.set('#e7c449').lerp(new THREE.Color('#c9c3b4'), 1 - nerveK.current);
      nerve.current.scale.set(0.7 + 0.3 * nerveK.current, 1, 0.7 + 0.3 * nerveK.current);
    }
    if (press.current) {
      press.current.visible = highP;
      press.current.children.forEach((c, i) => { c.position.x = 0.35 + 0.08 * Math.sin(t * 3 + i); });
    }
    if (cloud.current) cloud.current.visible = cataract;
    if (clock.elapsedTime - last.current > 0.4) { last.current = clock.elapsedTime; onReadout(CLARITY[topic][stage]); }
  });

  return (
    <>
      {/* 鞏膜（剖面，只顯示後半） */}
      <mesh><sphereGeometry args={[1, 40, 28, Math.PI, Math.PI]} /><meshStandardMaterial color="#f4f1ec" roughness={0.6} side={THREE.DoubleSide} transparent opacity={0.55} depthWrite={false} /></mesh>
      {/* 視網膜 */}
      <mesh scale={0.97}><sphereGeometry args={[1, 40, 28, Math.PI, Math.PI / 2, 0.25, Math.PI - 0.5]} /><meshStandardMaterial color="#e58b6f" roughness={0.6} side={THREE.DoubleSide} /></mesh>
      {/* 角膜 */}
      <mesh position={[-0.5, 0, 0]}><sphereGeometry args={[0.55, 32, 24, -Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.25, Math.PI * 0.5]} /><meshStandardMaterial color="#bfe3f5" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      {/* 虹膜 */}
      <mesh position={[-0.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}><ringGeometry args={[0.17, 0.62, 40]} /><meshStandardMaterial color="#6d4a2e" side={THREE.DoubleSide} transparent opacity={0.8} /></mesh>
      {/* 水晶體／人工水晶體 */}
      {!iol && (
        <mesh position={[LENS_X, 0, 0]} scale={[0.17, 0.4, 0.4]}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial color={cataract ? '#e6d49a' : '#e8f4fb'} transparent opacity={cataract ? 0.92 : 0.4} roughness={cataract ? 0.9 : 0.1} depthWrite={false} />
        </mesh>
      )}
      {iol && (
        <group position={[LENS_X, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.24, 0.24, 0.07, 32]} /><meshStandardMaterial color="#e8f4fb" transparent opacity={0.55} /></mesh>
          {[1, -1].map((s) => <mesh key={s} position={[0, 0.3 * s, 0]} rotation={[0, Math.PI / 2, s > 0 ? 0 : Math.PI]}><torusGeometry args={[0.12, 0.012, 6, 16, Math.PI]} /><meshStandardMaterial color="#5a8bd6" /></mesh>)}
        </group>
      )}
      <points ref={cloud} geometry={cloudGeo} visible={false}><pointsMaterial color="#c9b26b" size={0.05} sizeAttenuation /></points>
      {/* 視神經 */}
      <mesh ref={nerve} position={[1.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.2, 0.6, 20]} /><meshStandardMaterial color="#e7c449" roughness={0.6} /></mesh>
      {/* 眼壓升高時，壓力向後推向視神經（示意） */}
      <group ref={press} visible={false}>
        {[-0.25, 0, 0.25].map((y, i) => (
          <mesh key={i} position={[0.35, y, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.05, 0.16, 12]} /><meshStandardMaterial color="#e8871e" /></mesh>
        ))}
      </group>
      <points geometry={P.g}><pointsMaterial color="#2f7de1" size={0.05} sizeAttenuation /></points>
      <points geometry={A.g}><pointsMaterial color="#2bb673" size={0.04} sizeAttenuation /></points>
    </>
  );
}

/** 「看到的畫面」示意：白內障模糊與色彩變淡；青光眼周邊（偏鼻側）視野縮小 */
function ViewSim({ topic, stage }: { topic: EyeTopic; stage: number }) {
  const filter = topic === 'cataract' && stage === 1 ? 'blur(2.5px) sepia(0.55) contrast(0.7) brightness(1.08)' : 'none';
  const mask: CSSProperties | null = topic === 'glaucoma' && stage === 2
    ? { background: 'radial-gradient(ellipse 42% 58% at 60% 50%, transparent 55%, rgba(12,14,18,0.94) 100%)' }
    : null;
  return (
    <div className="eye-view" aria-hidden>
      <svg viewBox="0 0 160 90" style={{ filter }}>
        <rect width="160" height="90" fill="#9fd3f2" />
        <circle cx="128" cy="18" r="9" fill="#ffd54a" />
        <rect y="58" width="160" height="32" fill="#7cb87a" />
        <polygon points="70,90 90,90 84,58 76,58" fill="#b9b2a6" />
        <rect x="24" y="38" width="30" height="22" fill="#f2e3c6" /><polygon points="21,40 39,26 57,40" fill="#c0504a" /><rect x="35" y="48" width="7" height="12" fill="#6d4a2e" />
        <rect x="112" y="40" width="5" height="20" fill="#6d4a2e" /><circle cx="114" cy="36" r="11" fill="#3f8f4a" />
      </svg>
      {mask && <div className="eye-mask" style={mask} />}
      <span>看到的畫面（示意）</span>
    </div>
  );
}

export default function EyeAnims({ topic }: { topic: EyeTopic }) {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [clarity, setClarity] = useState(100);
  const [paused, setPaused] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { setStage(0); }, [topic]);
  const info = INFO[topic][stage];
  return (
    <figure className="vessel">
      <div className="tear-canvas eye-wrap" role="img" aria-label={`${info.label}的衛教示意動畫`}>
        <Canvas camera={{ position: [-0.3, 0.6, 4.4], fov: 34, near: 0.05, far: 30 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <color attach="background" args={['#eef3f7']} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[-2, 3, 4]} intensity={1.1} />
          <EyeScene topic={topic} stage={stage} frozen={frozen} onReadout={setClarity} />
          <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.1} target={[-0.3, 0, 0]} />
        </Canvas>
        <ViewSim topic={topic} stage={stage} />
      </div>
      <div className="seg" role="group" aria-label="情境">
        {INFO[topic].map((x, i) => <button key={x.label} className={stage === i ? 'on' : ''} aria-pressed={stage === i} onClick={() => setStage(i)}>{x.label}</button>)}
      </div>
      <div className="tear-controls">
        <div className="tear-readout"><b>{info.label}</b><span>{topic === 'cataract' ? '影像清晰度（示意）' : '視神經纖維（示意）'} {clarity}%</span></div>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      <p className="small">{info.note}</p>
      <figcaption className="small">衛教示意：簡化的眼球剖面（光線由左方進入，右眼），不是個人眼睛影像或視野檢查結果。診斷需要散瞳眼科檢查。</figcaption>
    </figure>
  );
}
