import { Material } from '../types';

export const steelMaterial: Material = {
  id: 'Metal063',
  textures: {
    map: 'Color',
    displacementMap: 'Displacement',
    metalnessMap: 'Metalness',
    normalMap: 'NormalGL',
    roughnessMap: 'Roughness'
  }
};

export const getMaterialUrl = (
  id: string,
  type: string,
  resolution = '4K',
  format = 'jpg'
) =>
  `./textures/${id}_${resolution}-${format.toLocaleUpperCase()}_${type}.${format}`;
