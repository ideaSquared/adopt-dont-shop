import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';
import React from 'react';

import * as styles from './DropdownMenu.css';

export type DropdownMenuItem = {
  label: string;
  /** Renders the item as a link. Prefer `onClick` + your router's navigate for in-app routes. */
  to?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  /** Secondary line rendered under the label. */
  description?: string;
  disabled?: boolean;
  /** Destructive action styling (e.g. "Log out", "Delete"). */
  danger?: boolean;
  /** Draws a divider above this item. */
  separatorBefore?: boolean;
};

export type DropdownMenuProps = {
  /** Visible text of the default trigger; also the accessible name of a custom `trigger`. The menu is named after its trigger. */
  triggerLabel: string;
  items: DropdownMenuItem[];
  /** Replaces the default trigger. Must be a single focusable element (rendered with `asChild`). */
  trigger?: React.ReactElement<{ 'aria-label'?: string }>;
  triggerClassName?: string;
  /** Rendered above the items, e.g. a user name and email. Not focusable. */
  header?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
  className?: string;
};

const renderItemBody = (item: DropdownMenuItem) => (
  <>
    {item.icon && (
      <span className={styles.itemIcon} aria-hidden='true'>
        {item.icon}
      </span>
    )}
    <span className={styles.itemText}>
      <span>{item.label}</span>
      {item.description && <span className={styles.itemDescription}>{item.description}</span>}
    </span>
  </>
);

const renderItem = (item: DropdownMenuItem, index: number) => (
  <React.Fragment key={`${item.label}-${index}`}>
    {item.separatorBefore && index > 0 && (
      <DropdownMenuPrimitive.Separator className={styles.separator} />
    )}
    <DropdownMenuPrimitive.Item
      className={clsx(styles.item, item.danger && styles.itemDanger)}
      asChild={!!item.to}
      disabled={item.disabled}
      onSelect={item.onClick}
    >
      {item.to ? <a href={item.to}>{renderItemBody(item)}</a> : renderItemBody(item)}
    </DropdownMenuPrimitive.Item>
  </React.Fragment>
);

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  triggerLabel,
  items,
  trigger,
  triggerClassName,
  header,
  align = 'start',
  disabled = false,
  className,
}) => (
  <DropdownMenuPrimitive.Root>
    <DropdownMenuPrimitive.Trigger asChild disabled={disabled}>
      {trigger ? (
        React.cloneElement(trigger, { 'aria-label': trigger.props['aria-label'] ?? triggerLabel })
      ) : (
        <button type='button' className={triggerClassName ?? styles.trigger}>
          {triggerLabel}
        </button>
      )}
    </DropdownMenuPrimitive.Trigger>
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={clsx(styles.content, className)}
        sideOffset={8}
        align={align}
      >
        {header && <div className={styles.header}>{header}</div>}
        {items.map(renderItem)}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  </DropdownMenuPrimitive.Root>
);

DropdownMenu.displayName = 'DropdownMenu';

export default DropdownMenu;
