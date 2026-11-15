import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';

/**
 * 淚膜與眨眼的 3D 衛教示意。幾何為程序化產生的簡化眼球，不是個人眼睛的影像或量測。
 * 時間循環：眨眼 → 淚膜重新鋪展 → 兩次眨眼之間淚膜逐漸變薄（蒸發），變薄處形成乾燥區。
 */
type Mode = 'normal' | 'dry';
export interface Readout { thick: number; dryness: number; blinking: boolean }

const P = { normal: 4.0, dry: 5.2 };         // 一個循環的秒數（示意）
const BLINK_S = 0.45;                         // 眨眼閉合時間（示意）
const FROZEN = { normal: 1.2, dry: 3.9 };    // 減少動態時顯示的代表畫面
const CLR = { sclera: '#f3efe6', cornea: '#bfe3f2', iris: '#4f7a6a', pupil: '#101820', lipid: '#f2d675', aqueous: '#7fc4e8', mucin: '#9fd8a6', lid: '#e0b08c', spot: '#c9742f' };
const LID_R = 1.06;
const N = 30;

/** 以 +z 為正面的球冠；sphere 的極點原本在 +y，旋轉後朝向眼睛正面 */
function cap(r: number, half: number) {
  const g = new THREE.SphereGeometry(r, 56, 24, 0, Math.PI * 2, 0, half);
  g.rotateX(Math.PI / 2);
  return g;
}
/** 眼瞼：橫跨眼睛正面的弧線，位於角膜上緣（sign=1）或下緣（sign=-1）；閉眼時繞 x 軸旋轉下壓或上提 */
function lidGeo(sign: 1 | -1) {
  const y0 = sign * 0.52;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const x = LID_R * 0.95 * Math.sin(-1.1 + (2.2 * i) / 24);
    pts.push(new THREE.Vector3(x, y0, Math.sqrt(Math.max(0.05, LID_R * LID_R - x * x - y0 * y0))));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.1, 12, false);
}

