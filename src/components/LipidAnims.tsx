import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { GLSL_NOISE, useParts } from '../three/partGeometry';

/**
 * 高血脂的 3D 衛教示意：剖開的冠狀動脈（內膜、中膜、外膜）、紅血球、LDL 與 HDL，以及斑塊堆積。
 * 「看位置」改顯示 BodyParts3D 的真實心臟與冠狀動脈。情境文字對應 diseases.ts 已核對的 MedlinePlus 內容。
 */
const INFO = [
  { label: 'LDL 與 HDL 的運送', note: 'LDL（壞膽固醇）把膽固醇運到身體各處；HDL（好膽固醇）把膽固醇帶回肝臟移除。（橘色＝LDL，淡藍色＝HDL，紅色＝紅血球，示意）' },
  { label: 'LDL 過高：膽固醇堆積', note: 'LDL 過高時，膽固醇會與其他物質在動脈壁形成斑塊。高膽固醇通常沒有症狀，只能靠抽血檢查得知。' },
  { label: '斑塊使血管變窄', note: '斑塊可能使冠狀動脈變窄甚至阻塞，與冠狀動脈疾病、中風及周邊動脈疾病有關。圖中斑塊大小與狹窄程度為示意。' },
];
const PLAQUE = [0, 0.45, 1];
const LDL_N = [14, 46, 46];
const T_FROZEN = 1.4;
const L = 4.6, R0 = 0.5, TH = 0.2;     // 血管長度、內半徑、管壁厚度（場景單位）
const CUT = 1.05;                       // 前方剖開的角度範圍（半寬，弧度）
const N_RBC = 85, N_LDL = 46, N_HDL = 18;

/** 斑塊高度：集中在血管中段、下壁（θ = π），剖面上看得到斑塊的層次 */
const plaqueAt = (x: number, th: number, k: number) => k * 0.34 * Math.exp(-((x / 0.75) ** 2)) * Math.pow(0.5 + 0.5 * Math.cos(th - Math.PI), 1.5);
const GLSL_PLAQUE = /* glsl */ `
uniform float uPlaque;
float plaqueAt(float x, float th) { return uPlaque * 0.34 * exp(-pow(x / 0.75, 2.0)) * pow(0.5 + 0.5 * cos(th - 3.1415927), 1.5); }
vec3 wallPos(float x, float th, float aR) {
  float ri = ${R0.toFixed(2)} - plaqueAt(x, th);
  float r = mix(ri, ${(R0 + TH).toFixed(2)}, aR);
  return vec3(x, r * cos(th), r * sin(th));
}`;

/** 管壁幾何：內面、外面與兩個剖面，位置全部在 shader 中依 (x, θ, 半徑比例) 計算 */
function wallGeometry() {
  const nx = 140, nt = 90, nr = 10;
  const t0 = Math.PI / 2 + CUT, t1 = Math.PI / 2 - CUT + Math.PI * 2;
  const xs: number[] = [], ths: number[] = [], rs: number[] = [], sides: number[] = [], idx: number[] = [];
  const grid = (cols: number, rows: number, f: (i: number, j: number) => [number, number, number, number], flip: boolean) => {
    const base = xs.length;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const [x, th, r, s] = f(i, j); xs.push(x); ths.push(th); rs.push(r); sides.push(s); }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = base + j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
  };
  const X = (i: number) => -L / 2 + (i / nx) * L;
  grid(nx, nt, (i, j) => [X(i), t0 + (j / nt) * (t1 - t0), 0, -1], false);                // 內面
  grid(nx, nt, (i, j) => [X(i), t0 + (j / nt) * (t1 - t0), 1, 1], true);                  // 外面
  grid(nx, nr, (i, j) => [X(i), t0, j / nr, 2], true);                                    // 剖面一
  grid(nx, nr, (i, j) => [X(i), t1, j / nr, 3], false);                                   // 剖面二
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(xs.length * 3).fill(0), 3));
  g.setAttribute('aX', new THREE.Float32BufferAttribute(xs, 1));
  g.setAttribute('aTh', new THREE.Float32BufferAttribute(ths, 1));
  g.setAttribute('aR', new THREE.Float32BufferAttribute(rs, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(sides, 1));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), L);
  return g;
}

