import { useEffect, useState } from 'react';
import { RigidBody } from '@react-three/rapier';
import { BufferGeometry, Material } from 'three';
import stlSerializer from '@jscad/stl-serializer';
import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

import { computeBoxUVs } from '../utils';

interface IProps {
  shape: () => Geom3;
  material: Material;
}

export default function CadModel({ shape, material }: IProps) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

  useEffect(() => {
    const geometry = shape();

    const rawData = stlSerializer.serialize({ binary: true }, geometry);
    const blob = new Blob(rawData);

    blob.arrayBuffer().then((buffer) => {
      const loader = new STLLoader();
      const parsed = loader.parse(buffer);

      parsed.computeVertexNormals();
      computeBoxUVs(parsed);

      setGeometry(parsed);
    });
  }, [shape]);

  if (!geometry) {
    return null;
  }

  return (
    <RigidBody colliders="trimesh" type="fixed">
      <mesh
        geometry={geometry}
        material={material}
        rotation={[Math.PI / 2, Math.PI / 2, 0]}
        scale={0.2}
      />
    </RigidBody>
  );
}
