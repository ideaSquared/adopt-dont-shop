import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import SelectInput from './SelectInput'

const meta = {
  title: 'Components/SelectInput',
  component: SelectInput,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    options: [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
      { value: 'opt3', label: 'Option 3' },
    ],
    onChange: fn(),
    placeholder: 'Default Placeholder',
  },
} satisfies Meta<typeof SelectInput>

export default meta
type Story = StoryObj<typeof meta>

const defaultOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
]

export const Default: Story = {}

export const WithValue: Story = {
  args: {
    placeholder: 'Select with Pre-selected Value',
    options: defaultOptions,
    value: 'option2',
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Cannot Select (Disabled)',
    options: defaultOptions,
    disabled: true,
  },
}
