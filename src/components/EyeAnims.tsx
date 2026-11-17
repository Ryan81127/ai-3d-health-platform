import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { GLSL_NOISE, useParts } from '../three/partGeometry';

/**
 * 白內障與青光眼的 3D 衛教示意。
 * 鞏膜、角膜、虹膜、水晶體、前房使用 BodyParts3D 4.0 的左眼模型（矢狀剖面）；
 * 視網膜、脈絡膜、視神經、光線與眼內液體為程式疊加的示意效果。旁邊附「看到的畫面」示意。
 * 情境文字對應 diseases.ts 已核對的內容。
 */
export type EyeTopic = 'cataract' | 'glaucoma';

const INFO: Record<EyeTopic, { label: string; note: string }[]> = {
  cataract: [
    { label: '透明水晶體', note: '水晶體是眼睛裡幫助對焦的透明構造，光線通過角膜與水晶體後，清楚地聚焦在視網膜上。（藍色光線，示意）' },
    { label: '水晶體混濁', note: '約 40 歲起，水晶體中的蛋白質開始分解並聚集，形成混濁區域；光線被阻擋與散射，看東西模糊、顏色變淡、燈光刺眼。' },
    { label: '人工水晶體（示意）', note: '白內障手術是移除混濁的水晶體，換上人工水晶體；10 位接受手術者中有 9 位視力改善。是否手術由眼科醫師評估。' },
  ],
  glaucoma: [
    { label: '眼內液體循環', note: '眼睛前方的液體從虹膜後方產生，經過瞳孔流到前房，再從角膜與虹膜交界處排出。（綠點＝眼內液體，示意）' },
    { label: '眼壓升高（示意）', note: '許多青光眼患者眼壓偏高，但最常見類型的確切原因仍不清楚，也有人眼壓高卻沒有青光眼。初期通常沒有症狀。' },
    { label: '視神經受損與視野縮小', note: '視神經受損後，視力通常從周邊（特別是靠近鼻側）慢慢喪失，進展很慢而不易察覺。治療能保護視力，但已失去的視力無法恢復。' },
  ],
};
const CLARITY: Record<EyeTopic, number[]> = { cataract: [100, 35, 92], glaucoma: [100, 85, 40] };
const T_FROZEN = 1.2;
const S = 60; // 公尺 → 場景單位
const N_RAY = 90, N_AQ = 80;
const IDS = ['BP4-Left-sclera', 'BP4-Left-cornea', 'BP4-Left-iris', 'BP4-Left-lens', 'BP4-Anterior-chamber-of-left-eyeball'];

type V3 = THREE.Vector3;
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

