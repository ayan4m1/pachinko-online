import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Physics,
  RapierRigidBody,
  BallCollider,
  RigidBody
} from '@react-three/rapier';
import {
  Center,
  Environment,
  OrbitControls,
  useTexture
} from '@react-three/drei';

import { getMaterialUrl, ballMaterial, boardShape } from '../utils';
import CadModel from './CadModel';

export default function Scene() {
  const ballRef = useRef<RapierRigidBody>(null);
  const inited = useRef(false);
  const ballMat = useTexture(
    Object.fromEntries(
      Object.entries(ballMaterial.textures).map(([key, val]) => [
        key,
        getMaterialUrl(ballMaterial.id, val)
      ])
    )
  );

  /* eslint-disable-next-line react-hooks/immutability */
  useFrame(() => {
    if (inited.current || !ballRef.current) {
      return;
    }

    inited.current = true;

    const strength = 10;
    const torque = 2;

    ballRef.current.applyImpulse(
      {
        x: 0,
        y: 5,
        z: (Math.random() - 0.5) * strength
      },
      true
    );
    ballRef.current.applyTorqueImpulse(
      {
        x: (Math.random() - 0.5) * torque,
        y: (Math.random() - 0.5) * torque,
        z: (Math.random() - 0.5) * torque
      },
      true
    );
  });

  return (
    <Physics gravity={[0, -9.6, 0]}>
      <OrbitControls />
      <Environment preset="apartment" />
      <Center>
        <CadModel shape={boardShape} />
        <RigidBody colliders="cuboid" position={[2.5, 12, 8]} type="fixed">
          <mesh>
            <boxGeometry args={[1, 24, 15]} />
            <meshPhysicalMaterial color="blue" opacity={0.4} transparent />
          </mesh>
        </RigidBody>
      </Center>
      <RigidBody
        colliders={false}
        position={[-1, 20, 0]}
        ref={ballRef}
        type="dynamic"
      >
        <mesh>
          <sphereGeometry args={[0.6, 64, 64]} />
          <meshPhysicalMaterial {...ballMat} />
        </mesh>
        <BallCollider args={[0.6]} friction={0.4} />
      </RigidBody>
    </Physics>
  );
}
