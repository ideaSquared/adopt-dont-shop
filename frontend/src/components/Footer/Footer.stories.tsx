import type { Meta, StoryObj } from '@storybook/react'
import { Footer } from './Footer'

const meta = {
  title: 'Layout/Footer', // Changed category to Layout
  component: Footer,
  parameters: { layout: 'fullscreen' }, // Fullscreen layout might be suitable for footer
  tags: ['autodocs'],
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // Add any props your Footer component accepts
  },
}
