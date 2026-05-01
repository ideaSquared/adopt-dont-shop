import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import React from 'react';

import * as styles from './DropdownMenu.css';

interface DropdownItem {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface DropdownProps {
  triggerLabel: string;
  items: DropdownItem[];
}

const Dropdown: React.FC<DropdownProps> = ({ triggerLabel, items }) => (
  <DropdownMenuPrimitive.Root>
    <DropdownMenuPrimitive.Trigger asChild>
      <span className={styles.trigger}>{triggerLabel}</span>
    </DropdownMenuPrimitive.Trigger>
    <DropdownMenuPrimitive.Content className={styles.content}>
      {items.map((item, index) => (
        <DropdownMenuPrimitive.Item
          key={index}
          className={styles.item}
          asChild={!!item.to}
          onSelect={item.onClick}
        >
          {item.to ? <a href={item.to}>{item.label}</a> : <div>{item.label}</div>}
        </DropdownMenuPrimitive.Item>
      ))}
    </DropdownMenuPrimitive.Content>
  </DropdownMenuPrimitive.Root>
);

export default Dropdown;
