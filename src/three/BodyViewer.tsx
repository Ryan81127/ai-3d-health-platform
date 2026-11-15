import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ORGAN_MAP } from '../data/organs';
import { PEEL_ORDER, useStore, type LayerKey } from '../store';
import { BODY, ORGAN_BOUNDS, PART_MAP, partLabel, unionBounds, type Bounds, type PartInfo } from './anatomy';

/** 每個圖層由哪些模型檔組成（見 public/models/LICENSE.txt） */
const LAYER_FILES: Record<LayerKey, string[]> = {
  skin: ['skin'], muscle: ['muscle'], skeleton: ['skeleton'],
  organ: ['organ', 'bp4-eye', 'za-organ'], vessel: ['vessel', 'bp4-vessel'], nerve: ['za-nerve'],
};

const SELECT = new THREE.Color('#12c9b4');
const FLAG = new THREE.Color('#ff9a1f');
const BLACK = new THREE.Color('#000000');

/* ---------- 各部位的顏色與材質 ---------- */
const ORGAN_COLOR: Record<string, string> = {
  brain: '#dcaaa2', eyes: '#f3f1ea', mouth: '#f1ecdc', airway: '#d5e2e6', lungs: '#d9938c', heart: '#a3302d', liver: '#7b3323',
  stomach: '#d79c78', pancreas: '#dcb968', kidneys: '#8c3a33', intestines: '#d6a18d', bladder: '#d9c183', thyroid: '#b9713f',
};
function partStyle(p: PartInfo): { color: string; roughness: number } {
  const n = p.en;
  switch (p.layer) {
    case 'skin': return { color: /hair|eyebrow/.test(n) ? '#3b2f2a' : '#dfae8f', roughness: 0.62 };
    case 'muscle': return /tendon|ligament|tract|linea alba|retinaculum|membrane|aponeurosis/.test(n) ? { color: '#e6dccb', roughness: 0.55 } : { color: '#a43f37', roughness: 0.48 };
    case 'skeleton': return /cartilage|disk/.test(n) ? { color: '#c3d3da', roughness: 0.5 } : { color: '#e2d6b8', roughness: 0.6 };
    case 'vessel': {
      const venous = /vein|vena|sinus/.test(n);
      const pulmonary = /pulmonary/.test(n);
      // 依慣例以紅色表示含氧血、藍色表示缺氧血，因此肺動脈為藍、肺靜脈為紅
      return { color: venous !== pulmonary ? '#2f57b5' : '#c5222f', roughness: 0.4 };
    }
    case 'nerve': return { color: '#ecc94b', roughness: 0.5 };
    default: {
      if (/gingiva|labial/.test(n)) return { color: '#d98686', roughness: 0.45 };
      if (/colon|rectum|appendix|taenia/.test(n)) return { color: '#c98f7c', roughness: 0.45 };
      if (/spleen/.test(n)) return { color: '#6d2e44', roughness: 0.45 };
      if (/gallbladder/.test(n)) return { color: '#5b8040', roughness: 0.4 };
      if (/adrenal/.test(n)) return { color: '#d6a54a', roughness: 0.5 };
      if (/valve|papillary/.test(n)) return { color: '#e3c9b8', roughness: 0.5 };
      if (/ventricle$|aqueduct|foramen/.test(n) && p.organ === 'brain') return { color: '#9bb7c9', roughness: 0.4 };
      return { color: (p.organ && ORGAN_COLOR[p.organ]) || '#cfa18f', roughness: 0.45 };
    }
  }
}

type Mark = 'normal' | 'flag' | 'selected' | 'dim';
/** 整個圖層代表的器官（皮膚、肌肉、血管、神經）標示時用較淡的光，避免整片發亮 */
const isLayerOrgan = (organ: string | null) => !!organ && ORGAN_MAP[organ]?.layer !== 'organ';

