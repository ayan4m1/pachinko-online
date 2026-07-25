import { Group } from 'three';
import { useCallback, useRef } from 'react';
import {
  Physics,
  RigidBody,
  RapierRigidBody,
  BallCollider
} from '@react-three/rapier';
import { Center, Environment, OrbitControls, useGLTF } from '@react-three/drei';

import boardModel from '../assets/models/board.gltf';
// import { getMaterialUrl, steelMaterial } from '../utils';
import { useFrame } from '@react-three/fiber';

export default function Scene() {
  const ballRef = useRef<RapierRigidBody>(null);
  const wasSpun = useRef(false);
  const { scene } = useGLTF(boardModel) as { scene: Group };

  // const props = useTexture(
  //   Object.fromEntries(
  //     Object.entries(steelMaterial.textures).map(([key, val]) => [
  //       key,
  //       getMaterialUrl(steelMaterial.id, val)
  //     ])
  //   )
  // );

  const applyRandomSpin = useCallback(() => {
    if (!ballRef.current) {
      return;
    }

    const strength = 10;

    ballRef.current.applyImpulse(
      {
        x: (Math.random() - 0.5) * strength,
        y: 10,
        z: (Math.random() - 0.5) * strength
      },
      true
    );
    ballRef.current.applyTorqueImpulse(
      {
        x: (Math.random() - 0.5) * strength,
        y: (Math.random() - 0.5) * strength,
        z: (Math.random() - 0.5) * strength
      },
      true
    );
  }, []);

  useFrame(() => {
    if (wasSpun.current || !ballRef.current) {
      return;
    }

    wasSpun.current = true;
    applyRandomSpin();
  });

  return (
    <Physics gravity={[0, -9.6, 0]}>
      <OrbitControls />
      <Environment preset="dawn" />
      <Center>
        <RigidBody colliders="trimesh" type="fixed">
          <primitive
            object={scene}
            rotation={[0, 0, -Math.PI / 2]}
            scale={0.2}
          />
        </RigidBody>
        <RigidBody position={[3, -12, -8.5]} type="fixed">
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
        <mesh name="ball">
          <sphereGeometry args={[0.75, 64, 64]} />
          {/* <meshPhysicalMaterial {...props} /> */}
          <meshStandardMaterial color="red" />
        </mesh>
        <BallCollider args={[0.75]} density={2} friction={0.4} />
      </RigidBody>
    </Physics>
  );
}