function Eye({ mode, frozen, onReadout }: { mode: Mode; frozen: boolean; onReadout: (r: Readout) => void }) {
  const reduce = useStore((s) => s.reduceMotion);
  const aq = useRef<THREE.Mesh>(null);
  const lp = useRef<THREE.Mesh>(null);
  const up = useRef<THREE.Group>(null);
  const lo = useRef<THREE.Group>(null);
  const spot = useRef<THREE.Mesh>(null);
  const spotMat = useRef<THREE.MeshBasicMaterial>(null);
  const dots = useRef<THREE.Points>(null);
  const dotMat = useRef<THREE.PointsMaterial>(null);
  const last = useRef(-10);

  const pos = useMemo(() => new Float32Array(N * 3), []);
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ a: i * 2.399, k: (i * 0.618) % 1 })), []);
  const dotGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g; }, [pos]);
  const upGeo = useMemo(() => lidGeo(1), []);
  const loGeo = useMemo(() => lidGeo(-1), []);
  const spotDir = useMemo(() => new THREE.Vector3(0.05, 0.22, 1).normalize(), []);
  const spotPos = useMemo(() => spotDir.clone().multiplyScalar(1.105), [spotDir]); // 位於最外層淚膜之上
  const spotQ = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), spotDir), [spotDir]);

  useFrame(({ clock }) => {
    const per = P[mode];
    const t = frozen || reduce ? FROZEN[mode] : clock.elapsedTime;
    const u = (t % per) / per;
    const bStart = 1 - BLINK_S / per;
    const blink = u > bStart ? Math.sin((Math.PI * (u - bStart)) / (1 - bStart)) : 0; // 0→1→0
    const d = mode === 'dry' ? Math.min(1, u / bStart) : 0;                           // 蒸發進度
    const thick = 1 - 0.5 * d + 0.5 * d * blink;                                      // 眨眼時鋪回完整厚度

    if (up.current) up.current.rotation.x = blink;
    if (lo.current) lo.current.rotation.x = -blink;
    if (aq.current) aq.current.scale.setScalar((1.03 + 0.04 * thick) / 1.07);
    if (lp.current) lp.current.scale.setScalar((1.05 + 0.04 * thick) / 1.09);

    const sv = THREE.MathUtils.clamp((d - 0.35) / 0.5, 0, 1) * (1 - blink);
    if (spot.current) spot.current.scale.setScalar(0.5 + 0.5 * sv);
    if (spotMat.current) spotMat.current.opacity = sv * 0.9;
    if (dotMat.current) dotMat.current.opacity = THREE.MathUtils.clamp((d - 0.3) / 0.5, 0, 1) * (1 - blink) * 0.85;
    for (let i = 0; i < N; i++) {
      const s = seeds[i];
      const life = (t * 0.45 + s.k) % 1;
      const r = 1.08 + life * 0.5;
      pos[i * 3] = spotDir.x * (r + 0.02) + Math.cos(s.a) * life * 0.12;
      pos[i * 3 + 1] = spotDir.y * r + Math.sin(s.a) * life * 0.12;
      pos[i * 3 + 2] = spotDir.z * (r + 0.02);
    }
    if (dots.current) (dots.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    if (clock.elapsedTime - last.current > 0.2) {
      last.current = clock.elapsedTime;
      onReadout({ thick: Math.round(thick * 100), dryness: Math.round(d * 100), blinking: blink > 0.05 });
    }
  });

  return (
    <>
      <color attach="background" args={['#eef3f7']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={1.2} />
      <mesh>
        <sphereGeometry args={[1, 64, 48]} />
        <meshStandardMaterial color={CLR.sclera} roughness={0.45} />
      </mesh>
      <mesh geometry={cap(1.03, 0.5)}>
        <meshStandardMaterial color={CLR.cornea} transparent opacity={0.22} depthWrite={false} roughness={0.1} />
      </mesh>
      <mesh geometry={cap(1.035, 0.24)}>
        <meshStandardMaterial color={CLR.iris} roughness={0.5} />
      </mesh>
      <mesh geometry={cap(1.04, 0.1)}>
        <meshStandardMaterial color={CLR.pupil} roughness={0.3} />
      </mesh>
      {/* 淚膜由內到外：黏液層、水液層、脂質層 */}
      <mesh geometry={cap(1.05, 0.62)}>
        <meshStandardMaterial color={CLR.mucin} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={aq} geometry={cap(1.07, 0.62)}>
        <meshStandardMaterial color={CLR.aqueous} transparent opacity={0.36} depthWrite={false} />
      </mesh>
      <mesh ref={lp} geometry={cap(1.09, 0.62)}>
        <meshStandardMaterial color={CLR.lipid} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh ref={spot} position={spotPos} quaternion={spotQ}>
        <circleGeometry args={[0.17, 32]} />
        <meshBasicMaterial ref={spotMat} color={CLR.spot} transparent opacity={0} depthWrite={false} />
      </mesh>
      <points ref={dots} geometry={dotGeo}>
        <pointsMaterial ref={dotMat} color="#fff3c4" size={0.05} transparent opacity={0} depthWrite={false} sizeAttenuation />
      </points>
      <group ref={up}>
        <mesh geometry={upGeo}><meshStandardMaterial color={CLR.lid} roughness={0.6} /></mesh>
      </group>
      <group ref={lo}>
        <mesh geometry={loGeo}><meshStandardMaterial color={CLR.lid} roughness={0.6} /></mesh>
      </group>
      <OrbitControls enablePan={false} enableZoom={false} enableDamping dampingFactor={0.1} />
    </>
  );
}

export default function TearFilm() {
  const reduce = useStore((s) => s.reduceMotion);
  const [mode, setMode] = useState<Mode>('normal');
  const [paused, setPaused] = useState(false);
  const [r, setR] = useState<Readout>({ thick: 100, dryness: 0, blinking: false });
  const frozen = paused || reduce;

  return (
    <figure className="tear">
      <div className="tear-canvas" role="img" aria-label="淚膜與眨眼的衛教示意動畫">
        <Canvas camera={{ position: [0, 0.1, 5.4], fov: 28, near: 0.1, far: 30 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <Eye mode={mode} frozen={frozen} onReadout={setR} />
        </Canvas>
      </div>
      <div className="tear-controls">
        <div className="seg" role="group" aria-label="動畫情境">
          <button className={mode === 'normal' ? 'on' : ''} aria-pressed={mode === 'normal'} onClick={() => setMode('normal')}>正常眨眼</button>
          <button className={mode === 'dry' ? 'on' : ''} aria-pressed={mode === 'dry'} onClick={() => setMode('dry')}>淚膜變薄（示意）</button>
        </div>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      <div className="tear-readout">
        <b>淚膜厚度（示意）{r.thick}%</b>
        <span>{mode === 'dry' ? `蒸發進度 ${r.dryness}%` : '眨眼會補充淚膜'}</span>
        {r.blinking && <span>眨眼中</span>}
      </div>
      <ul className="tear-legend">
        <li><i style={{ background: CLR.lipid }} />脂質層：油脂，減少淚液蒸發</li>
        <li><i style={{ background: CLR.aqueous }} />水液層：淚腺分泌的水分，潤滑與營養角膜</li>
        <li><i style={{ background: CLR.mucin }} />黏液層：幫助淚膜貼附角膜</li>
        <li><i style={{ background: CLR.spot }} />淚膜變薄的區域（乾燥點）</li>
      </ul>
      <figcaption className="small">衛教示意：說明正常眨眼與淚膜變薄的機制，不是個人眼睛的影像或測量結果。乾眼的診斷需由眼科專業人員檢查。</figcaption>
    </figure>
  );
}
