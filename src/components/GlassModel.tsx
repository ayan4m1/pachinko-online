import { RigidBody } from '@react-three/rapier';

import { boardWidth } from '../utils';

export default function GlassModel() {
  return (
    <RigidBody colliders="cuboid" position={[12.5, 60, 40]} type="fixed">
      <mesh>
        <boxGeometry args={[5, 120, boardWidth]} />
        <meshPhysicalMaterial color={0xa0d2e9} opacity={0.4} transparent />
      </mesh>
    </RigidBody>
  );
}
