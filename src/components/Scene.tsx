import { useCallback, useMemo, useRef } from 'react';
import { MeshToonMaterial, Object3D } from 'three';
import { useFrame } from '@react-three/fiber';
import { Physics, RapierRigidBody } from '@react-three/rapier';
import { Center, OrbitControls, OrthographicCamera } from '@react-three/drei';

import BallModel from './BallModel';
import CadModel from './CadModel';
import GlassModel from './GlassModel';
import PointBinModel from './PointBinModel';
import StaticText from './StaticText';
import {
  ballRadius,
  boardShape,
  createPointBins,
  createThreeToneTexture,
  unitsPerMeter
} from '../utils';

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

interface IProps {
  addToScore: (toAdd: number) => void;
  clearReset: () => void;
  coins: number;
  needsReset?: boolean;
  paused?: boolean;
  score: number;
  seed: string;
  triggerReset: () => void;
}

export default function Scene({
  addToScore,
  clearReset,
  coins,
  needsReset = false,
  paused = false,
  score,
  seed,
  triggerReset
}: IProps) {
  // todo: prevent this from running multiple times on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pointBins = useMemo(() => createPointBins(), [seed]);
  const ballObjRef = useRef<Object3D | null>(null);
  const ballRef = useRef<RapierRigidBody | null>(null);
  const inited = useRef(false);
  const handleScoreCollision = useCallback(
    (index: number) => () => {
      if (coins === 0) {
        return;
      }

      const pointBin = pointBins[index];

      addToScore(pointBin.score);
      triggerReset();
    },
    [pointBins, addToScore, triggerReset, coins]
  );
  const binHandlers = useMemo(
    () => pointBins.map((_, i) => handleScoreCollision(i)),
    [handleScoreCollision, pointBins]
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
    if (
      ballObjRef.current?.parent &&
      ballRef.current &&
      needsReset &&
      coins > 0
    ) {
      ballRef.current.setTranslation({ x: -5, y: 100, z: 0 }, true);
      clearReset?.();
    }

    if (inited.current || !ballRef.current) {
      return;
    }

    inited.current = true;

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
      <StaticText
        coins={coins}
        maxCoins={5}
        maxScore={pointBins.reduce((total, bin) => total + bin.score, 0)}
        score={score}
      />
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
        <GlassModel />
        {pointBins.map((bin, i) => (
          <PointBinModel
            bin={bin}
            index={i}
            key={i}
            onCollision={binHandlers[i]}
          />
        ))}
      </Center>
      <BallModel bodyRef={ballRef} meshRef={ballObjRef} />
    </Physics>
  );
}
