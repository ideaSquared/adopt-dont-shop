import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React from 'react';

import * as styles from './DropdownButton.css';

type DropdownItem = {
  label: string;
  to?: string;
  onClick?: () => void;
};

type DropdownButtonProps = {
  triggerLabel: string;
  items: DropdownItem[];
  className?: string;
};

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  triggerLabel,
  items,
  className,
}) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button className={className ?? styles.buttonTrigger} aria-label={triggerLabel}>
        {triggerLabel}
      </button>
    </DropdownMenu.Trigger>

    <DropdownMenu.Portal>
      <DropdownMenu.Content className={styles.dropdownContent} sideOffset={5} align='end'>
        {items.map((item, index) => (
          <DropdownMenu.Item
            key={index}
            className={styles.dropdownItem}
            asChild={!!item.to}
            onSelect={item.onClick}
            onClick={item.to ? undefined : item.onClick}
          >
            {item.to ? <a href={item.to}>{item.label}</a> : <div>{item.label}</div>}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

export default DropdownButton;
