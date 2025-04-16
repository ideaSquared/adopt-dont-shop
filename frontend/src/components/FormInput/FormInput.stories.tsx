import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { FormInput } from './FormInput'

const meta = {
  title: 'Components/FormInput',
  component: FormInput,
  parameters: { layout: 'padded' }, // Use padded layout for forms
  tags: ['autodocs'],
  args: { onChange: fn() }, // Add action logger for onChange
} satisfies Meta<typeof FormInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Input Label',
    name: 'input-default',
    type: 'text',
    placeholder: 'Enter text here',
  },
}

export const WithError: Story = {
  args: {
    label: 'Input with Error',
    name: 'input-error',
    type: 'email',
    placeholder: 'Enter your email',
    error: 'Invalid email format',
  },
}
