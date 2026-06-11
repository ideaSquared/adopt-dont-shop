import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: { type: 'select' }, options: ['default', 'success', 'error'] },
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
    disabled: { control: { type: 'boolean' } },
    readOnly: { control: { type: 'boolean' } },
    isFullWidth: { control: { type: 'boolean' } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Enter text...', type: 'text', variant: 'default', size: 'md' },
};

export const WithLabel: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    type: 'email',
    variant: 'default',
    size: 'md',
  },
};

export const WithError: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    type: 'text',
    variant: 'error',
    size: 'md',
    error: 'Username is required',
  },
};

export const WithSuccess: Story = {
  args: {
    label: 'Confirmation',
    placeholder: 'Enter confirmation',
    type: 'text',
    variant: 'success',
    size: 'md',
    value: 'Confirmed',
  },
};

export const Required: Story = {
  args: {
    label: 'Name',
    placeholder: 'Enter your name',
    type: 'text',
    variant: 'default',
    size: 'md',
    required: true,
  },
};

export const Small: Story = {
  args: {
    label: 'Small Input',
    placeholder: 'Small',
    type: 'text',
    variant: 'default',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    label: 'Large Input',
    placeholder: 'Large',
    type: 'text',
    variant: 'default',
    size: 'lg',
  },
};

export const FullWidth: Story = {
  args: {
    label: 'Full Width',
    placeholder: 'Full width',
    type: 'text',
    variant: 'default',
    size: 'md',
    isFullWidth: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled',
    placeholder: 'Cannot type',
    type: 'text',
    variant: 'default',
    size: 'md',
    disabled: true,
  },
};

export const ReadOnly: Story = {
  args: {
    label: 'Read Only',
    value: 'Read-only content',
    type: 'text',
    variant: 'default',
    size: 'md',
    readOnly: true,
  },
};

export const PasswordInput: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter password',
    type: 'password',
    variant: 'default',
    size: 'md',
  },
};

export const NumberInput: Story = {
  args: { label: 'Age', placeholder: 'Enter age', type: 'number', variant: 'default', size: 'md' },
};

export const DateInput: Story = {
  args: { label: 'Birth Date', type: 'date', variant: 'default', size: 'md' },
};

export const WithHelpText: Story = {
  args: {
    label: 'Email',
    placeholder: 'your@email.com',
    type: 'email',
    variant: 'default',
    size: 'md',
    helperText: 'We will never share your email.',
  },
};
