import type { Meta, StoryObj } from '@storybook/react'
import Navbar from './Navbar'

const meta = {
  title: 'Layout/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
    notes:
      'This component relies on UserContext, FeatureFlagContext, and Permissions. Mock providers may be needed via decorators to see different states.',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Navbar>

export default meta
type Story = StoryObj<typeof meta>

// Navbar takes no props, args are not needed.
// Context providers might be needed via decorators to view different states.
export const Default: Story = {}
