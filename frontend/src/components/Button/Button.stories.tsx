import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import Button from './Button'

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: 'Components/Button', // Adjusted title for better organization
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas.
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry:
  // https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
    // Define argTypes for props if needed, e.g.:
    // backgroundColor: { control: 'color' },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked:
  // https://storybook.js.org/docs/essentials/actions#action-args
  args: { onClick: fn() },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args

// Basic story example
export const Primary: Story = {
  args: {
    children: 'Button',
    // Add default props for the primary story here
    // variant: 'primary',
  },
}

// Example of another story state
export const Secondary: Story = {
  args: {
    children: 'Button',
    // Add props for the secondary story here
    // variant: 'secondary',
  },
}

// Example with disabled state
export const Disabled: Story = {
  args: {
    children: 'Button',
    disabled: true,
  },
}
