import { Environment, Lightformer } from '@react-three/drei';

/** 衛教動畫共用的攝影棚式燈光：主光、補光與不需下載的環境反射 */
export default function StudioLights({ warm = '#ffe2d6', cool = '#d6e8ff' }: { warm?: string; cool?: string }) {
  return (
    <>
      <ambientLight intensity={0.28} />
      <directionalLight position={[2, 4, 5]} intensity={1.5} />
      <directionalLight position={[-4, 1, -2]} intensity={0.5} color={warm} />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={2} position={[0, 4, 4]} scale={[8, 3, 1]} />
        <Lightformer intensity={1.1} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} color={warm} />
        <Lightformer intensity={0.7} position={[5, -1, -2]} rotation-y={-Math.PI / 2} scale={[6, 4, 1]} color={cool} />
      </Environment>
    </>
  );
}