function useMarks() {
  const selectedOrgan = useStore((s) => s.selectedOrgan);
  const selectedPart = useStore((s) => s.selectedPart);
  const spotlight = useStore((s) => s.spotlight);
  return { selectedOrgan, selectedPart, spotlight };
}
function markOf(p: PartInfo, flagged: string[], m: ReturnType<typeof useMarks>): Mark {
  if (m.selectedPart ? m.selectedPart === p.id : !!m.selectedOrgan && p.organ === m.selectedOrgan) return 'selected';
  const active = m.spotlight ?? flagged;
  if (p.organ && active.includes(p.organ)) return 'flag';
  // 主題教學或從選單聚焦某個器官時，其他器官淡化，才看得到被遮住的器官（例如肺後方的心臟）
  const focusing = !m.selectedPart && !!m.selectedOrgan && ORGAN_MAP[m.selectedOrgan].layer === 'organ';
  if ((m.spotlight || focusing) && p.layer === 'organ') return 'dim';
  return 'normal';
}
function applyMaterial(mat: THREE.MeshStandardMaterial, layerOpacity: number, mark: Mark, layerLevel: boolean) {
  const opacity = mark === 'selected' && !layerLevel ? Math.max(layerOpacity, 0.95) : layerOpacity * (mark === 'dim' ? 0.28 : 1);
  mat.opacity = opacity;
  const transparent = opacity < 0.99;
  if (mat.transparent !== transparent) { mat.transparent = transparent; mat.needsUpdate = true; } // 切換透明需要重新編譯材質
  mat.depthWrite = opacity > 0.55;
  // 以「染色」為主、少量自發光：直接疊加發光會把深色器官洗成灰白
  const base = (mat.userData.base ??= mat.color.clone()) as THREE.Color;
  const tint = mark === 'selected' ? SELECT : mark === 'flag' ? FLAG : null;
  mat.color.copy(base);
  if (tint) mat.color.lerp(tint, layerLevel ? 0.25 : mark === 'selected' ? 0.62 : 0.45);
  mat.emissive.copy(tint ?? BLACK);
  mat.emissiveIntensity = tint ? (layerLevel ? 0.06 : 0.16) : 0;
  mat.userData.pulse = mark === 'flag' && !layerLevel;
}

function pick(e: ThreeEvent<MouseEvent>, layerOpacity: number) {
  const mesh = e.object as THREE.Mesh;
  const part = PART_MAP[mesh.userData.partId as string];
  if (!part || !mesh.visible || layerOpacity < 0.3 || e.delta > 6) return;
  e.stopPropagation();
  useStore.getState().selectPart(part.id, part.organ);
}

