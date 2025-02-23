import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import React from 'react'
import styled from 'styled-components'

// Type definitions
type DropdownItem = {
  /** The text to display for this item */
  label: string
  /** Optional URL if the item should act as a link */
  to?: string
  /** Optional click handler for the item */
  onClick?: () => void
}

type DropdownButtonProps = {
  /** The text to display in the trigger button */
  triggerLabel: string
  /** Array of items to display in the dropdown */
  items: DropdownItem[]
  /** Optional className for styling */
  className?: string
}

// Style definitions
const ButtonTrigger = styled.button`
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  background-color: ${({ theme }) => theme.background.content};
  border: ${({ theme }) => theme.border.width.thin} solid
    ${({ theme }) => theme.border.color.default};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.text.body};
  font-weight: ${({ theme }) => theme.typography.weight.medium};

  &:hover {
    background-color: ${({ theme }) => theme.background.contrast};
  }

  &:focus-visible {
    outline: ${({ theme }) => theme.border.width.normal} solid
      ${({ theme }) => theme.border.color.focus};
    outline-offset: 2px;
  }
`

const DropdownContent = styled(DropdownMenu.Content)`
  background-color: ${({ theme }) => theme.background.content};
  border: ${({ theme }) => theme.border.width.thin} solid
    ${({ theme }) => theme.border.color.default};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: ${({ theme }) => theme.spacing.xs} 0;
  min-width: 150px;
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  box-shadow: ${({ theme }) => theme.shadows.md};
`

const DropdownItem = styled(DropdownMenu.Item)`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.text.body};
  text-decoration: none;
  cursor: pointer;
  display: block;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover,
  &:focus {
    background-color: ${({ theme }) => theme.background.contrast};
    color: ${({ theme }) => theme.text.dark};
    outline: none;
  }

  &:focus-visible {
    outline: ${({ theme }) => theme.border.width.normal} solid
      ${({ theme }) => theme.border.color.focus};
    outline-offset: -2px;
  }
`

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  triggerLabel,
  items,
  className,
}) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <ButtonTrigger className={className} aria-label={triggerLabel}>
          {triggerLabel}
        </ButtonTrigger>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownContent sideOffset={5} align="end">
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
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export default DropdownButton
