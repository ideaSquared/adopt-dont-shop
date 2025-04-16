import type { Meta, StoryObj } from '@storybook/react'
import Badge from './Badge'

const meta = {
  title: 'Components/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Badge Label',
    // Add other default props if needed, e.g., variant: 'primary'
  },
}
