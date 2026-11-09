import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import React from 'react';

import * as styles from './Tooltip.css';

export type TooltipProps = {
  content: React.ReactNode;
  /** A single focusable element; the tooltip opens on hover and keyboard focus. */
  children: React.ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
}) => (
  <TooltipPrimitive.Provider>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={clsx(styles.content, className)}
          side={side}
          align={align}
          sideOffset={5}
        >
          {content}
          <TooltipPrimitive.Arrow className={styles.arrow} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);

Tooltip.displayName = 'Tooltip';

export default Tooltip;
