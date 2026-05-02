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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item: ActionMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.menuContainer} ref={menuRef}>
      <button className={styles.triggerButton} onClick={() => setIsOpen(!isOpen)} aria-label='Actions menu'>
        {trigger || <FiMoreVertical />}
      </button>

      <div className={styles.dropdown({ isOpen })}>
        {items.map(item => (
          <React.Fragment key={item.id}>
            {item.id === 'divider' ? (
              <div className={styles.divider} />
            ) : (
              <button
                className={styles.menuItem({ danger: item.danger ?? false, disabled: item.disabled ?? false })}
                onClick={() => handleItemClick(item)}
              >
                {item.icon}
                {item.label}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
