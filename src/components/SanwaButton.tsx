import { ComponentPropsWithoutRef } from 'react';

export default function SanwaButton(props: ComponentPropsWithoutRef<'div'>) {
  return (
    <div className="sanwa-btn pink" data-label="Insert Coin">
      <div className="bezel">
        <div {...props} className={`plunger ${props.className ?? ''}`}>
          <span className="label">Play</span>
        </div>
      </div>
    </div>
  );
}
