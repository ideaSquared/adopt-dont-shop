import type { Meta, StoryObj } from '@storybook/react';

import { Stepper } from './Stepper';

const steps = [
  { id: 'about', title: 'About you' },
  { id: 'home', title: 'Your home' },
  { id: 'experience', title: 'Pet experience' },
  { id: 'review', title: 'Review' },
];

const meta: Meta<typeof Stepper> = {
  title: 'Components/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  args: { steps, activeStep: 1 },
  argTypes: {
    orientation: { control: { type: 'inline-radio' }, options: ['horizontal', 'vertical'] },
    activeStep: { control: { type: 'number' } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const LastStep: Story = {
  args: { activeStep: 3 },
};
