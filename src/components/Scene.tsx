import { rgb, hsl, RGBColor } from 'd3-color';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { MeshToonMaterial, Object3D } from 'three';
import { useFrame } from '@react-three/fiber';
import {
  Physics,
  RapierRigidBody,
  BallCollider,
  RigidBody,
  useRapier
} from '@react-three/rapier';
import {
  Center,
  OrbitControls,
  OrthographicCamera,
  Outlines,
  Text3D
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

/*
  A real pachinko ball is 11mm across and ours is 0.6 units across (CAD
  ballDiameter of 3 at the CadModel scale of 0.2), which fixes the scale of the
  world at ~54.5 units per meter. The board agrees: the 120-unit backboard
  renders 24 units long, or 0.44m, against a real playfield of roughly 0.45m.
*/
const ballRadius = 0.3;
const ballDiameterMeters = 0.011;
const unitsPerMeter = (ballRadius * 2) / ballDiameterMeters; // ~54.5

// time is unscaled - rapier steps in real seconds - so acceleration converts by
// the length scale alone
// const earthGravity = 9.6 * unitsPerMeter; // ~523.6 units/s^2

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

/*
  Rapier's internal tolerances - contact prediction distance, sleep thresholds,
  CCD margins - are tuned assuming 1 unit is roughly 1 meter. At ~54.5 units per
  meter the ball is small and fast enough to tunnel through the pins and jitter
  on contact, so tell the world our actual scale and let it rescale them.
  @react-three/rapier doesn't surface this as a <Physics> prop, so it has to be
  set on the world from a child.
*/
function WorldScale() {
  const { world } = useRapier();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    world.lengthUnit = unitsPerMeter;
  }, [world]);

  return null;
}

interface IProps {
  addToScore: (toAdd: number) => void;
  clearReset: () => void;
  needsReset?: boolean;
  paused?: boolean;
  score: number;
  seed: string;
  triggerReset: () => void;
}

export default function Scene({
  addToScore,
  clearReset,
  needsReset = false,
  paused = false,
  score,
  seed,
  triggerReset
}: IProps) {
  // todo: prevent this from running multiple times on mount
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

    return result;
    /* eslint-enable react-hooks/purity */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);
  const ballObjRef = useRef<Object3D | null>(null);
  const ballRef = useRef<RapierRigidBody | null>(null);
  const inited = useRef(false);
  const ballMat = useMaterial(ballMaterial);
  const handleScoreCollision = useCallback(
    (index: number) => () => {
      const pointBin = pointBins[index];

      addToScore(pointBin.score);
      triggerReset();
    },
    [pointBins, addToScore, triggerReset]
  );

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
      <WorldScale />
      <OrthographicCamera makeDefault position={[20, 0, 0]} zoom={25} />
      <OrbitControls />
      <ambientLight color="aliceblue" />
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
      <Text3D
        font="/fonts/dm_mono.json"
        position={[0, 13, 13]}
        rotation={[0, Math.PI / 2, 0]}
      >
        Score: {score}
        <meshStandardMaterial color="green" />
      </Text3D>
      <Center>
        <CadModel
          castShadow
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
            <boxGeometry args={[1, 24, boardWidth]} />
            <meshPhysicalMaterial color={0xa0d2e9} opacity={0.4} transparent />
          </mesh>
        </RigidBody>
        {pointBins.map((bin, i) => (
          <RigidBody
            colliders="cuboid"
            key={i}
            onCollisionEnter={handleScoreCollision(i)}
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
          <sphereGeometry args={[ballRadius, 64, 64]} />
          <meshPhysicalMaterial {...ballMat} />
          <Outlines color={0x262323} thickness={4} />
        </mesh>
        <BallCollider args={[ballRadius]} friction={0.4} />
      </RigidBody>
    </Physics>
  );
}