function wallMaterial(u: Record<string, THREE.IUniform>) {
  const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color('#ffc4b8'), side: THREE.DoubleSide });
  m.customProgramCacheKey = () => 'artery-wall-layers';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aX, aTh, aR, aSide; varying float vR, vX, vTh, vSide; varying vec3 vP; ${GLSL_PLAQUE}`)
      .replace('#include <beginnormal_vertex>', `
        vec3 p0 = wallPos(aX, aTh, aR);
        vec3 nrm;
        if (aSide < 1.5) {
          vec3 dx = wallPos(aX + 0.01, aTh, aR) - p0; vec3 dt = wallPos(aX, aTh + 0.01, aR) - p0;
          nrm = normalize(cross(dx, dt)) * aSide;
        } else {
          nrm = normalize(vec3(0.0, -sin(aTh), cos(aTh))) * (aSide < 2.5 ? 1.0 : -1.0);
        }
        vec3 objectNormal = nrm;
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(1.0, 0.0, 0.0);
        #endif`)
      .replace('#include <begin_vertex>', `vec3 transformed = p0; vR = aR; vX = aX; vTh = aTh; vSide = aSide; vP = p0;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vR, vX, vTh, vSide; varying vec3 vP; ${GLSL_PLAQUE} ${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float pl = plaqueAt(vX, vTh);
        float r = length(vP.yz);
        vec3 intima = vec3(0.95, 0.78, 0.74), media = vec3(0.62, 0.16, 0.15), adv = vec3(0.93, 0.84, 0.66);
        vec3 lipid = vec3(0.97, 0.83, 0.38), cap = vec3(0.97, 0.93, 0.84);
        vec3 col;
        if (vSide < -0.5) {
          // 內膜表面：斑塊處呈黃白色的纖維帽
          col = mix(intima, mix(cap, lipid, 0.55), smoothstep(0.01, 0.07, pl));
          col *= 0.9 + 0.15 * fbm(vP * 9.0);
        } else if (vSide < 1.5) {
          col = adv * (0.82 + 0.25 * fbm(vP * 6.0));
        } else {
          // 剖面：由內到外依序為纖維帽、脂質核心、內膜、中膜（平滑肌紋理）、外膜
          float d = r - (${R0.toFixed(2)} - pl);
          if (pl > 0.02 && d < pl) col = d < 0.025 ? cap : lipid * (0.85 + 0.25 * fbm(vP * 30.0));
          else if (r < ${(R0 + 0.025).toFixed(3)}) col = intima;
          else if (r < ${(R0 + 0.12).toFixed(3)}) col = media * (0.8 + 0.35 * sin(r * 260.0 + fbm(vP * 12.0) * 3.0));
          else col = adv * (0.8 + 0.3 * fbm(vP * 18.0));
        }
        diffuseColor.rgb = col;`);
  };
  return m;
}

/** 雙凹圓盤狀的紅血球 */
function rbcGeometry() {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, r = 0.07 * Math.sin((t * Math.PI) / 2);
    const h = 0.012 + 0.018 * Math.pow(r / 0.07, 2) * (1 - Math.pow(r / 0.07, 8));
    pts.push(new THREE.Vector2(r, h));
  }
  for (let i = 24; i >= 0; i--) { const p = pts[i]; pts.push(new THREE.Vector2(p.x, -p.y)); }
  const g = new THREE.LatheGeometry(pts, 28);
  g.computeVertexNormals();
  return g;
}

const rnd = (n: number) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

