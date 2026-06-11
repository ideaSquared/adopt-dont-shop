import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardContent, CardFooter } from './Card';
import { Button } from './Button';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'outlined', 'elevated', 'filled', 'glass'],
    },
    padding: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg'],
    },
    hoverable: { control: { type: 'boolean' } },
    shadowed: { control: { type: 'boolean' } },
    bordered: { control: { type: 'boolean' } },
    clickable: { control: { type: 'boolean' } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This is a card component with default styling.',
    variant: 'default',
    padding: 'md',
  },
};

export const Outlined: Story = {
  args: { children: 'This is an outlined card.', variant: 'outlined', padding: 'md' },
};

export const Elevated: Story = {
  args: { children: 'This is an elevated card.', variant: 'elevated', padding: 'md' },
};

export const Filled: Story = {
  args: { children: 'This is a filled card.', variant: 'filled', padding: 'md' },
};

export const Glass: Story = {
  args: { children: 'This is a glass morphism card.', variant: 'glass', padding: 'md' },
};

export const Hoverable: Story = {
  args: { children: 'Hover over this card.', variant: 'default', padding: 'md', hoverable: true },
};

export const Clickable: Story = {
  args: { children: 'This card is clickable!', variant: 'default', padding: 'md', clickable: true },
};

export const WithSubcomponents: Story = {
  render: () => (
    <Card variant='default' padding='md'>
      <CardHeader bordered>
        <h2>Card Title</h2>
        <p>Subtitle</p>
      </CardHeader>
      <CardContent>Main content goes here.</CardContent>
      <CardFooter bordered>
        <Button variant='ghost'>Cancel</Button>
        <Button variant='primary'>Save</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithBorder: Story = {
  args: { children: 'Card with border.', variant: 'default', padding: 'md', bordered: true },
};

export const NoShadow: Story = {
  args: { children: 'Card without shadow.', variant: 'default', padding: 'md', shadowed: false },
};
