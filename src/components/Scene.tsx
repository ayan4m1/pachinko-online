import { rgb, hsl, RGBColor } from 'd3-color';
import { useMemo, useRef } from 'react';
import { MeshToonMaterial, Object3D } from 'three';
import { useFrame } from '@react-three/fiber';
import {
  Physics,
  RapierRigidBody,
  BallCollider,
  RigidBody
} from '@react-three/rapier';
import {
  Center,
  OrbitControls,
  OrthographicCamera,
  Outlines
} from '@react-three/drei';

import CadModel from './CadModel';
import useMaterial from '../hooks/useMaterial';
import {
  ballMaterial,
  boardShape,
  boardWidth,
  createThreeToneTexture
} from '../utils';
import { PointBin } from '../types';

const rgbToHexColor = (color: RGBColor) =>
  (color.r << 16) | (color.g << 8) | color.b;

const minScore = 50;
const maxScore = 1500;
const scoreStep = 50;
const scoreMinWidth = 2;
const scoreMaxWidth = 12;
const scoreJitter = 0.2;

// narrow bins pay the most: 500 at width 2 falling linearly to 50 at width 12
const widthToScore = (width: number) => {
  const t = Math.min(
    1,
    Math.max(0, (width - scoreMinWidth) / (scoreMaxWidth - scoreMinWidth))
  );
  const base = maxScore + t * (minScore - maxScore);
  const jittered = base * (1 - scoreJitter + Math.random() * scoreJitter * 2);

  return Math.max(scoreStep, Math.round(jittered / scoreStep) * scoreStep);
};

interface IProps {
  clearReset: () => void;
  seed: string;
  needsReset?: boolean;
  paused?: boolean;
}

export default function Scene({
  clearReset,
  seed,
  needsReset = false,
  paused = false
}: IProps) {
  const pointBins = useMemo(() => {
    /* eslint-disable react-hooks/purity */
    const result: PointBin[] = [];
    const points = 3 + Math.round(Math.random() * 3);

    let remainingWidth = 16;
    let yOffset = 0;
    for (let i = 0; i < points; i++) {
      const color = rgbToHexColor(
        rgb(
          hsl(
            Math.random() * 360,
            0.5 + Math.random() * 0.5,
            0.4 + Math.random() * 0.6
          )
        )
      );
      const minWidth = 2;
      const maxWidth = remainingWidth - minWidth * (points - i - 1);
      const width =
        i + 1 == points
          ? remainingWidth
          : minWidth + Math.random() * Math.max(0, maxWidth - minWidth);
      const score = widthToScore(width);
      const center = yOffset + width / 2.0;

      const entry: PointBin = {
        center,
        color,
        score,
        width
      };

      result.push(entry);

      remainingWidth -= entry.width;
      yOffset += entry.width;
    }

    console.dir(result);

    return result;
    /* eslint-enable react-hooks/purity */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  const ballObjRef = useRef<Object3D | null>(null);
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
    if (ballObjRef.current?.parent && ballRef.current && needsReset) {
      ballRef.current.setTranslation({ x: -1, y: 20, z: 0 }, true);
      clearReset?.();
    }

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
    <Physics gravity={[0, -26, 0]} paused={paused}>
      <OrthographicCamera makeDefault position={[20, 0, 0]} zoom={25} />
      <OrbitControls />
      <ambientLight color="white" />
      {/*
        The default directional shadow camera is a 10x10 ortho frustum, which
        only covers part of the 24x16 board - pegs outside it get no shadow at
        all. Widen it to enclose the whole board (plus the guide wall and the
        ball's spawn height) and raise the map size to keep the thin pegs from
        aliasing away. The biases suppress acne on the near-tangent sides of
        the peg cylinders.
      */}
      <directionalLight
        castShadow
        intensity={5}
        position={[5, 16, 2]}
        shadow-bias={-0.0005}
        shadow-camera-bottom={-20}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-near={0.5}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.02}
      />
      <Center>
        <CadModel
          castShadow
          colliders="trimesh"
          material={steel}
          outline
          physicsType="fixed"
          receiveShadow
          rotation={[Math.PI / 2, Math.PI / 2, 0]}
          scale={0.2}
          seed={seed}
          shape={boardShape}
        />
        <RigidBody colliders="cuboid" position={[2.5, 12, 8]} type="fixed">
          <mesh>
            <boxGeometry args={[1, 24, boardWidth]} />
            <meshPhysicalMaterial color={0xa0d2e9} opacity={0.4} transparent />
          </mesh>
        </RigidBody>
        {pointBins.map((bin, i) => (
          <RigidBody
            colliders="cuboid"
            key={i}
            position={[1, 0, bin.center]}
            type="fixed"
          >
            <mesh>
              <boxGeometry args={[1, 2, bin.width]} />
              <meshPhysicalMaterial color={bin.color} />
            </mesh>
          </RigidBody>
        ))}
      </Center>
      <RigidBody
        colliders={false}
        position={[-1, 20, 0]}
        ref={ballRef}
        type="dynamic"
      >
        <mesh castShadow receiveShadow ref={ballObjRef}>
          <sphereGeometry args={[0.6, 64, 64]} />
          <meshPhysicalMaterial {...ballMat} />
          <Outlines color={0x262323} thickness={4} />
        </mesh>
        <BallCollider args={[0.6]} friction={0.4} />
      </RigidBody>
    </Physics>
  );
}
