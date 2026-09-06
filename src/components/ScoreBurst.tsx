import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { interpolateRgb } from 'd3-interpolate';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PointsMaterial
} from 'three';

import { ScoreBurst as ScoreBurstData } from '../types';

const sparkCount = 28;
const burstDuration = 0.9; // seconds of wall-clock time, not physics time
// the ring geometry has an outer radius of 1, so these are radii in world units
const ringStart = 0.5;
const ringEnd = 8;
const sparkMinSpeed = 15;
const sparkMaxSpeed = 35;
// sparks spray in the screen plane (world YZ) with only a little depth spread
const sparkDepthSpread = 0.25;
const sparkGravity = 30;
const sparkDrag = 3;

interface IProps {
  burst: ScoreBurstData | null;
}

/*
  A one-shot scoring effect - a ring expanding out of the impact point plus a
  spray of sparks. It has to outlive the ball, which gets teleported back to the
  spawn point the frame after it lands in a bin. Only one burst runs at a time;
  scoring again restarts it at the new location.

  Everything animates by mutating refs inside useFrame, so a burst costs exactly
  one React render - the setState in Scene that publishes it - and none after.
  The lifetime runs on wall-clock time rather than the 4.5x slowed physics
  clock, since this is feedback for the player, not part of the simulation.
*/
export default function ScoreBurst({ burst }: IProps) {
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const ringMatRef = useRef<MeshBasicMaterial>(null);
  const sparkGeoRef = useRef<BufferGeometry>(null);
  const sparkMatRef = useRef<PointsMaterial>(null);
  const elapsedRef = useRef(0);
  const lastIdRef = useRef(0);
  // white-hot at impact, cooling to the color of the bin that was hit
  const ringColorRef = useRef(interpolateRgb('#ffffff', '#ffffff'));
  /*
    The spark buffers live on a ref so they stay mutable - useFrame integrates
    them in place - and get filled in from useFrame rather than during render,
    since reading a ref while rendering is not allowed.
  */
  const sparksRef = useRef<{
    positions: Float32Array;
    velocities: Float32Array;
  } | null>(null);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const ring = ringRef.current;
    const ringMat = ringMatRef.current;
    const sparkGeo = sparkGeoRef.current;
    const sparkMat = sparkMatRef.current;

    if (!burst || !group || !ring || !ringMat || !sparkGeo || !sparkMat) {
      return;
    }

    if (sparksRef.current == null) {
      sparksRef.current = {
        positions: new Float32Array(sparkCount * 3),
        velocities: new Float32Array(sparkCount * 3)
      };
      sparkGeo.setAttribute(
        'position',
        new BufferAttribute(sparksRef.current.positions, 3)
      );
    }

    const { positions, velocities } = sparksRef.current;

    if (burst.id !== lastIdRef.current) {
      lastIdRef.current = burst.id;
      elapsedRef.current = 0;
      group.position.set(...burst.position);
      group.visible = true;

      const binColor = new Color(burst.color);

      ringColorRef.current = interpolateRgb('#ffffff', binColor.getStyle());
      sparkMat.color.copy(binColor);

      for (let i = 0; i < sparkCount; i++) {
        const offset = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const speed =
          sparkMinSpeed + Math.random() * (sparkMaxSpeed - sparkMinSpeed);

        positions[offset] = 0;
        positions[offset + 1] = 0;
        positions[offset + 2] = 0;
        velocities[offset] =
          (Math.random() - 0.5) * 2 * sparkDepthSpread * speed;
        velocities[offset + 1] = Math.sin(angle) * speed;
        velocities[offset + 2] = Math.cos(angle) * speed;
      }
    }

    if (!group.visible) {
      return;
    }

    // a backgrounded tab hands back a huge delta on return - don't let the
    // whole burst integrate away in a single step
    const step = Math.min(delta, 1 / 30);

    elapsedRef.current += step;

    const t = Math.min(1, elapsedRef.current / burstDuration);

    if (t >= 1) {
      group.visible = false;
      return;
    }

    const easeOut = 1 - (1 - t) ** 3;
    const decay = Math.max(0, 1 - sparkDrag * step);

    ring.scale.setScalar(ringStart + (ringEnd - ringStart) * easeOut);
    ringMat.color.set(ringColorRef.current(easeOut));
    ringMat.opacity = (1 - t) ** 2;

    for (let i = 0; i < sparkCount; i++) {
      const offset = i * 3;

      velocities[offset] *= decay;
      velocities[offset + 1] =
        velocities[offset + 1] * decay - sparkGravity * step;
      velocities[offset + 2] *= decay;
      positions[offset] += velocities[offset] * step;
      positions[offset + 1] += velocities[offset + 1] * step;
      positions[offset + 2] += velocities[offset + 2] * step;
    }

    sparkGeo.attributes.position.needsUpdate = true;
    sparkMat.opacity = 1 - t;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/*
        The camera looks back down +X, so the ring has to face that way to read
        as a disc rather than a line.
      */}
      <mesh ref={ringRef} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[0.8, 1, 48]} />
        <meshBasicMaterial
          depthWrite={false}
          ref={ringMatRef}
          side={DoubleSide}
          toneMapped={false}
          transparent
        />
      </mesh>
      {/*
        Every spark starts at the group origin, so the geometry's bounding
        sphere would cull the burst away as it expands.
      */}
      <points frustumCulled={false}>
        <bufferGeometry ref={sparkGeoRef} />
        <pointsMaterial
          depthWrite={false}
          ref={sparkMatRef}
          size={1.5}
          sizeAttenuation
          toneMapped={false}
          transparent
        />
      </points>
    </group>
  );
}
