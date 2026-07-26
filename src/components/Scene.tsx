import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Physics,
  RapierRigidBody,
  BallCollider,
  RigidBody
} from '@react-three/rapier';
import { Center, Environment, OrbitControls } from '@react-three/drei';

import { ballMaterial, boardShape, steelMaterial } from '../utils';
import CadModel from './CadModel';
import useMaterial from '../hooks/useMaterial';
import { MeshPhysicalMaterial } from 'three';

export default function Scene() {
  const ballRef = useRef<RapierRigidBody>(null);
  const inited = useRef(false);

  const steelMat = useMaterial(steelMaterial);
  const ballMat = useMaterial(ballMaterial);

  console.dir(steelMat);

  const steel = useMemo(
    () =>
      new MeshPhysicalMaterial({
        ...steelMat
      }),
    [steelMat]
  );

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
        <CadModel material={steel} shape={boardShape} />
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
