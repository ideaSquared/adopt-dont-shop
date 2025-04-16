import type { Meta, StoryObj } from '@storybook/react'
import { ThemeToggle } from './ThemeToggle'

const meta = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
    notes:
      'Theme switching is handled by the ThemeContext and the decorator in preview.ts. This story mainly verifies rendering.',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

// Note: The actual theme switching is handled globally by the decorator in preview.ts.
// This story just displays the component.

export const Default: Story = {}
