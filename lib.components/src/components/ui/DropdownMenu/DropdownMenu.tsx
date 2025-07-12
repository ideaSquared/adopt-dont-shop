import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React from 'react';
import styled from 'styled-components';

interface DropdownItem {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface DropdownProps {
  triggerLabel: string;
  items: DropdownItem[];
}
const Trigger = styled.span`
  color: ${({ theme }) => theme.text.primary};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.text.linkHover};
  }

  &:focus-visible {
    outline: ${({ theme }) => theme.border.width.normal} solid
      ${({ theme }) => theme.border.color.focus};
    outline-offset: 2px;
  }
`;

const DropdownContent = styled(DropdownMenu.Content)`
  background-color: ${({ theme }) => theme.background.overlay};
  border: ${({ theme }) => theme.border.width.thin} solid
    ${({ theme }) => theme.border.color.primary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: ${({ theme }) => theme.spacing.xs} 0;
  min-width: 150px;
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const DropdownItem = styled(DropdownMenu.Item)`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.text.primary};
  text-decoration: none;
  cursor: pointer;
  display: block;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover,
  &:focus {
    background-color: ${({ theme }) => theme.background.overlay};
    color: ${({ theme }) => theme.text.inverse};
    outline: none;
  }

  &:focus-visible {
    outline: ${({ theme }) => theme.border.width.normal} solid
      ${({ theme }) => theme.border.color.focus};
    outline-offset: -2px;
  }
`;

const Dropdown: React.FC<DropdownProps> = ({ triggerLabel, items }) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Trigger>{triggerLabel}</Trigger>
      </DropdownMenu.Trigger>
      <DropdownContent>
        {items.map((item, index) => (
          <DropdownItem
            as={item.to ? 'a' : 'div'}
            href={item.to}
            onClick={item.onClick}
            key={index}
          >
            {item.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </DropdownMenu.Root>
  );
};

export default Dropdown;
