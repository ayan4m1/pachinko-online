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

export enum SanwaButtonVariant {
  Primary = '',
  Error = 'red',
  Warning = 'yellow',
  Success = 'green'
}
