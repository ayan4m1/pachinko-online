import { rgb, hsl, RGBColor } from 'd3-color';
import { useCallback, useMemo, useRef } from 'react';
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
  World units are CAD units - the model renders unscaled. A real pachinko ball is
  11mm across and ours is 3 units across (the CAD ballDiameter), which fixes the
  scale of the world at ~272.7 units per meter. The board agrees: the 120-unit
  backboard is 0.44m long, against a real playfield of roughly 0.45m.
*/
const ballRadius = 1.5;
const ballDiameterMeters = 0.011;
const unitsPerMeter = (ballRadius * 2) / ballDiameterMeters; // ~272.7

// time is unscaled - rapier steps in real seconds - so acceleration converts by
// the length scale alone
const earthGravity = 9.6 * unitsPerMeter; // ~2618 units/s^2

/*
  earthGravity is a reference value, not a setting: at true scale the ball
  crosses the 120-unit playfield in 0.30s of free fall, and no solver setting
  changes that. A real machine only looks slow because the ball bleeds its
  energy into ~100 nail impacts on the way down, which we cannot reproduce -
  at ~790 units/s a 0.4-unit nail barely deflects it, so it just drops. So the
  board runs in deliberate slow motion. Halving timeScale quarters gravity,
  since t' = t / k means g' = g / k^2.
*/
const timeScale = 1 / 4.5;
const gravity = earthGravity * timeScale * timeScale; // ~129 units/s^2

/*
  Rapier scales its tolerances by lengthUnit - the real speculative-contact
  margin is normalizedPredictionDistance (0.002) * lengthUnit, so this has to
  stay units-per-meter. Sizing it to the ball instead makes nail contacts
  crisper on paper but collapses that margin to 0.006 units, which is nothing
  against a ball moving 1.5 units per step, and the ball starts escaping.
*/
const lengthUnit = unitsPerMeter;

/*
  At ~176 units/s the ball covers 0.49 ball diameters per 1/120s step, so every
  collider gets sampled at least twice on the way past. CCD on the ball covers
  the rest; maxCcdSubsteps defaults to 1, which leaves that sweep little to work
  with.
*/
const timeStep = 1 / 120;
const maxCcdSubsteps = 8;

const minScore = 50;
const maxScore = 1500;
const scoreStep = 50;
const scoreMinWidth = 10;
const scoreMaxWidth = 60;
const scoreJitter = 0.2;

// narrow bins pay the most: 1500 at width 10 falling linearly to 50 at width 60
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

    let remainingWidth = 80;
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
      const minWidth = 10;
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
      ballRef.current.setTranslation({ x: -5, y: 100, z: 0 }, true);
      clearReset?.();
    }

    if (inited.current || !ballRef.current) {
      return;
    }

    inited.current = true;

    /*
      Impulse is mass times delta-v, so quoting the launch as real-world speeds
      and converting keeps it honest through any future rescale - the old raw
      impulses had to be re-guessed every time the scale moved. These reproduce
      the previous ~0.8 m/s launch.
    */
    const mass = ballRef.current.mass();
    const launchSpeed = 0.8 * unitsPerMeter * timeScale;
    const spread = 0.8 * unitsPerMeter * timeScale;
    // angular impulse is inertia times delta-omega, and for a solid sphere that
    // works out to 0.4 * m * r^2 * (surfaceSpeed / r)
    const spin = 0.2 * mass * ballRadius * (1.35 * unitsPerMeter * timeScale);

    ballRef.current.applyImpulse(
      {
        x: 0,
        y: mass * launchSpeed,
        z: mass * spread * (Math.random() - 0.5) * 2
      },
      true
    );
    ballRef.current.applyTorqueImpulse(
      {
        x: (Math.random() - 0.5) * spin,
        y: (Math.random() - 0.5) * spin,
        z: (Math.random() - 0.5) * spin
      },
      true
    );
  });

  return (
    <Physics
      gravity={[0, -gravity, 0]}
      lengthUnit={lengthUnit}
      maxCcdSubsteps={maxCcdSubsteps}
      paused={paused}
      timeStep={timeStep}
    >
      <OrthographicCamera makeDefault position={[100, 0, 0]} zoom={5} />
      <OrbitControls />
      <ambientLight color="aliceblue" />
      {/*
        The default directional shadow camera is a 10x10 ortho frustum, which
        only covers part of the 120x80 board - pegs outside it get no shadow at
        all. Widen it to enclose the whole board (plus the guide wall and the
        spawn height above it) and raise the map size to keep the thin pegs from
        aliasing away. The biases suppress acne on the near-tangent sides of the
        peg cylinders - shadow-bias acts in post-projection depth space and so
        survives a rescale untouched, while normalBias is in world units.
      */}
      <directionalLight
        castShadow
        intensity={5}
        position={[25, 80, 10]}
        shadow-bias={-0.0005}
        shadow-camera-bottom={-100}
        shadow-camera-far={400}
        shadow-camera-left={-100}
        shadow-camera-near={2.5}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.1}
      />
      <Text3D
        font="/fonts/dm_mono.json"
        height={1}
        position={[0, 65, 65]}
        rotation={[0, Math.PI / 2, 0]}
        size={5}
      >
        Score: {score}
        <meshStandardMaterial color="green" />
      </Text3D>
      <Center>
        <CadModel
          colliders="trimesh"
          material={steel}
          outline
          physicsType="fixed"
          receiveShadow
          rotation={[Math.PI / 2, Math.PI / 2, 0]}
          seed={seed}
          shape={boardShape}
        />
        <RigidBody colliders="cuboid" position={[12.5, 60, 40]} type="fixed">
          <mesh>
            <boxGeometry args={[5, 120, boardWidth]} />
            <meshPhysicalMaterial color={0xa0d2e9} opacity={0.4} transparent />
          </mesh>
        </RigidBody>
        {pointBins.map((bin, i) => (
          <RigidBody
            colliders="cuboid"
            key={i}
            onCollisionEnter={handleScoreCollision(i)}
            position={[5, 0, bin.center]}
            type="fixed"
          >
            <mesh receiveShadow>
              <boxGeometry args={[5, 10, bin.width]} />
              <meshPhysicalMaterial color={bin.color} />
            </mesh>
          </RigidBody>
        ))}
      </Center>
      {/*
        ccd sweeps the ball's path so it can never pass through the backboard or
        a scoring bin between steps. softCcdPrediction is the cheaper companion -
        it grows the ball's contact prediction along its motion, which is what
        keeps glancing nail hits from being skipped.
      */}
      <RigidBody
        ccd
        colliders={false}
        position={[-5, 100, 0]}
        ref={ballRef}
        softCcdPrediction={ballRadius}
        type="dynamic"
      >
        <mesh castShadow receiveShadow ref={ballObjRef}>
          <sphereGeometry args={[ballRadius, 64, 64]} />
          <meshPhysicalMaterial {...ballMat} />
          <Outlines color={0x262323} thickness={2} />
        </mesh>
        <BallCollider args={[ballRadius]} friction={0.4} />
      </RigidBody>
    </Physics>
  );
}
