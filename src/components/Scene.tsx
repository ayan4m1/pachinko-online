import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MeshToonMaterial, Object3D } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Physics, RapierRigidBody } from '@react-three/rapier';
import { Center, OrbitControls, OrthographicCamera } from '@react-three/drei';

import BallModel from './BallModel';
import CadModel from './CadModel';
import GlassModel from './GlassModel';
import PointBinModel from './PointBinModel';
import ScoreBurst from './ScoreBurst';
import StaticText from './StaticText';
import { ScoreBurst as ScoreBurstData } from '../types';
import {
  ballRadius,
  boardShape,
  createPointBins,
  createThreeToneTexture,
  unitsPerMeter
} from '../utils';

const timeScale = 1 / 4.5; // slowdown factor
const earthGravity = 9.6 * unitsPerMeter; // ~2618 units/s^2
const gravity = earthGravity * timeScale * timeScale; // ~129 units/s^2

// the front view - the board faces +X, so we look back down that axis
const cameraPosition: [number, number, number] = [100, 0, 0];
const cameraZoom = 5;

interface IProps {
  addToScore: (toAdd: number) => void;
  adminMode: boolean;
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
  adminMode,
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
  const camera = useThree((state) => state.camera);
  const ballObjRef = useRef<Object3D | null>(null);
  const ballRef = useRef<RapierRigidBody | null>(null);
  const inited = useRef(false);
  const burstId = useRef(0);
  const scored = useRef(false);
  const [burst, setBurst] = useState<ScoreBurstData | null>(null);
  const handleScoreCollision = useCallback(
    (index: number) => () => {
      /*
        collisionEnter fires per contact pair, and the ball keeps bouncing
        around the bin until the reset lands a frame or more later - without
        this latch a single drop scores several times over. It is cleared once
        the ball has actually been teleported back to the spawn point.
      */
      if (coins === 0 || scored.current) {
        return;
      }

      scored.current = true;

      const pointBin = pointBins[index];
      // the ball is teleported back to the spawn point on the next frame, so
      // grab where it was while it is still sitting in the bin
      const contact = ballRef.current?.translation();

      if (contact) {
        burstId.current++;
        setBurst({
          color: pointBin.color,
          id: burstId.current,
          position: [contact.x, contact.y, contact.z]
        });
      }

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

  /*
    OrbitControls leaves the camera wherever the user parked it, so put it back
    on the front view when admin mode ends. It drives zoom rather than distance
    on an orthographic camera, so that has to be restored too.
  */
  useEffect(() => {
    if (adminMode) {
      return;
    }

    camera.position.set(...cameraPosition);
    // eslint-disable-next-line react-hooks/immutability
    camera.zoom = cameraZoom;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [adminMode, camera]);

  useFrame(() => {
    if (
      ballObjRef.current?.parent &&
      ballRef.current &&
      needsReset &&
      coins > 0
    ) {
      ballRef.current.setTranslation({ x: -5, y: 100, z: 0 }, true);
      scored.current = false;
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
      lengthUnit={unitsPerMeter}
      maxCcdSubsteps={8}
      paused={paused}
      timeStep={1 / 120}
    >
      {/*
        OrbitControls used to aim this for us - it calls lookAt(target) on
        mount, and its default target is the origin. With it gated behind
        adminMode the camera keeps its default -Z orientation and sees the
        board edge-on, so point it at the origin ourselves.
      */}
      <OrthographicCamera
        makeDefault
        onUpdate={(self) => self.lookAt(0, 0, 0)}
        position={cameraPosition}
        zoom={cameraZoom}
      />
      {adminMode && <OrbitControls />}
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
      <ScoreBurst burst={burst} />
    </Physics>
  );
}
