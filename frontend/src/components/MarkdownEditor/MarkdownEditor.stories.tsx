import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import MarkdownEditor from './MarkdownEditor'

const meta = {
  title: 'Components/MarkdownEditor',
  component: MarkdownEditor,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: { onChange: fn() }, // Add action logger for onChange
} satisfies Meta<typeof MarkdownEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: '', // Initial value
  },
}

export const WithInitialValue: Story = {
  args: {
    value: '# Hello World\n\nThis is some **markdown** text.',
  },
}
