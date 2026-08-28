import seedrandom from 'seedrandom';
import modeling from '@jscad/modeling';
import { Vec3 } from '@jscad/modeling/src/maths/vec3';

import { Material, PointBin } from '../types';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  NearestFilter,
  RGBAFormat,
  Vector3
} from 'three';
import { hsl, rgb, RGBColor } from 'd3-color';

/* eslint-disable-next-line import-x/no-named-as-default-member */
const { primitives, transforms, booleans } = modeling;
const { cuboid, cylinder } = primitives;
const { translate, rotate } = transforms;
const { union } = booleans;

export const ballMaterial: Material = {
  id: 'Metal063',
  textures: {
    map: 'Color',
    metalnessMap: 'Metalness',
    normalMap: 'NormalGL',
    roughnessMap: 'Roughness'
  }
};

export const steelMaterial: Material = {
  id: 'Metal009',
  textures: {
    map: 'Color',
    metalnessMap: 'Metalness',
    normalMap: 'NormalGL',
    roughnessMap: 'Roughness'
  }
};

export const getMaterialUrl = (
  id: string,
  type: string,
  resolution = '1K',
  format = 'jpg'
) =>
  `./textures/${id}_${resolution}-${format.toLocaleUpperCase()}_${type}.${format}`;

/**
 * Returns a random number in [0, 1) that clusters around 0.5.
 *
 * Averaging several uniform samples approximates a normal distribution, so
 * values near the middle become common and the extremes become rare without
 * ever being excluded. Higher `samples` tightens the spread; a value of 1 is
 * equivalent to a plain Math.random() call.
 */
export const softRandom = (samples = 3) => {
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    sum += Math.random();
  }
  return sum / samples;
};

/**
 * Generates box-mapped (per-face planar) UVs for a non-indexed geometry.
 *
 * Each triangle is projected onto the axis plane that its face normal is most
 * aligned with, so the flat faces of the board and the sides of the pins each
 * receive an undistorted projection. UVs are normalized to the geometry's
 * bounding box so the texture scale is consistent across faces.
 */
export const computeBoxUVs = (geometry: BufferGeometry) => {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const size = new Vector3();
  bbox.getSize(size);

  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);

  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const ab = new Vector3();
  const ac = new Vector3();
  const normal = new Vector3();

  // STL geometry is non-indexed: every 3 vertices form one triangle.
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);

    ab.subVectors(b, a);
    ac.subVectors(c, a);
    normal.crossVectors(ab, ac);

    const nx = Math.abs(normal.x);
    const ny = Math.abs(normal.y);
    const nz = Math.abs(normal.z);

    for (let j = 0; j < 3; j++) {
      const idx = i + j;
      const px = pos.getX(idx);
      const py = pos.getY(idx);
      const pz = pos.getZ(idx);

      let u: number;
      let v: number;
      if (nx >= ny && nx >= nz) {
        // X-dominant face: project onto the YZ plane.
        u = (pz - bbox.min.z) / size.z;
        v = (py - bbox.min.y) / size.y;
      } else if (ny >= nx && ny >= nz) {
        // Y-dominant face: project onto the XZ plane.
        u = (px - bbox.min.x) / size.x;
        v = (pz - bbox.min.z) / size.z;
      } else {
        // Z-dominant face: project onto the XY plane.
        u = (px - bbox.min.x) / size.x;
        v = (py - bbox.min.y) / size.y;
      }

      uv[idx * 2] = u;
      uv[idx * 2 + 1] = v;
    }
  }

  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
};

