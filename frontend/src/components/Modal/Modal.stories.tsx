import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import Modal from './Modal'

const meta = {
  title: 'Components/Modal',
  component: Modal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    isOpen: true,
    title: 'Default Modal Title',
    children: <p>Default modal content.</p>,
    onClose: fn(),
    size: 'small',
  },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

// Note: Modals require isOpen=true to be visible in stories.
// Interaction (opening/closing) might need Storybook decorators.

// Default story inherits args from meta
export const Default: Story = {}

// Example with different size
export const Large: Story = {
  args: {
    title: 'Large Modal Example',
    size: 'large',
    children: <p>This is a larger modal, specified using the size prop.</p>,
  },
}

export const WithCustomFooter: Story = {
  args: {
    isOpen: true,
    title: 'Modal with Custom Footer',
    children: (
      <p>This modal has a custom footer defined by the `footer` prop.</p>
    ),
    footer: <div>Custom Footer Content</div>,
  },
}
