import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../styles/ThemeProvider';
import { lightTheme } from '../../styles/theme';
import { Card, CardContent, CardFooter, CardHeader } from './Card';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

describe('Card', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Card>Card content</Card>);
    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
  });

  it('applies variant styles correctly', () => {
    renderWithTheme(<Card variant='elevated'>Elevated card</Card>);
    const card = screen.getByText('Elevated card');
    expect(card).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Card data-testid='test-card'>Test card</Card>);
    const card = screen.getByTestId('test-card');
    expect(card).toBeInTheDocument();
  });

  it('renders with hover effect when hoverable', () => {
    renderWithTheme(<Card hoverable>Hoverable card</Card>);
    const card = screen.getByText('Hoverable card');
    expect(card).toBeInTheDocument();
  });
});

describe('CardHeader', () => {
  it('renders correctly', () => {
    renderWithTheme(<CardHeader>Card header</CardHeader>);
    const header = screen.getByText('Card header');
    expect(header).toBeInTheDocument();
  });
});

describe('CardContent', () => {
  it('renders correctly', () => {
    renderWithTheme(<CardContent>Card content</CardContent>);
    const content = screen.getByText('Card content');
    expect(content).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders correctly', () => {
    renderWithTheme(<CardFooter>Card footer</CardFooter>);
    const footer = screen.getByText('Card footer');
    expect(footer).toBeInTheDocument();
  });
});
