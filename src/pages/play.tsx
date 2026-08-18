import { Form } from 'react-bootstrap';
import { Canvas } from '@react-three/fiber';
import { ChangeEvent, useCallback, useState } from 'react';

import Scene from '../components/Scene';
import useDebounce from '../hooks/useDebounce';
import SanwaButton from '../components/SanwaButton';
import { SanwaButtonVariant } from '../types';

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

  const buttonVariant = playing
    ? SanwaButtonVariant.Error
    : SanwaButtonVariant.Success;
  const buttonText = (playing ? 'Pause' : 'Play') as string;

  return (
    <div style={{ height: '100%' }}>
      <title>Play Online Pachinko</title>
      <Canvas shadows>
        <Scene
          clearReset={handleResetClear}
          needsReset={needsReset}
          paused={!playing}
          seed={debouncedSeed}
        />
      </Canvas>
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
          <SanwaButton
            label={buttonText}
            onClick={handlePlayPauseClick}
            variant={buttonVariant}
          />
          <SanwaButton
            label="Reset"
            onClick={handleResetClick}
            variant={SanwaButtonVariant.Warning}
          />
        </Form.Group>
      </Form>
    </div>
  );
};
