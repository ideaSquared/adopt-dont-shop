import React from 'react';

import { DropdownMenu, type DropdownMenuItem } from '../DropdownMenu/DropdownMenu';

import * as styles from './DropdownButton.css';

export type DropdownButtonProps = {
  triggerLabel: string;
  items: DropdownMenuItem[];
  /** Replaces the trigger button's class (the default is a bordered, surface-coloured button). */
  className?: string;
  /** Rendered above the items inside the menu. */
  header?: React.ReactNode;
  disabled?: boolean;
};

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  triggerLabel,
  items,
  className,
  header,
  disabled,
}) => (
  <DropdownMenu
    triggerLabel={triggerLabel}
    items={items}
    header={header}
    disabled={disabled}
    triggerClassName={className ?? styles.buttonTrigger}
    align='end'
  />
);

DropdownButton.displayName = 'DropdownButton';

export default DropdownButton;
