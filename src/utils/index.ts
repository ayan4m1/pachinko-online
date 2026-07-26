import modeling from '@jscad/modeling';
import { Vec3 } from '@jscad/modeling/src/maths/vec3';
import { Geom3 } from '@jscad/modeling/src/geometries/types';

import { Material } from '../types';

/* eslint-disable-next-line import-x/no-named-as-default-member */
const { primitives, transforms, booleans } = modeling;
const { cuboid, cylinder, roundedCuboid } = primitives;
const { intersect, union } = booleans;
const { translate } = transforms;

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

const backboardSize = [120, 80, 4];
const pinSize = [3, 8]; // diameter must be an integer
const pinCount = 32;
const ballDiameter = 6;

const backBoard = () =>
  translate(
    [backboardSize[0] / 2, backboardSize[1] / 2, 0],
    union(
      cuboid({
        size: [backboardSize[0], backboardSize[1], backboardSize[2] / 2]
      }),
      translate(
        [0, 0, backboardSize[2] / 4],
        topHalf(
          [backboardSize[0], backboardSize[1], backboardSize[2]],
          roundedCuboid({
            roundRadius: 1,
            size: [backboardSize[0], backboardSize[1], backboardSize[2]]
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

const topHalf = (size: Vec3, geometry: Geom3) =>
  intersect(
    cuboid({
      size: [size[0], size[1], size[2] / 2],
      center: [0, 0, size[2] / 4]
    }),
    geometry
  );

const pins = () => {
  let added = 0;
  const coords = [];
  const blocked = new Set();
  const minSpacing = pinSize[0] + ballDiameter;

  while (added < pinCount) {
    const x = Math.min(
      backboardSize[0] - pinSize[0],
      Math.max(pinSize[0], Math.floor(Math.random() * backboardSize[0]))
    );
    const y = Math.min(
      backboardSize[1] - pinSize[0],
      Math.max(pinSize[0], Math.floor(Math.random() * backboardSize[1]))
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
      translate([coords[0], coords[1], backboardSize[2] / 2], pin())
    )
  );
};

export const boardShape = () => union(backBoard(), pins());
