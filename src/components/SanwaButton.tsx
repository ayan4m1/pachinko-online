import { ComponentPropsWithoutRef } from 'react';

import { SanwaButtonVariant } from '../types';

type Props = {
  label: string;
  variant?: SanwaButtonVariant;
} & ComponentPropsWithoutRef<'div'>;

export default function SanwaButton(props: Props) {
  const { label, variant = SanwaButtonVariant.Primary } = props;

  return (
    <div className="sanwa-btn">
      <div className="bezel">
        <div
          {...props}
          className={`plunger ${variant ? `color-${variant}` : ''}`}
        >
          <span className="label">{label}</span>
        </div>
      </div>
    </div>
  );
}
