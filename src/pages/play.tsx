import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';

import Scene from '../components/Scene';

export const Component = () => {
  return (
    <div style={{ height: '100%' }}>
      <title>Play Online Pachinko</title>
      <Canvas>
        <PerspectiveCamera makeDefault position={[20, 0, 0]} zoom={0.8} />
        {/* <OrthographicCamera makeDefault position={[20, 0, 0]} zoom={30} /> */}
        <Scene />
      </Canvas>
    </div>
  );
};
