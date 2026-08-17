import { Canvas } from '@react-three/fiber';
import { Button, Form } from 'react-bootstrap';
import { ButtonVariant } from 'react-bootstrap/esm/types';
import { ChangeEvent, useCallback, useState } from 'react';

import Scene from '../components/Scene';
import useDebounce from '../hooks/useDebounce';
import SanwaButton from '../components/SanwaButton';

export const Component = () => {
  const [needsReset, setNeedsReset] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seed, setSeed] = useState('42');
  const debouncedSeed = useDebounce(seed, 750);

  const handleResetClick = useCallback(() => setNeedsReset(true), []);
  const handleResetClear = useCallback(() => setNeedsReset(false), []);
  const handlePlayPauseClick = useCallback(() => setPlaying((val) => !val), []);
  const handleSeedChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSeed(event.target.value);
    },
    []
  );

  const buttonVariant = (
    playing ? 'color-orange' : 'color-green'
  ) as ButtonVariant;
  const buttonText = (playing ? 'Pause' : 'Play') as string;

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
        <Form.Group>
          <Form.Label>Physics State</Form.Label>
          <SanwaButton className={buttonVariant} onClick={handlePlayPauseClick}>
            {buttonText}
          </SanwaButton>
          {/* @ts-expect-error Button throws this weird union type error */}
          <Button onClick={handleResetClick} variant="outline-warning">
            Reset
          </Button>
        </Form.Group>
      </Form>
      <Canvas shadows>
        <Scene
          clearReset={handleResetClear}
          needsReset={needsReset}
          paused={!playing}
          seed={debouncedSeed}
        />
      </Canvas>
    </div>
  );
};
