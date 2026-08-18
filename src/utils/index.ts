import seedrandom from 'seedrandom';
import modeling from '@jscad/modeling';
import { Vec3 } from '@jscad/modeling/src/maths/vec3';

import { Material } from '../types';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  NearestFilter,
  RGBAFormat,
  Vector3
} from 'three';

/* eslint-disable-next-line import-x/no-named-as-default-member */
const { primitives, transforms, booleans } = modeling;
const { cuboid, roundedCylinder } = primitives;
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
const pinSize = [3, 8]; // diameter must be an integer
const pinCount = 32;
const ballDiameter = 6;
const pinRoundRadius = 0.2;
const wallThickness = 8;
const wallDepth = 20;
export const boardWidth = (backboardSize[1] + wallThickness * 2) * 0.2;

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
  roundedCylinder({
    radius: pinSize[0] / 2,
    height: pinSize[1],
    center: [pinSize[0] / 2, pinSize[0] / 2, pinSize[1] / 2],
    roundRadius: pinRoundRadius
  });

// const topHalf = (size: Vec3, geometry: Geom3) =>
//   intersect(
//     cuboid({
//       size: [size[0], size[1], size[2] / 2],
//       center: [0, 0, size[2] / 4]
//     }),
//     geometry
//   );

const pins = () => {
  let added = 0;
  const coords = [];
  const blocked = new Set();
  const minSpacing = pinSize[0] + ballDiameter;

  while (added < pinCount) {
    const x = Math.min(
      backboardSize[0] - pinSize[0] - ballDiameter,
      Math.max(
        pinSize[0] + ballDiameter,
        Math.floor(Math.random() * backboardSize[0])
      )
    );
    const y = Math.min(
      backboardSize[1] - pinSize[0] - ballDiameter,
      Math.max(
        pinSize[0] + ballDiameter,
        Math.floor(Math.random() * backboardSize[1])
      )
    );

    if (blocked.has(`${x},${y}`)) {
      continue;
    }

    for (let dx = -minSpacing; dx <= minSpacing; dx++) {
      for (let dy = -minSpacing; dy <= minSpacing; dy++) {
        if (dx * dx + dy * dy < minSpacing * minSpacing) {
          blocked.add(`${x + dx},${y + dy}`);
        }
      }
    }

    coords.push([x, y]);
    added++;
    console.log(`Placing pin ${added}`);
  }

  return union(
    ...coords.map((coords) =>
      translate([coords[0], coords[1], backboardSize[2] / 2 - 1], pin())
    )
  );
};

export const boardShape = (seed: string) => {
  seedrandom(seed, { global: true });
  return union(backBoard(), pins());
};
