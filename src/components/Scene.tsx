import { Fragment, useMemo, useRef } from 'react';
import { MeshToonMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import {
  Physics,
  RapierRigidBody,
  BallCollider,
  RigidBody
} from '@react-three/rapier';
import { Center, OrbitControls } from '@react-three/drei';

import CadModel from './CadModel';
import useMaterial from '../hooks/useMaterial';
import { ballMaterial, boardShape, createThreeToneTexture } from '../utils';

interface IProps {
  seed: string;
  paused?: boolean;
}

export default function Scene({ seed, paused = false }: IProps) {
  const ballRef = useRef<RapierRigidBody | null>(null);
  const inited = useRef(false);
  const ballMat = useMaterial(ballMaterial);

  const toonGradient = createThreeToneTexture('#3d3764', '#93a5cb', '#ffffff');
  const steel = useMemo(
    () =>
      new MeshToonMaterial({
        color: 0x7a7f80, // #7a7f80
        gradientMap: toonGradient
      }),
    [toonGradient]
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
    <Fragment>
      <Physics gravity={[0, -26, 0]} paused={paused}>
        <OrbitControls />
        <ambientLight color="white" />
        <directionalLight castShadow intensity={10} position={[5, 16, 12]} />
        <mesh position={[5, 16, 12]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        <Center>
          <CadModel
            colliders="trimesh"
            material={steel}
            outline
            physicsType="fixed"
            rotation={[Math.PI / 2, Math.PI / 2, 0]}
            scale={0.2}
            seed={seed}
            shape={boardShape}
          />
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
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.6, 64, 64]} />
            <meshPhysicalMaterial {...ballMat} />
          </mesh>
          <BallCollider args={[0.6]} friction={0.4} />
        </RigidBody>
      </Physics>
    </Fragment>
  );
}
