import { CollisionEnterHandler, RigidBody } from '@react-three/rapier';
import { PointBin } from '../types';

interface IProps {
  bin: PointBin;
  index: number;
  onCollision: CollisionEnterHandler;
}

export default function PointBinModel({ bin, index, onCollision }: IProps) {
  return (
    <RigidBody
      colliders="cuboid"
      key={index}
      onCollisionEnter={onCollision}
      position={[5, 0, bin.center]}
      type="fixed"
    >
      <mesh receiveShadow>
        <boxGeometry args={[5, 10, bin.width]} />
        <meshPhysicalMaterial color={bin.color} />
      </mesh>
    </RigidBody>
  );
}
