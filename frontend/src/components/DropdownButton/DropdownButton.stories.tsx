import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { DropdownButton } from './DropdownButton'

const meta = {
  title: 'Components/DropdownButton',
  component: DropdownButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof DropdownButton>

export default meta
type Story = StoryObj<typeof meta>

const defaultOnSelect = fn()

const items = [
  { id: '1', label: 'Action 1', onSelect: () => defaultOnSelect('Action 1') },
  { id: '2', label: 'Action 2', onSelect: () => defaultOnSelect('Action 2') },
  {
    id: '3',
    label: 'Disabled Action',
    onSelect: () => defaultOnSelect('Action 3'),
    disabled: true,
  },
]

export const Default: Story = {
  args: {
    triggerLabel: 'Dropdown',
    items: items,
    // variant: 'primary' // Example variant
  },
}