export function createThreeToneTexture(
  shadowHex: string,
  midHex: string,
  highlightHex: string
) {
  // Define colors
  const shadow = new Color(shadowHex);
  const mid = new Color(midHex);
  const highlight = new Color(highlightHex);

  // Create a 3-pixel 1D array (RGBA format, 4 bytes per texel)
  const data = new Uint8Array([
    Math.floor(shadow.r * 255),
    Math.floor(shadow.g * 255),
    Math.floor(shadow.b * 255),
    255,
    Math.floor(mid.r * 255),
    Math.floor(mid.g * 255),
    Math.floor(mid.b * 255),
    255,
    Math.floor(highlight.r * 255),
    Math.floor(highlight.g * 255),
    Math.floor(highlight.b * 255),
    255
  ]);

  const texture = new DataTexture(data, 3, 1, RGBAFormat);

  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

const backboardSize: Vec3 = [120, 80, 4];
// real-world scale: an 11mm ball against the ~45cm playfield the 120-unit
// backboard stands in for, so ~1/40th of the board rather than 1/20th
const ballDiameter = 3;
// everything below is quoted in real millimeters and converted, since the board
// only means anything relative to the ball
const unitsPerMm = ballDiameter / 11;

/*
  Real pachinko nails (kugi) are about 1.5mm across, which is 0.41 units here -
  the old value of 3 was a 11mm nail, as thick as the ball itself. Nails are not
  on an integer lattice any more, so minSpacing below can no longer be assumed
  to be a whole number.
*/
const pinSize = [1.5 * unitsPerMm, 8];

/*
  A real machine carries somewhere around 300 nails. Random placement saturates
  before a hand-laid hexagonal field does, so this is a target rather than a
  promise - placePins stops early rather than spinning if the board fills up.
*/
const pinCount = 250;
const maxPinAttempts = 5000;
// const pinRoundRadius = 0.2;
const wallThickness = 8;
const wallDepth = 20;
export const boardWidth = backboardSize[1] + wallThickness * 2;

const backBoard = () =>
  translate(
    [backboardSize[0] / 2, backboardSize[1] / 2, 0],
    union(
      cuboid({
        size: backboardSize
      }),
      translate(
        [0, (backboardSize[1] + wallThickness) / 2, 0],
        rotate(
          [0, 0, Math.PI / 2],
          cuboid({
            size: [wallThickness, backboardSize[0], wallDepth]
          })
        )
      ),
      translate(
        [0, -(backboardSize[1] + wallThickness) / 2, 0],
        rotate(
          [0, 0, Math.PI / 2],
          cuboid({
            size: [wallThickness, backboardSize[0], wallDepth]
          })
        )
      ),
      translate(
        [-(backboardSize[0] + wallThickness) / 2, 0, 0],
        rotate(
          [0, 0, Math.PI],
          cuboid({
            size: [wallThickness, backboardSize[0], wallDepth]
          })
        )
      )
    )
  );

const pin = () =>
  cylinder({
    radius: pinSize[0] / 2,
    height: pinSize[1],
    center: [pinSize[0] / 2, pinSize[0] / 2, pinSize[1] / 2]
  });

const pins = () => {
  let added = 0;
  let attempts = 0;
  const coords = [];
  const blocked = new Set();
  const minSpacing = pinSize[0] + ballDiameter;
  const sweep = Math.ceil(minSpacing);

  while (added < pinCount && attempts < maxPinAttempts) {
    attempts++;

    // clamp to whole units so these keys can collide with the blocked set
    const x = Math.min(
      backboardSize[0] - sweep,
      Math.max(sweep, Math.floor(Math.random() * backboardSize[0]))
    );
    const y = Math.min(
      backboardSize[1] - sweep,
      Math.max(sweep, Math.floor(Math.random() * backboardSize[1]))
    );

    if (blocked.has(`${x},${y}`)) {
      continue;
    }

    for (let dx = -sweep; dx <= sweep; dx++) {
      for (let dy = -sweep; dy <= sweep; dy++) {
        if (dx * dx + dy * dy < minSpacing * minSpacing) {
          blocked.add(`${x + dx},${y + dy}`);
        }
      }
    }

    coords.push([x, y]);
    added++;
  }

  if (added < pinCount) {
    console.warn(`Board filled up at ${added} of ${pinCount} pins`);
  }

  return union(
    ...coords.map((coords) =>
      translate([coords[0], coords[1], backboardSize[2] / 2 - 1], pin())
    )
  );
};

/*
  World units are CAD units - the model renders unscaled. A real pachinko ball is
  11mm across and ours is 3 units across (the CAD ballDiameter), which fixes the
  scale of the world at ~272.7 units per meter. The board agrees: the 120-unit
  backboard is 0.44m long, against a real playfield of roughly 0.45m.
*/
export const ballRadius = 1.5;
const ballDiameterMeters = 0.011;
export const unitsPerMeter = (ballRadius * 2) / ballDiameterMeters; // ~272.7

const rgbToHexColor = (color: RGBColor) =>
  (color.r << 16) | (color.g << 8) | color.b;

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

export const createPointBins = () => {
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
};

export const boardShape = (seed: string) => {
  seedrandom(seed, { global: true });
  return union(backBoard(), pins());
};
