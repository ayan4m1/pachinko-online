export type Material = {
  id: string;
  textures: Record<string, string>;
};

export type PointBin = {
  center: number;
  color: number;
  width: number;
  score: number;
};

// a one-shot scoring impact effect - `id` increments per hit so ScoreBurst can
// tell a fresh burst from the one it is already animating
export type ScoreBurst = {
  id: number;
  position: [number, number, number];
  color: number;
};

export enum SanwaButtonVariant {
  Primary = '',
  Error = 'red',
  Warning = 'yellow',
  Success = 'green'
}
