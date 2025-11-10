import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
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

const MenuContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const TriggerButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
    color: #374151;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
  }

  svg {
    font-size: 1.125rem;
  }
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 200px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  display: ${props => props.$isOpen ? 'block' : 'none'};
  z-index: 1000;
  overflow: hidden;
`;

const MenuItem = styled.button<{ $danger?: boolean; $disabled?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 0.875rem;
  color: ${props => {
    if (props.$disabled) return '#9ca3af';
    if (props.$danger) return '#ef4444';
    return '#111827';
  }};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  opacity: ${props => props.$disabled ? 0.5 : 1};

  &:hover {
    background: ${props => {
      if (props.$disabled) return 'transparent';
      if (props.$danger) return '#fef2f2';
      return '#f9fafb';
    }};
  }

  svg {
    font-size: 1rem;
    flex-shrink: 0;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: #e5e7eb;
  margin: 0.25rem 0;
`;

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  trigger
}) => {
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
    <MenuContainer ref={menuRef}>
      <TriggerButton onClick={() => setIsOpen(!isOpen)} aria-label="Actions menu">
        {trigger || <FiMoreVertical />}
      </TriggerButton>

      <Dropdown $isOpen={isOpen}>
        {items.map((item) => (
          <React.Fragment key={item.id}>
            {item.id === 'divider' ? (
              <Divider />
            ) : (
              <MenuItem
                $danger={item.danger}
                $disabled={item.disabled}
                onClick={() => handleItemClick(item)}
              >
                {item.icon}
                {item.label}
              </MenuItem>
            )}
          </React.Fragment>
        ))}
      </Dropdown>
    </MenuContainer>
  );
};
