import { useEffect, useState } from 'react';
import {
  RigidBody,
  RigidBodyAutoCollider,
  RigidBodyTypeString
} from '@react-three/rapier';
import { Edges, Outlines } from '@react-three/drei';
import { BufferGeometry, Material } from 'three';
import stlSerializer from '@jscad/stl-serializer';
import { ThreeElements } from '@react-three/fiber';
import { Geom3 } from '@jscad/modeling/src/geometries/types';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

import { computeBoxUVs } from '../utils';

type IProps = {
  colliders?: RigidBodyAutoCollider;
  shape: (seed: string) => Geom3;
  seed: string;
  material: Material;
  outline?: boolean;
  physicsType?: RigidBodyTypeString;
} & ThreeElements['mesh'];

export default function CadModel({
  colliders = false,
  shape,
  seed,
  material,
  outline = false,
  physicsType = 'dynamic',
  ...props
}: IProps) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);

  useEffect(() => {
    const geometry = shape(seed);
    const rawData = stlSerializer.serialize({ binary: true }, geometry);
    const blob = new Blob(rawData);

    blob.arrayBuffer().then((buffer) => {
      const loader = new STLLoader();
      const parsed = loader.parse(buffer);

      parsed.computeVertexNormals();
      computeBoxUVs(parsed);

      setGeometry(parsed);
    });
  }, [shape, seed, outline]);

  if (!geometry) {
    return null;
  }

  return (
    <RigidBody colliders={colliders} type={physicsType}>
      <mesh geometry={geometry} material={material} {...props}>
        <Outlines angle={0.05} color={0x262323} thickness={4} />
        <Edges color={0x262323} lineWidth={2} threshold={15} />
      </mesh>
    </RigidBody>
  );
}
