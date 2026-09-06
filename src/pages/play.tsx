import { Form } from 'react-bootstrap';
import { Canvas } from '@react-three/fiber';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';

import Scene from '../components/Scene';
import useDebounce from '../hooks/useDebounce';
import SanwaButton from '../components/SanwaButton';
import { SanwaButtonVariant } from '../types';

export const Component = () => {
  const [adminMode, setAdminMode] = useState(false);
  const [coins, setCoins] = useState(5);
  const [score, setScore] = useState(0);
  const [needsReset, setNeedsReset] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seed, setSeed] = useState('42');
  const debouncedSeed = useDebounce(seed, 750);

  const handleResetClick = useCallback(() => {
    setNeedsReset(true);
    setCoins((val) => Math.max(0, val - 1));
  }, []);
  const handleResetClear = useCallback(() => setNeedsReset(false), []);
  const handlePlayPauseClick = useCallback(() => setPlaying((val) => !val), []);
  const handleSeedChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setSeed(event.target.value),
    []
  );
  const handleScoreAdd = useCallback(
    (toAdd: number) => setScore((pts) => pts + toAdd),
    []
  );

  const buttonVariant = playing
    ? SanwaButtonVariant.Error
    : SanwaButtonVariant.Success;
  const buttonText = (playing ? 'Pause' : 'Play') as string;

  useEffect(() => {
    const rootNode = document.querySelector('html');

    if (!rootNode) {
      return;
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        setAdminMode((val) => !val);
      }
    };

    rootNode.addEventListener('keydown', handler);

    return () => rootNode.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ height: '100%' }}>
      <title>Play Online Pachinko</title>
      <Canvas shadows>
        <Scene
          addToScore={handleScoreAdd}
          adminMode={adminMode}
          clearReset={handleResetClear}
          coins={coins}
          needsReset={needsReset}
          paused={!playing}
          score={score}
          seed={debouncedSeed}
          triggerReset={handleResetClick}
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
          <div>
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
          </div>
        </Form.Group>
      </Form>
    </div>
  );
};
