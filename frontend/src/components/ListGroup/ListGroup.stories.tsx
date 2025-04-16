import type { Meta, StoryObj } from '@storybook/react'
import ListGroup from './ListGroup'

const meta = {
  title: 'Components/ListGroup',
  component: ListGroup,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof ListGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    items: ['Item 1', 'Item 2 (Active)', 'Item 3 (Disabled)'],
  },
}
