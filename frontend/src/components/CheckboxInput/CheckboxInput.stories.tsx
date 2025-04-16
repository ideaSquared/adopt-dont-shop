import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { CheckboxInput } from './CheckboxInput'

const meta = {
  title: 'Components/CheckboxInput',
  component: CheckboxInput,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { onChange: fn() }, // Add action logger for onChange
} satisfies Meta<typeof CheckboxInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Checkbox Label',
    name: 'checkbox-default',
    checked: false,
  },
}

export const Checked: Story = {
  args: {
    label: 'Checked Checkbox',
    name: 'checkbox-checked',
    checked: true,
  },
}
