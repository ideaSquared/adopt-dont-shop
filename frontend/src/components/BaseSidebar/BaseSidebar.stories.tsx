import type { Meta, StoryObj } from '@storybook/react'
import { BaseSidebar } from './BaseSidebar'

const meta = {
  title: 'Layout/BaseSidebar',
  component: BaseSidebar,
  parameters: { layout: 'fullscreen' }, // Fullscreen is often best for sidebars
  tags: ['autodocs'],
} satisfies Meta<typeof BaseSidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div>
        <p>Sidebar Content Area</p>
        <ul>
          <li>Link 1</li>
          <li>Link 2</li>
          <li>Link 3</li>
        </ul>
      </div>
    ),
    // Add other props if needed, e.g., isOpen, onToggle
  },
}