function VesselScene({ stage, frozen, onReadout }: { stage: number; frozen: boolean; onReadout: (n: number) => void }) {
  const reduce = useStore((s) => s.reduceMotion);
  const u = useMemo(() => ({ uPlaque: { value: 0 } }), []);
  const geo = useMemo(wallGeometry, []);
  const mat = useMemo(() => wallMaterial(u), [u]);
  const rbcGeo = useMemo(rbcGeometry, []);
  const rbc = useRef<THREE.InstancedMesh>(null), ldl = useRef<THREE.InstancedMesh>(null), hdl = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => Array.from({ length: 220 }, (_, i) => ({ x: rnd(i) * L, th: rnd(i + 300) * Math.PI * 2, r: Math.sqrt(rnd(i + 600)), sp: 0.7 + rnd(i + 900) * 0.6, rot: rnd(i + 1200) * 6.28 })), []);
  const pk = useRef(0), last = useRef(-10);
  const d = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const k = reduce ? 1 : 1 - Math.exp(-dt * 1.6);
    pk.current += (PLAQUE[stage] - pk.current) * k;
    u.uPlaque.value = pk.current;
    const place = (m: THREE.InstancedMesh | null, n: number, s0: number, speed: number, size: number, tumble: boolean) => {
      if (!m) return;
      for (let i = 0; i < n; i++) {
        const s = seeds[s0 + i];
        const x = ((s.x + t * speed * s.sp) % L) - L / 2;
        const rmax = R0 - plaqueAt(x, s.th, pk.current) - size * 1.3;
        const r = Math.max(0, rmax) * s.r * 0.95;
        d.position.set(x, r * Math.cos(s.th), r * Math.sin(s.th));
        if (tumble) d.rotation.set(s.rot + t * 0.8 * s.sp, s.rot * 2, t * 0.5 + s.rot);
        d.scale.setScalar(1);
        d.updateMatrix(); m.setMatrixAt(i, d.matrix);
      }
      m.count = n; m.instanceMatrix.needsUpdate = true;
    };
    place(rbc.current, N_RBC, 0, 0.45, 0.07, true);
    place(hdl.current, N_HDL, N_RBC, 0.4, 0.02, false);
    // LDL：一部分進入斑塊處的管壁下並停留（示意）
    if (ldl.current) {
      const n = LDL_N[stage];
      for (let i = 0; i < n; i++) {
        const s = seeds[N_RBC + N_HDL + i];
        const trapped = stage >= 1 && i % 3 === 0;
        if (trapped) {
          const x = (rnd(i + 40) - 0.5) * 1.2, th = Math.PI + (rnd(i + 41) - 0.5) * 1.4;
          const pl = plaqueAt(x, th, pk.current);
          const r = R0 - pl * (0.25 + 0.6 * rnd(i + 42));
          d.position.set(x, r * Math.cos(th), r * Math.sin(th));
        } else {
          const x = ((s.x + t * 0.42 * s.sp) % L) - L / 2;
          const r = Math.max(0, R0 - plaqueAt(x, s.th, pk.current) - 0.04) * s.r * 0.95;
          d.position.set(x, r * Math.cos(s.th), r * Math.sin(s.th));
        }
        d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix(); ldl.current.setMatrixAt(i, d.matrix);
      }
      ldl.current.count = n; ldl.current.instanceMatrix.needsUpdate = true;
    }
    if (clock.elapsedTime - last.current > 0.4) { last.current = clock.elapsedTime; onReadout(Math.round(((R0 - 0.34 * pk.current) / R0) * 100)); }
  });

  return (
    <group rotation={[0.1, -0.32, 0]}>
      <mesh geometry={geo} material={mat} />
      <instancedMesh ref={rbc} args={[rbcGeo, undefined, N_RBC]}>
        <meshPhysicalMaterial color="#b3121c" roughness={0.35} clearcoat={0.6} sheen={0.5} sheenColor="#ff6b6b" />
      </instancedMesh>
      <instancedMesh ref={ldl} args={[undefined, undefined, N_LDL]}>
        <icosahedronGeometry args={[0.032, 2]} />
        <meshPhysicalMaterial color="#ffa62b" roughness={0.3} clearcoat={1} emissive="#7a3d00" emissiveIntensity={0.4} />
      </instancedMesh>
      <instancedMesh ref={hdl} args={[undefined, undefined, N_HDL]}>
        <icosahedronGeometry args={[0.02, 2]} />
        <meshPhysicalMaterial color="#bfe6ff" roughness={0.2} clearcoat={1} emissive="#3d7fb8" emissiveIntensity={0.35} />
      </instancedMesh>
      {stage >= 1 && <Html position={[0.1, -0.15, 0.25]} center className="anim-label">{stage === 1 ? '膽固醇堆積在管壁' : '斑塊（示意）'}</Html>}
    </group>
  );
}

