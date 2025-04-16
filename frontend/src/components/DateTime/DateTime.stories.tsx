import type { Meta, StoryObj } from '@storybook/react'
// No fn needed as there is no onChange prop
import DateTime from './DateTime'

const meta = {
  title: 'Components/DateTime',
  component: DateTime,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  // Remove args from meta as there are no globally applicable args like onChange
} satisfies Meta<typeof DateTime>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // Use correct props for DateTime
    timestamp: new Date(),
    localeOption: 'en-GB', // Default
    showTooltip: false, // Default
  },
}

export const WithTooltip: Story = {
  args: {
    timestamp: new Date(2024, 6, 20, 10, 30, 0), // Example date (July 20, 2024 10:30:00)
    localeOption: 'en-US',
    showTooltip: true,
  },
}
