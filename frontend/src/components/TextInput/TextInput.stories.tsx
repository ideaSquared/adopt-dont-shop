import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import TextInput from './TextInput'

const meta = {
  title: 'Components/TextInput',
  component: TextInput,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    value: '',
    type: 'text',
    onChange: fn(),
  },
} satisfies Meta<typeof TextInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'text-input-default',
    placeholder: 'Enter text',
  },
}

export const Password: Story = {
  args: {
    name: 'password-input',
    type: 'password',
    placeholder: 'Enter password',
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Cannot edit (disabled)',
    disabled: true,
  },
}

export const WithEndAddon: Story = {
  args: {
    placeholder: 'Enter amount',
    type: 'number',
    endAddons: [{ content: 'USD' }, { content: '!', variant: 'warning' }],
  },
}