/* ---------- 一個圖層的解剖模型 ---------- */
function LayerModel({ layer, file, flagged }: { layer: LayerKey; file: string; flagged: string[] }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/${file}.glb`, false, true);
  const layerOpacity = useStore((s) => s.opacity[layer]);
  const hidden = useStore((s) => s.hidden);
  const marks = useMarks();

  const meshes = useMemo(() => {
    const out: { mesh: THREE.Mesh; part: PartInfo; mat: THREE.MeshStandardMaterial }[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const id = PART_MAP[mesh.name] ? mesh.name : mesh.parent?.name ?? '';
      const part = PART_MAP[id];
      if (!part || /pubic/.test(part.en)) { mesh.visible = false; return; }
      if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
      const style = partStyle(part);
      const mat = new THREE.MeshStandardMaterial({ color: style.color, roughness: style.roughness, metalness: 0, side: THREE.FrontSide });
      mesh.material = mat;
      mesh.userData.partId = id;
      mesh.renderOrder = layer === 'skin' ? 3 : layer === 'muscle' ? 2 : layer === 'skeleton' ? 1 : 0;
      out.push({ mesh, part, mat });
    });
    return out;
  }, [scene, layer]);

  useEffect(() => {
    const hide = new Set(hidden);
    for (const { mesh, part, mat } of meshes) {
      const mark = markOf(part, flagged, marks);
      const layerLevel = isLayerOrgan(part.organ);
      mesh.visible = !hide.has(part.id) && (layerOpacity > 0.01 || (mark === 'selected' && !layerLevel));
      applyMaterial(mat, layerOpacity, mark, layerLevel);
    }
  }, [meshes, layerOpacity, hidden, flagged, marks.selectedOrgan, marks.selectedPart, marks.spotlight]); // eslint-disable-line

  useFrame(({ clock }) => {
    const k = useStore.getState().reduceMotion ? 0.2 : 0.2 + Math.sin(clock.elapsedTime * 3) * 0.14;
    for (const { mat } of meshes) if (mat.userData.pulse) mat.emissiveIntensity = k;
  });

  return <primitive object={scene} onClick={(e: ThreeEvent<MouseEvent>) => pick(e, (e.object as THREE.Mesh).material && ((e.object as THREE.Mesh).material as THREE.Material).opacity)} />;
}

/* ---------- 鏡頭聚焦 ---------- */
type Controls = { target: THREE.Vector3; update(): void; addEventListener(t: string, f: () => void): void; removeEventListener(t: string, f: () => void): void };
function CameraRig() {
  const { selectedOrgan, selectedPart, spotlight } = useMarks();
  const focusOrgans = useStore((s) => s.focusOrgans);
  const reduceMotion = useStore((s) => s.reduceMotion);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const anim = useRef<{ target: THREE.Vector3; pos: THREE.Vector3 } | null>(null);

  useEffect(() => {
    if (!controls) return;
    // 優先順序：點選的部位 → 選取的器官 → 主題故事要框住的器官
    const b: Bounds = selectedPart && PART_MAP[selectedPart] ? PART_MAP[selectedPart]
      : selectedOrgan ? ORGAN_BOUNDS[selectedOrgan] ?? BODY
      : focusOrgans ? unionBounds(focusOrgans)
      : spotlight && spotlight.length === 1 ? ORGAN_BOUNDS[spotlight[0]] ?? BODY : BODY;
    const whole = b.r > 0.6;
    const target = new THREE.Vector3(...b.c);
    const half = THREE.MathUtils.degToRad(camera.fov / 2);
    const fit = whole ? Math.max(1, 0.74 / aspect) : Math.max(1, 0.9 / aspect);
    const dist = Math.max(0.22, (Math.max(b.r, 0.03) / Math.tan(half)) * (whole ? 1.02 : 1.5) * fit);
    // 保留使用者目前的觀看方向，只改變距離與目標
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (whole) dir.set(dir.x, 0.05, dir.z).normalize();
    // 故事模式由正前方略偏側面觀看，器官比較不會互相遮擋
    if (focusOrgans && !selectedOrgan && !selectedPart) dir.set(0.32, 0.12, 1).normalize();
    anim.current = { target, pos: target.clone().add(dir.multiplyScalar(dist)) };
  }, [selectedOrgan, selectedPart, spotlight, focusOrgans, controls, camera, aspect]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => { anim.current = null; if (useStore.getState().autoRotate) useStore.getState().setAutoRotate(false); };
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);

  useFrame((_, dt) => {
    if (!anim.current || !controls) return;
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    controls.target.lerp(anim.current.target, k);
    camera.position.lerp(anim.current.pos, k);
    controls.update();
    if (camera.position.distanceTo(anim.current.pos) < 0.002) anim.current = null;
  });
  return null;
}

/* ---------- 訊號路徑：以流動光點示意器官之間的訊號（例如眼睛到大腦的光線訊號） ---------- */
const FLOW_N = 16;
function FlowPath({ from, to }: { from: string; to: string }) {
  const reduceMotion = useStore((s) => s.reduceMotion);
  const curve = useMemo(() => {
    const a = new THREE.Vector3(...ORGAN_BOUNDS[from].c), b = new THREE.Vector3(...ORGAN_BOUNDS[to].c);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.z += 0.06 + a.distanceTo(b) * 0.25; // 往身體前方拱起，避免被器官擋住
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  }, [from, to]);
  const line = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.0018, 6, false), [curve]);
  const dots = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const len = curve.getLength();
  const dot = Math.min(0.0065, Math.max(0.0028, len * 0.03)); // 短路徑（例如眼睛到大腦）用較小的光點
  useEffect(() => () => line.dispose(), [line]);
  useFrame(({ clock }) => {
    if (!dots.current) return;
    const t = reduceMotion ? 0 : clock.elapsedTime;
    for (let i = 0; i < FLOW_N; i++) {
      const u = (i / FLOW_N + t * (0.11 / Math.max(0.15, len))) % 1;
      tmp.position.copy(curve.getPoint(u));
      tmp.scale.setScalar(dot * (0.35 + 0.65 * Math.sin(Math.PI * u)));
      tmp.updateMatrix();
      dots.current.setMatrixAt(i, tmp.matrix);
    }
    dots.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <mesh geometry={line} renderOrder={10} raycast={() => null}>
        <meshBasicMaterial color="#ffd166" transparent opacity={0.45} depthTest={false} />
      </mesh>
      <instancedMesh ref={dots} args={[undefined, undefined, FLOW_N]} renderOrder={11} raycast={() => null}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#fff3b0" transparent opacity={0.95} depthTest={false} />
      </instancedMesh>
    </group>
  );
}
function Flows() {
  const flows = useStore((s) => s.flows);
  if (!flows) return null;
  return <>{flows.filter(([a, b]) => ORGAN_BOUNDS[a] && ORGAN_BOUNDS[b]).map(([a, b]) => <FlowPath key={`${a}-${b}`} from={a} to={b} />)}</>;
}

/* 攝影棚式環境光，讓骨骼、肌肉、器官表面有立體的明暗與反光 */
function Studio() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => { scene.environment = null; env.dispose(); pmrem.dispose(); };
  }, [gl, scene]);
  return null;
}

/* 讓外部（報告）可以擷取目前 3D 畫面 */
function CaptureBridge() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    useStore.setState({
      capture: () => {
        try { gl.render(scene, camera); return gl.domElement.toDataURL('image/jpeg', 0.88); } catch { return null; }
      },
    });
    return () => { useStore.setState({ capture: null }); };
  }, [gl, scene, camera]);
  return null;
}

function Label() {
  const { selectedOrgan, selectedPart } = useMarks();
  const part = selectedPart ? PART_MAP[selectedPart] : null;
  const b = part ?? (selectedOrgan ? ORGAN_BOUNDS[selectedOrgan] : null);
  if (!b || b.r > 0.6) return null;
  const text = part ? partLabel(part) : ORGAN_MAP[selectedOrgan!].name;
  return (
    <Html position={[b.c[0], b.c[1] + b.r * 0.55 + 0.015, b.c[2]]} center zIndexRange={[5, 0]}>
      <div className="organ-tag">{text}</div>
    </Html>
  );
}

/** Suspense fallback：掛載期間代表有圖層正在下載 */
function LoadFlag({ onProgress }: { onProgress(delta: number): void }) {
  useEffect(() => { onProgress(1); return () => onProgress(-1); }, [onProgress]);
  return null;
}

function Scene({ flagged, onProgress }: { flagged: string[]; onProgress(delta: number): void }) {
  const opacity = useStore((s) => s.opacity);
  const selectedOrgan = useStore((s) => s.selectedOrgan);
  const autoRotate = useStore((s) => s.autoRotate);
  const reduceMotion = useStore((s) => s.reduceMotion);
  // 圖層第一次需要顯示時才下載，之後保留在記憶體
  const [mounted, setMounted] = useState<LayerKey[]>([]);
  useEffect(() => {
    const need = PEEL_ORDER.filter((k) => (opacity[k] > 0.01 || (k === 'organ' && !!selectedOrgan)) && !mounted.includes(k));
    if (need.length) setMounted((m) => [...m, ...need]);
  }, [opacity, selectedOrgan, mounted]);

  return (
    <>
      <color attach="background" args={['#dfe6ec']} />
      <Studio />
      <hemisphereLight args={['#ffffff', '#b9c4cf', 0.55]} />
      <directionalLight position={[1.5, 2.5, 3]} intensity={1.5} />
      <directionalLight position={[-2.5, 1.5, -2]} intensity={0.6} color="#dbe9ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]} raycast={() => null}>
        <circleGeometry args={[0.75, 64]} /><meshBasicMaterial color="#cdd6df" />
      </mesh>

      {mounted.flatMap((layer) => LAYER_FILES[layer].map((file) => (
        <Suspense key={file} fallback={<LoadFlag onProgress={onProgress} />}>
          <LayerModel layer={layer} file={file} flagged={flagged} />
        </Suspense>
      )))}
      <Flows />
      <Label />

      <OrbitControls makeDefault target={BODY.c} minDistance={0.12} maxDistance={8} enableDamping dampingFactor={0.12} autoRotate={autoRotate && !reduceMotion} autoRotateSpeed={0.7} />
      <CameraRig />
      <CaptureBridge />
    </>
  );
}

export default function BodyViewer({ flagged }: { flagged: string[] }) {
  const [loading, setLoading] = useState(0);
  const onProgress = useMemo(() => (d: number) => setLoading((n) => Math.max(0, n + d)), []);
  return (
    <>
      <Canvas
        camera={{ position: [0.9, 0.95, 4.2], fov: 30, near: 0.02, far: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onPointerMissed={() => useStore.getState().selectOrgan(null)}
      >
        <Scene flagged={flagged} onProgress={onProgress} />
      </Canvas>
      {loading > 0 && <div className="loading over">載入解剖模型…</div>}
    </>
  );
}
