import type { Meta, StoryObj } from '@storybook/react'
import Button from '../Button' // Keeping default import for Button
import Tooltip from './Tooltip' // Corrected to default import

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    content: 'This is the tooltip content.',
    children: <Button>Hover Me</Button>, // Example trigger element
  },
}

export const WithLongText: Story = {
  args: {
    content:
      'This is a longer piece of tooltip content to demonstrate how it handles wrapping or larger amounts of text.',
    children: <Button>Hover Me (Long Text)</Button>,
  },
}
