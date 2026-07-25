import { Group, MeshStandardMaterial } from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Physics,
  RigidBody,
  RapierRigidBody,
  BallCollider
} from '@react-three/rapier';
import {
  Center,
  Environment,
  OrbitControls,
  useGLTF,
  useTexture
} from '@react-three/drei';

import boardModel from '../assets/models/board.gltf';
import { getMaterialUrl, ballMaterial, steelMaterial } from '../utils';

export default function Scene() {
  const ballRef = useRef<RapierRigidBody>(null);
  const inited = useRef(false);
  const { scene, materials } = useGLTF(boardModel) as {
    scene: Group;
    materials: Record<string, MeshStandardMaterial>;
  };

  const brushedSteelMat = useTexture(
    Object.fromEntries(
      Object.entries(steelMaterial.textures).map(([key, val]) => [
        key,
        getMaterialUrl(steelMaterial.id, val)
      ])
    )
  );

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

    const mat = materials['x1'];
    /* eslint-disable-next-line react-hooks/immutability */
    mat.map = brushedSteelMat.map;
    mat.roughnessMap = brushedSteelMat.roughnessMap;
    mat.normalMap = brushedSteelMat.normalMap;
    mat.metalnessMap = brushedSteelMat.metalnessMap;
    mat.needsUpdate = true;

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
        <RigidBody colliders="trimesh" type="fixed">
          <primitive
            object={scene}
            rotation={[0, 0, -Math.PI / 2]}
            scale={0.2}
          />
        </RigidBody>
        <RigidBody colliders="cuboid" position={[2.5, -12, -8.5]} type="fixed">
          <mesh>
            <boxGeometry args={[1, 24, 15]} />
            <meshPhysicalMaterial color="blue" opacity={0.4} transparent />
          </mesh>
        </RigidBody>
      </Center>
      <RigidBody
        colliders={false}
        position={[0, 15, 0]}
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