/** 帶組織紋理的材質：以模型座標的雜訊調整顏色 */
function textured(params: THREE.MeshPhysicalMaterialParameters, glsl: string, uniforms: Record<string, THREE.IUniform> = {}) {
  const m = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, ...params });
  m.customProgramCacheKey = () => glsl; // 各材質 shader 不同，避免共用快取
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vP; uniform vec3 uC; uniform float uDamage;\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${glsl}`);
  };
  return m;
}

function EyeScene({ topic, stage, frozen, onReadout }: { topic: EyeTopic; stage: number; frozen: boolean; onReadout: (n: number) => void }) {
  const reduce = useStore((s) => s.reduceMotion);
  const parts = useParts('bp4-eye', IDS);
  const sclera = parts['BP4-Left-sclera'], cornea = parts['BP4-Left-cornea'], iris = parts['BP4-Left-iris'];
  const lens = parts['BP4-Left-lens'], chamber = parts['BP4-Anterior-chamber-of-left-eyeball'];
  const C = sclera.center;
  const R = (sclera.box.max.y - sclera.box.min.y) / 2;

  // 解剖參考點（模型座標，+z 為前方）
  const ref = useMemo(() => {
    const xs = C.x + 0.0004; // 光線與液體畫在剖面前方一點
    const irisZ = iris?.center.z ?? C.z + R * 0.75;
    const irisR = iris ? (iris.box.max.y - iris.box.min.y) / 2 : R * 0.5;
    const pupilR = irisR * 0.32;
    const corneaZ = cornea?.box.max.z ?? C.z + R * 1.05;
    const lensC = lens?.center ?? new THREE.Vector3(C.x, C.y, C.z + R * 0.6);
    const lensR = lens ? (lens.box.max.y - lens.box.min.y) / 2 : R * 0.4;
    const lensFront = lens?.box.max.z ?? lensC.z + 0.002;
    const pole = new THREE.Vector3(C.x, C.y, C.z - R * 0.93); // 視網膜後極（黃斑附近）
    const rays = Array.from({ length: 9 }, (_, i) => {
      const y = (i - 4) / 4 * lensR * 0.75;
      return [new THREE.Vector3(xs, C.y + y, corneaZ + R * 1.1), new THREE.Vector3(xs, C.y + y, corneaZ - 0.0005), new THREE.Vector3(xs, C.y + y * 0.9, lensC.z), new THREE.Vector3(xs, pole.y, pole.z + 0.0006)];
    });
    const scatter = rays.map((r, i) => {
      const a = (rnd(i + 2) - 0.5) * 1.6;
      return [r[0], r[1], r[2], new THREE.Vector3(xs, C.y + Math.sin(a) * R * 0.9, C.z - Math.cos(a) * R * 0.9)];
    });
    const aq = [1, -1].map((s) => [
      new THREE.Vector3(xs, C.y + s * irisR * 0.95, lensFront - 0.0012),
      new THREE.Vector3(xs, C.y + s * pupilR * 1.2, irisZ - 0.0006),
      new THREE.Vector3(xs, C.y + s * pupilR * 0.75, irisZ + 0.0008),
      new THREE.Vector3(xs, C.y + s * irisR * 0.45, corneaZ - 0.0016),
      new THREE.Vector3(xs, C.y + s * irisR * 0.95, irisZ + 0.0012),
      new THREE.Vector3(xs, C.y + s * irisR * 1.08, irisZ + 0.0004),
    ]);
    const nerveDir = new THREE.Vector3(-0.35, 0, -1).normalize(); // 往後、往內側（鼻側）
    const nStart = new THREE.Vector3(C.x - R * 0.12, C.y, C.z - R * 0.92);
    return { xs, irisZ, irisR, corneaZ, lensC, lensR, pole, rays, scatter, aq, nStart, nerveDir, angle: aq[0][5] };
  }, [C, R, iris, cornea, lens]);

  // 剖面：保留內側半邊（場景座標 x ≤ 0），從外側看進眼球
  const sag = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.0002 * S), []);
  const post = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), R * 0.35 * S), [R]);
  const u = useMemo(() => ({ uC: { value: C }, uDamage: { value: 0 } }), [C]);

  const mats = useMemo(() => ({
    sclera: textured({ color: '#f2ece3', roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.3 },
      `float vein = smoothstep(0.62, 0.78, fbm(vP * 900.0)) * 0.35; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.5, 0.46), vein);
       if (!gl_FrontFacing) diffuseColor.rgb *= vec3(0.55, 0.42, 0.36);`, u),
    choroid: new THREE.MeshPhysicalMaterial({ color: '#4a2219', roughness: 0.6, side: THREE.DoubleSide }),
    retina: textured({ color: '#e6896d', roughness: 0.5, clearcoat: 0.4 },
      `float v2 = smoothstep(0.66, 0.8, fbm(vP * 700.0 + 2.0)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.16, 0.14), v2 * 0.6);`, u),
    cornea: new THREE.MeshPhysicalMaterial({ color: '#eaf6ff', transmission: 1, thickness: 0.15, ior: 1.376, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    iris: textured({ color: '#7a4a28', roughness: 0.55, clearcoat: 0.3 },
      `vec3 q = vP - uC; float ang = atan(q.y, q.x); float rr = length(q.xy);
       float fib = fbm(vec3(ang * 9.0, rr * 1400.0, 0.0)); diffuseColor.rgb *= 0.65 + 0.6 * fib;
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.28, 0.16, 0.08), smoothstep(0.0055, 0.0035, rr) * 0.6);`, u),
    lens: new THREE.MeshPhysicalMaterial({ color: '#f4f9ff', transmission: 0.95, thickness: 0.4, ior: 1.42, roughness: 0.05, clearcoat: 1, transparent: true, side: THREE.DoubleSide }),
    lensCloudy: textured({ color: '#d9c07a', roughness: 0.7, transparent: true, opacity: 0.95 },
      `float cl = fbm(vP * 1500.0); diffuseColor.rgb = mix(vec3(0.95, 0.9, 0.75), vec3(0.72, 0.58, 0.3), cl);`, u),
    iol: new THREE.MeshPhysicalMaterial({ color: '#f6fbff', transmission: 1, thickness: 0.2, ior: 1.46, roughness: 0.02, clearcoat: 1, transparent: true }),
    haptic: new THREE.MeshPhysicalMaterial({ color: '#3d7bd9', roughness: 0.3, clearcoat: 1 }),
    chamber: new THREE.MeshPhysicalMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.12, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    nerve: textured({ color: '#efd8a0', roughness: 0.5, clearcoat: 0.3 },
      `float f = fbm(vec3(vP.xy * 2500.0, vP.z * 300.0)); diffuseColor.rgb *= 0.8 + 0.35 * f;
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.74, 0.72, 0.68), uDamage);`, u),
  }), [u]);

  useEffect(() => {
    for (const m of [mats.sclera, mats.choroid, mats.cornea, mats.iris, mats.lens, mats.lensCloudy, mats.chamber]) m.clippingPlanes = [sag];
    mats.retina.clippingPlanes = [sag, post]; mats.choroid.clippingPlanes = [sag, post];
  }, [mats, sag, post]);

  const nerveGeo = useMemo(() => {
    const a = ref.nStart, b = a.clone().addScaledVector(ref.nerveDir, R * 1.3);
    const curve = new THREE.CatmullRomCurve3([a.clone().addScaledVector(ref.nerveDir, -R * 0.06), a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -R * 0.05, 0)), b]);
    return new THREE.TubeGeometry(curve, 30, R * 0.15, 20, false);
  }, [ref, R]);
  const scl = (k: number) => {
    const g = sclera.geo.clone(), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).sub(C).multiplyScalar(k).add(C); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g;
  };
  const retinaGeo = useMemo(() => scl(0.9), [sclera]); // eslint-disable-line react-hooks/exhaustive-deps
  const choroidGeo = useMemo(() => scl(0.93), [sclera]); // eslint-disable-line react-hooks/exhaustive-deps

  const P = useMemo(() => pointsGeo(N_RAY), []), A = useMemo(() => pointsGeo(N_AQ), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const cupRef = useRef<THREE.Mesh>(null), chamberRef = useRef<THREE.Mesh>(null), press = useRef<THREE.Group>(null);
  const dmg = useRef(0), last = useRef(-10);
  const cataract = topic === 'cataract' && stage === 1;
  const iol = topic === 'cataract' && stage === 2;
  const highP = topic === 'glaucoma' && stage >= 1;
  const rays = cataract ? ref.scatter : ref.rays;
  const rayLines = useMemo(() => {
    const pts: number[] = [];
    rays.forEach((r, i) => {
      const end = cataract && i % 2 === 0 ? 2 : 3; // 混濁時一半光線停在水晶體
      for (let k = 0; k < end; k++) pts.push(r[k].x, r[k].y, r[k].z, r[k + 1].x, r[k + 1].y, r[k + 1].z);
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
  }, [rays, cataract]);

  useFrame(({ clock }, dt) => {
    const t = frozen || reduce ? T_FROZEN : clock.elapsedTime;
    const showRays = topic === 'cataract';
    for (let i = 0; i < N_RAY; i++) {
      const path = rays[i % rays.length];
      const s = ((i / N_RAY) * 4 + t * 0.3) % 1;
      const blocked = cataract && (i % rays.length) % 2 === 0;
      along(path, blocked ? Math.min(s, 0.62) : s, tmp);
      const hide = !showRays || (blocked && s > 0.62);
      P.a[i * 3] = tmp.x; P.a[i * 3 + 1] = tmp.y; P.a[i * 3 + 2] = hide ? -100 : tmp.z;
    }
    P.g.attributes.position.needsUpdate = true;
    for (let i = 0; i < N_AQ; i++) {
      let s = ((i / N_AQ) * 2 + t * 0.1) % 1;
      if (highP) s = Math.min(s, 0.6 + 0.1 * Math.sin(i * 1.7 + t)); // 排出受阻，液體留在前房（示意）
      along(ref.aq[i % 2], s, tmp);
      const j = (highP ? 0.0012 : 0.0004);
      A.a[i * 3] = tmp.x; A.a[i * 3 + 1] = tmp.y + (rnd(i) - 0.5) * j; A.a[i * 3 + 2] = topic === 'glaucoma' ? tmp.z + (rnd(i + 5) - 0.5) * j : -100;
    }
    A.g.attributes.position.needsUpdate = true;

    const k = reduce ? 1 : 1 - Math.exp(-dt * 2);
    dmg.current += ((topic === 'glaucoma' ? [0, 0.2, 0.85][stage] : 0) - dmg.current) * k;
    u.uDamage.value = dmg.current;
    if (cupRef.current) cupRef.current.scale.setScalar(0.35 + 0.5 * dmg.current); // 視神經盤凹陷擴大（示意）
    if (chamberRef.current) (chamberRef.current.material as THREE.MeshPhysicalMaterial).opacity = highP ? 0.28 + 0.08 * Math.sin(t * 3) : 0.12;
    if (press.current) {
      press.current.visible = highP;
      press.current.children.forEach((c, i) => { (c as THREE.Mesh).position.z = ref.pole.z + R * (0.5 + 0.06 * Math.sin(t * 3 + i)); });
    }
    if (clock.elapsedTime - last.current > 0.4) { last.current = clock.elapsedTime; onReadout(CLARITY[topic][stage]); }
  });

  const discN = new THREE.Vector3(0, 0, 1);
  return (
    <group scale={S} position={C.clone().multiplyScalar(-S)}>
      <mesh geometry={sclera.geo} material={mats.sclera} />
      <mesh geometry={choroidGeo} material={mats.choroid} />
      <mesh geometry={retinaGeo} material={mats.retina} />
      {cornea && <mesh geometry={cornea.geo} material={mats.cornea} />}
      {iris && <mesh geometry={iris.geo} material={mats.iris} />}
      {chamber && <mesh ref={chamberRef} geometry={chamber.geo} material={mats.chamber} />}
      {lens && !iol && <mesh geometry={lens.geo} material={cataract ? mats.lensCloudy : mats.lens} />}
      {iol && (
        <group position={ref.lensC}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.iol}><cylinderGeometry args={[ref.lensR * 0.62, ref.lensR * 0.62, ref.lensR * 0.22, 40]} /></mesh>
          {[1, -1].map((s) => (
            <mesh key={s} position={[0, s * ref.lensR * 0.78, 0]} rotation={[0, 0, s > 0 ? 0 : Math.PI]} material={mats.haptic}>
              <torusGeometry args={[ref.lensR * 0.45, ref.lensR * 0.025, 8, 24, Math.PI]} />
            </mesh>
          ))}
        </group>
      )}
      {/* 視神經與視神經盤（示意） */}
      <mesh geometry={nerveGeo} material={mats.nerve} />
      <group position={ref.nStart.clone().addScaledVector(ref.nerveDir, -R * 0.02)} quaternion={new THREE.Quaternion().setFromUnitVectors(discN, ref.nerveDir.clone().negate())}>
        <mesh><circleGeometry args={[R * 0.15, 32]} /><meshStandardMaterial color="#f3c98a" side={THREE.DoubleSide} /></mesh>
        <mesh ref={cupRef} position={[0, 0, 0.00005]}><circleGeometry args={[R * 0.15, 32]} /><meshStandardMaterial color="#fff4dc" side={THREE.DoubleSide} /></mesh>
      </group>
      <group ref={press} visible={false}>
        {[-0.3, 0, 0.3].map((y, i) => (
          <mesh key={i} position={[ref.xs, C.y + y * R, ref.pole.z + R * 0.5]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[R * 0.05, R * 0.16, 12]} /><meshStandardMaterial color="#ff9a2e" emissive="#c25a00" /></mesh>
        ))}
      </group>
      <lineSegments geometry={rayLines} visible={topic === 'cataract'}>
        <lineBasicMaterial color="#5fb0ff" transparent opacity={0.55} />
      </lineSegments>
      <points geometry={P.g}><pointsMaterial color="#9fd4ff" size={0.035} sizeAttenuation /></points>
      <points geometry={A.g}><pointsMaterial color="#3fd68a" size={0.045} sizeAttenuation /></points>
      {topic === 'glaucoma' && stage === 1 && <Html position={ref.angle} center className="anim-label">排出受阻（示意）</Html>}
      {topic === 'glaucoma' && stage === 2 && <Html position={ref.nStart.clone().addScaledVector(ref.nerveDir, R * 0.9).add(new THREE.Vector3(0, R * 0.35, 0))} center className="anim-label">視神經受損（示意）</Html>}
      {cataract && <Html position={ref.lensC.clone().add(new THREE.Vector3(0, R * 0.55, 0))} center className="anim-label">混濁的水晶體</Html>}
      {iol && <Html position={ref.lensC.clone().add(new THREE.Vector3(0, R * 0.55, 0))} center className="anim-label">人工水晶體（示意）</Html>}
    </group>
  );
}

/** 「看到的畫面」示意：白內障模糊與色彩變淡；青光眼周邊（偏鼻側）視野縮小。左眼的鼻側在畫面右邊 */
function ViewSim({ topic, stage }: { topic: EyeTopic; stage: number }) {
  const filter = topic === 'cataract' && stage === 1 ? 'blur(2.5px) sepia(0.55) contrast(0.7) brightness(1.08)' : 'none';
  const mask: CSSProperties | null = topic === 'glaucoma' && stage === 2
    ? { background: 'radial-gradient(ellipse 42% 58% at 40% 50%, transparent 55%, rgba(12,14,18,0.94) 100%)' }
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

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 3, 3]} intensity={1.5} />
      <directionalLight position={[-3, -1, 4]} intensity={0.4} color="#dfe9ff" />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2} position={[3, 3, 3]} scale={[6, 3, 1]} />
        <Lightformer intensity={1} position={[-4, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} color="#fff0e6" />
        <Lightformer intensity={0.7} position={[0, -3, -3]} scale={[6, 3, 1]} color="#d9e8ff" />
      </Environment>
    </>
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
      <div className="tear-canvas tall eye-wrap" role="img" aria-label={`${info.label}的衛教示意動畫`}>
        <Canvas camera={{ position: [3.1, 0.6, 1.2], fov: 34, near: 0.02, far: 30 }} dpr={[1, 2]} gl={{ antialias: true, localClippingEnabled: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <color attach="background" args={['#101c2b']} />
          <Lights />
          <Suspense fallback={<Html center className="anim-label">載入眼球模型…</Html>}>
            <EyeScene topic={topic} stage={stage} frozen={frozen} onReadout={setClarity} />
          </Suspense>
          <OrbitControls enablePan={false} enableZoom minDistance={1.4} maxDistance={5} enableDamping dampingFactor={0.1} target={[0, -0.05, 0.1]} />
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
      <figcaption className="small">衛教示意：鞏膜、角膜、虹膜、水晶體形狀來自 BodyParts3D 4.0 成年男性左眼模型（從外側看剖面，光線由畫面左方進入）；視網膜、視神經、光線與眼內液體為示意效果，不是個人眼睛影像或視野檢查結果。可拖曳旋轉、滾輪縮放。診斷需要散瞳眼科檢查。</figcaption>
    </figure>
  );
}
