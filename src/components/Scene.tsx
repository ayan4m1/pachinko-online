import { Group } from 'three';
import { Center, Environment, useGLTF, useTexture } from '@react-three/drei';

import boardModel from '../assets/models/board.gltf';
import { getMaterialUrl, steelMaterial } from '../utils';
import { Physics, RigidBody } from '@react-three/rapier';

export default function Scene() {
  const { scene } = useGLTF(boardModel) as { scene: Group };

  const props = useTexture(
    Object.fromEntries(
      Object.entries(steelMaterial.textures).map(([key, val]) => [
        key,
        getMaterialUrl(steelMaterial.id, val)
      ])
    )
  );

  return (
    <Physics gravity={[0, -9.6, 0]}>
      <Environment preset="dawn" />
      <Center>
        <RigidBody colliders="trimesh" lockRotations lockTranslations>
          <primitive object={scene} rotation={[0, 0, -Math.PI / 2]} scale={0.2}>
            <meshStandardMaterial color="#ff0000" />
          </primitive>
        </RigidBody>
      </Center>
      <RigidBody colliders="ball">
        <mesh position={[1, 10, 0]}>
          <sphereGeometry args={[0.5, 32, 32]}>
            <meshPhysicalMaterial {...props} />
          </sphereGeometry>
        </mesh>
      </RigidBody>
    </Physics>
  );
}
