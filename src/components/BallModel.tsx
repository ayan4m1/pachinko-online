import { Ref } from 'react';
import { Object3D } from 'three';
import { Outlines } from '@react-three/drei';
import { BallCollider, RapierRigidBody, RigidBody } from '@react-three/rapier';

import useMaterial from '../hooks/useMaterial';
import { ballMaterial, ballRadius } from '../utils';

interface IProps {
  bodyRef: Ref<RapierRigidBody>;
  meshRef: Ref<Object3D>;
}

export default function BallModel({ bodyRef, meshRef }: IProps) {
  const ballMat = useMaterial(ballMaterial);

  return (
    <RigidBody
      ccd
      colliders={false}
      position={[-5, 100, 0]}
      ref={bodyRef}
      softCcdPrediction={ballRadius}
      type="dynamic"
    >
      <mesh castShadow receiveShadow ref={meshRef}>
        <sphereGeometry args={[ballRadius, 64, 64]} />
        <meshPhysicalMaterial {...ballMat} />
        <Outlines color={0x262323} thickness={2} />
      </mesh>
      <BallCollider args={[ballRadius]} friction={0.4} />
    </RigidBody>
  );
}
