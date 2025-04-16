import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { CountrySelectInput } from './CountrySelectInput'

const meta = {
  title: 'Components/CountrySelectInput',
  component: CountrySelectInput,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { onChange: fn() }, // Add action logger for onChange
} satisfies Meta<typeof CountrySelectInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Select Country',
    name: 'country',
    value: '', // Default value (no country selected)
  },
}

export const WithValue: Story = {
  args: {
    label: 'Select Country',
    name: 'country',
    value: 'US', // Example pre-selected value
  },
}
