import type { Meta, StoryObj } from '@storybook/react';

import { DateRangePicker } from './DateRangePicker';

const meta: Meta<typeof DateRangePicker> = {
  title: 'Components/DateRangePicker',
  component: DateRangePicker,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: { from: null, to: null }, onChange: () => {} },
};

export const Prefilled: Story = {
  args: { value: { from: '2026-08-01', to: '2026-08-31' }, onChange: () => {} },
};

export const InvalidRange: Story = {
  args: { value: { from: '2026-08-31', to: '2026-08-01' }, onChange: () => {} },
};
