import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { DateInput } from './DateInput'

const meta = {
  title: 'Components/DateInput',
  component: DateInput,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { onChange: fn() }, // Add action logger for onChange
} satisfies Meta<typeof DateInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Select Date',
    name: 'date-input-default',
  },
}

export const WithValue: Story = {
  args: {
    label: 'Select Date',
    name: 'date-input-value',
    value: new Date(), // Pre-selected date
  },
}

export const Disabled: Story = {
  args: {
    label: 'Disabled Date Input',
    name: 'date-input-disabled',
    disabled: true,
  },
}
