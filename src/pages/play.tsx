import { Canvas } from '@react-three/fiber';
import Scene from '../components/Scene';

export const Component = () => {
  return (
    <div style={{ height: '100%' }}>
      <title>Play Online Pachinko</title>
      <Canvas camera={{ position: [20, 0, 0] }}>
        <Scene />
      </Canvas>
    </div>
  );
};
