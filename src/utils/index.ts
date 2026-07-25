import { Material } from '../types';

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
