import React, { useState, useRef, useEffect } from 'react';
import * as styles from './ActionMenu.css';
import { FiMoreVertical } from 'react-icons/fi';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  trigger?: React.ReactNode;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ items, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = (item: ActionMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  const menuItems = items.filter(item => item.id !== 'divider');

  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      next?.[Math.min(index + 1, menuItems.length - 1)]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const all = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      all?.[Math.max(index - 1, 0)]?.focus();
    }
  };

  let menuItemIndex = 0;

  return (
    <div className={styles.menuContainer} ref={menuRef}>
      <button
        className={styles.triggerButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label='Actions menu'
        aria-haspopup='menu'
        aria-expanded={isOpen}
      >
        {trigger || <FiMoreVertical />}
      </button>

      {isOpen && (
        <div className={styles.dropdown({ isOpen })} role='menu'>
          {items.map(item => {
            if (item.id === 'divider') {
              return <div key={item.id} className={styles.divider} role='separator' />;
            }
            const currentIndex = menuItemIndex++;
            return (
              <button
                key={item.id}
                role='menuitem'
                className={styles.menuItem({
                  danger: item.danger ?? false,
                  disabled: item.disabled ?? false,
                })}
                onClick={() => handleItemClick(item)}
                onKeyDown={e => handleItemKeyDown(e, currentIndex)}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
