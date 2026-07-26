import { useTexture } from '@react-three/drei';

import { Material } from '../types';
import { getMaterialUrl } from '../utils';

export default function useMaterial(material: Material) {
  return useTexture(
    Object.fromEntries(
      Object.entries(material.textures).map(([key, val]) => [
        key,
        getMaterialUrl(material.id, val)
      ])
    )
  );
}
