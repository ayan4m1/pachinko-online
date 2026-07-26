import { BufferGeometry } from 'three';
import { useEffect, useState } from 'react';
import { RigidBody } from '@react-three/rapier';
import stlSerializer from '@jscad/stl-serializer';
import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

interface IProps {
  shape: () => Geom3;
}

export default function CadModel({ shape }: IProps) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

  useEffect(() => {
    const geometry = shape();

    const rawData = stlSerializer.serialize({ binary: true }, geometry);
    const blob = new Blob(rawData);

    blob.arrayBuffer().then((buffer) => {
      const loader = new STLLoader();
      const parsed = loader.parse(buffer);

      parsed.computeVertexNormals();

      setGeometry(parsed);
    });
  }, []);

  if (!geometry) {
    return null;
  }

  return (
    <RigidBody colliders="trimesh" type="fixed">
      <mesh
        geometry={geometry}
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, Math.PI / 2, 0]}
        scale={0.2}
      >
        <meshStandardMaterial color="orange" roughness={0.3} />
      </mesh>
    </RigidBody>
  );
}
