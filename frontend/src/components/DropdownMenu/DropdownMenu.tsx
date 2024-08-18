import React from 'react'
import styled from 'styled-components'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

interface DropdownProps {
  triggerLabel: string
  items: { label: string; to: string }[]
}

const Trigger = styled.span`
  color: ${(props) => props.theme.text.body};
  font-weight: bold;
  cursor: pointer;

  &:hover {
    color: ${(props) => props.theme.text.highlight};
    text-decoration: underline;
  }
`

const DropdownContent = styled(DropdownMenu.Content)`
  background-color: ${(props) => props.theme.background.content};
  border: 1px solid ${(props) => props.theme.border.content};
  border-radius: 4px;
  padding: 0.5rem 0;
  position: absolute;
  top: 100%;
  left: 0;
  display: flex;
  flex-direction: column; /* Ensure items are stacked vertically */
  min-width: 150px;
  z-index: 1000;
`

const DropdownItem = styled(DropdownMenu.Item)`
  padding: 0.5rem 1rem;
  color: ${(props) => props.theme.text.body};
  text-decoration: none;
  cursor: pointer;
  display: block; /* Ensure it takes up full width */

  &:hover {
    background-color: ${(props) => props.theme.background.highlight};
    color: ${(props) => props.theme.text.highlight};
  }
`

const Dropdown: React.FC<DropdownProps> = ({ triggerLabel, items }) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Trigger>{triggerLabel}</Trigger>
      </DropdownMenu.Trigger>
      <DropdownContent>
        {items.map((item, index) => (
          <DropdownItem as="a" href={item.to} key={index}>
            {item.label}
          </DropdownItem>
        ))}
      </DropdownContent>
    </DropdownMenu.Root>
  )
}

export default Dropdown
