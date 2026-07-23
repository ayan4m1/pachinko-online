import { Canvas } from '@react-three/fiber';
import Scene from '../components/Scene';

export const Component = () => {
  return (
    <div style={{ height: '100%' }}>
      <title>Play Online Pachinko</title>
      <h1>Play</h1>
      <Canvas camera={{ position: [20, 0, 0] }}>
        <Scene />
      </Canvas>
    </div>
  );
};
