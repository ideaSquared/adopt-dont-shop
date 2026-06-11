import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import React from 'react';

import * as styles from './Tooltip.css';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  className = '',
}) => (
  <TooltipPrimitive.Provider>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Content
        className={className || styles.content}
        side={side}
        align={align}
        sideOffset={5}
      >
        {content}
        <TooltipPrimitive.Arrow className={styles.arrow} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);

export default Tooltip;