/** 位置圖：BodyParts3D 真實心臟與冠狀動脈，標出畫面中的動脈段 */
function HeartContext() {
  const organ = useParts('organ', ['FMA7274']);
  const ves = useParts('vessel', ['FMA3736', 'FMA3768', 'FMA3802', 'FMA3818', 'FMA3840nsn', 'FMA3862nsn', 'FMA3895', 'FMA4685', 'FMA4720']);
  const wall = organ.FMA7274;
  const lad = ves.FMA3862nsn;
  const mats = useMemo(() => ({
    heart: new THREE.MeshPhysicalMaterial({ color: '#a8352f', roughness: 0.45, clearcoat: 0.5, sheen: 0.6, sheenColor: new THREE.Color('#ff8f80'), transparent: true, opacity: 0.88 }),
    cor: new THREE.MeshPhysicalMaterial({ color: '#ffcf4a', emissive: '#b37400', emissiveIntensity: 0.6, roughness: 0.3, clearcoat: 1 }),
    big: new THREE.MeshPhysicalMaterial({ color: '#c23a33', roughness: 0.35, clearcoat: 0.8 }),
    vein: new THREE.MeshPhysicalMaterial({ color: '#4c5aa6', roughness: 0.4, clearcoat: 0.6 }),
  }), []);
  if (!wall) return null;
  const S = 10;
  return (
    <group scale={S} position={wall.center.clone().multiplyScalar(-S)}>
      <mesh geometry={wall.geo} material={mats.heart} />
      {['FMA3802', 'FMA3818', 'FMA3840nsn', 'FMA3862nsn', 'FMA3895', 'FMA4685'].map((id) => ves[id] && <mesh key={id} geometry={ves[id].geo} material={mats.cor} />)}
      {['FMA3736', 'FMA3768'].map((id) => ves[id] && <mesh key={id} geometry={ves[id].geo} material={mats.big} />)}
      {ves.FMA4720 && <mesh geometry={ves.FMA4720.geo} material={mats.vein} />}
      <Html position={(lad?.center ?? wall.center).clone().add(new THREE.Vector3(0.035, -0.045, 0.03))} center className="anim-label">黃色＝冠狀動脈</Html>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 4, 5]} intensity={1.5} />
      <directionalLight position={[-4, 1, -2]} intensity={0.5} color="#ffd9cf" />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2} position={[0, 4, 4]} scale={[8, 3, 1]} />
        <Lightformer intensity={1.1} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} color="#ffe2d6" />
        <Lightformer intensity={0.7} position={[5, -1, -2]} rotation-y={-Math.PI / 2} scale={[6, 4, 1]} color="#d6e8ff" />
      </Environment>
    </>
  );
}

export default function LipidAnims() {
  const reduce = useStore((s) => s.reduceMotion);
  const [stage, setStage] = useState(0);
  const [lumen, setLumen] = useState(100);
  const [paused, setPaused] = useState(false);
  const [where, setWhere] = useState(false);
  const frozen = paused || reduce;
  useEffect(() => { if (where) setPaused(false); }, [where]);
  const info = INFO[stage];
  return (
    <figure className="vessel">
      <div className="tear-canvas tall" role="img" aria-label={`${where ? '冠狀動脈位置' : info.label}的衛教示意動畫`}>
        <Canvas key={where ? 'w' : 'v'} camera={{ position: where ? [0.9, 0.5, 3.6] : [0, 0.4, 4.6], fov: 34, near: 0.05, far: 40 }} dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <color attach="background" args={['#101c2b']} />
          <Lights />
          <Suspense fallback={<Html center className="anim-label">載入模型…</Html>}>
            {where ? <HeartContext /> : <VesselScene stage={stage} frozen={frozen} onReadout={setLumen} />}
          </Suspense>
          <OrbitControls enablePan={false} enableZoom minDistance={1.6} maxDistance={6} enableDamping dampingFactor={0.1} />
        </Canvas>
      </div>
      <div className="seg" role="group" aria-label="情境">
        {INFO.map((x, i) => <button key={x.label} className={!where && stage === i ? 'on' : ''} aria-pressed={!where && stage === i} onClick={() => { setWhere(false); setStage(i); }}>{x.label}</button>)}
      </div>
      <div className="tear-controls">
        <div className="tear-readout"><b>{where ? '冠狀動脈的位置' : info.label}</b>{!where && <span>血管通暢程度（示意）{lumen}%</span>}</div>
        <button className="btn small ghost" aria-pressed={where} onClick={() => setWhere(!where)}>{where ? '看血管內部' : '看位置'}</button>
        <button className="btn small ghost" onClick={() => setPaused(!paused)} disabled={reduce || where}>{paused ? '▶ 播放' : '⏸ 暫停'}</button>
      </div>
      <p className="small">{where ? '冠狀動脈包覆在心臟表面，負責供應心肌血液。心臟與冠狀動脈形狀來自 BodyParts3D 成年男性解剖模型。' : info.note}</p>
      <figcaption className="small">衛教示意：剖開的動脈段（由內到外：內膜、中膜、外膜），粒子大小與數量經放大簡化，不是實際比例，也不是個人血管影像。是否有高血脂需以抽血檢查確認。可拖曳旋轉、滾輪縮放。</figcaption>
    </figure>
  );
}
