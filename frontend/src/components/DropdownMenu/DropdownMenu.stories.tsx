import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import Dropdown from './DropdownMenu'

const meta = {
  title: 'Components/DropdownMenu',
  component: Dropdown,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Dropdown>

export default meta
type Story = StoryObj<typeof meta>

const defaultOnSelect = fn()

export const Default: Story = {
  args: {
    triggerLabel: 'Open Menu',
    items: [
      { label: 'Option 1', onClick: () => defaultOnSelect('Option 1') },
      { label: 'Option 2', onClick: () => defaultOnSelect('Option 2') },
      {
        label: 'Option 3 (Disabled)',
        onClick: () => defaultOnSelect('Option 3'),
      },
    ],
  },
}
