import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../Button';
import { PageHeader } from './PageHeader';

const meta: Meta<typeof PageHeader> = {
  title: 'Components/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TitleOnly: Story = {
  args: { title: 'Pet management' },
};

export const WithDescription: Story = {
  args: { title: 'Users', description: 'Manage accounts, roles and verification.' },
};

export const WithActions: Story = {
  args: {
    title: 'Applications',
    description: 'Review adoption applications for your rescue.',
    actions: (
      <>
        <Button variant='outline'>Export</Button>
        <Button>New application</Button>
      </>
    ),
  },
};
