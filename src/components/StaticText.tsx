import { Fragment } from 'react';
import { Text3D } from '@react-three/drei';

interface IProps {
  score: number;
  maxScore: number;
  coins: number;
  maxCoins: number;
}

export default function StaticText({
  score,
  maxScore,
  coins,
  maxCoins
}: IProps) {
  return (
    <Fragment>
      <Text3D
        font="/fonts/dm_mono.json"
        height={1}
        position={[0, 65, -35]}
        rotation={[0, Math.PI / 2, 0]}
        size={5}
      >
        Coins: {coins}/{maxCoins}
        <meshStandardMaterial color="blue" />
      </Text3D>
      <Text3D
        font="/fonts/dm_mono.json"
        height={1}
        position={[0, 65, 65]}
        rotation={[0, Math.PI / 2, 0]}
        size={5}
      >
        Score: {score}/{maxScore}
        <meshStandardMaterial color="green" />
      </Text3D>
    </Fragment>
  );
}
