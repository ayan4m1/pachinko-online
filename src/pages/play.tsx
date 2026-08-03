import { Form } from 'react-bootstrap';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { ChangeEvent, useCallback, useState } from 'react';

import Scene from '../components/Scene';
import useDebounce from '../hooks/useDebounce';

export const Component = () => {
  const [seed, setSeed] = useState('42');
  const debouncedSeed = useDebounce(seed, 750);

  const handleSeedChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSeed(event.target.value);
    },
    []
  );

  return (
    <div style={{ height: '100%' }}>
      <title>Play Online Pachinko</title>
      <Form>
        <Form.Group>
          <Form.Label>Seed</Form.Label>
          <Form.Control
            name="seed"
            onChange={handleSeedChange}
            type="text"
            value={seed}
          />
        </Form.Group>
      </Form>
      <Canvas shadows>
        <OrthographicCamera makeDefault position={[20, 0, 0]} zoom={30} />
        <Scene seed={debouncedSeed} />
      </Canvas>
    </div>
  );
};
