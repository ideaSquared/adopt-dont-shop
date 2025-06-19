import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../styles/ThemeProvider';
import { lightTheme } from '../../styles/theme';
import { Heading } from './Heading';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

describe('Heading', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Heading>Default heading</Heading>);
    const heading = screen.getByRole('heading');
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H2'); // Default level
  });

  it('renders with different levels', () => {
    const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

    levels.forEach(level => {
      const levelNumber = parseInt(level.slice(1));
      renderWithTheme(<Heading level={level}>Heading {level}</Heading>);
      const heading = screen.getByRole('heading', { level: levelNumber });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe(level.toUpperCase());
    });
  });

  it('renders with different sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'] as const;

    sizes.forEach(size => {
      renderWithTheme(<Heading size={size}>Heading {size}</Heading>);
      const heading = screen.getByText(`Heading ${size}`);
      expect(heading).toBeInTheDocument();
    });
  });

  it('renders with different weights', () => {
    const weights = ['normal', 'medium', 'semibold', 'bold'] as const;

    weights.forEach(weight => {
      renderWithTheme(<Heading weight={weight}>Heading {weight}</Heading>);
      const heading = screen.getByText(`Heading ${weight}`);
      expect(heading).toBeInTheDocument();
    });
  });

  it('renders with different colors', () => {
    const colors = [
      'primary',
      'secondary',
      'success',
      'error',
      'warning',
      'info',
      'muted',
    ] as const;

    colors.forEach(color => {
      renderWithTheme(<Heading color={color}>Heading {color}</Heading>);
      const heading = screen.getByText(`Heading ${color}`);
      expect(heading).toBeInTheDocument();
    });
  });

  it('renders with different alignments', () => {
    const alignments = ['left', 'center', 'right'] as const;

    alignments.forEach(align => {
      renderWithTheme(<Heading align={align}>Heading {align}</Heading>);
      const heading = screen.getByText(`Heading ${align}`);
      expect(heading).toBeInTheDocument();
    });
  });

  it('applies truncate styles when truncate prop is true', () => {
    renderWithTheme(
      <Heading truncate data-testid='truncated-heading'>
        This is a very long heading that should be truncated
      </Heading>
    );
    const heading = screen.getByTestId('truncated-heading');
    expect(heading).toBeInTheDocument();
  });

  it('renders as different HTML elements based on as prop', () => {
    renderWithTheme(
      <Heading as='h1' level={2}>
        Custom element heading
      </Heading>
    );
    const heading = screen.getByText('Custom element heading');
    expect(heading.tagName).toBe('H1');
  });

  it('maintains semantic level while changing visual size', () => {
    renderWithTheme(
      <Heading level='h1' size='sm'>
        Large heading with small size
      </Heading>
    );
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H1');
  });

  it('applies margin styles when margin prop is provided', () => {
    renderWithTheme(
      <Heading margin='lg' data-testid='margin-heading'>
        Heading with margin
      </Heading>
    );
    const heading = screen.getByTestId('margin-heading');
    expect(heading).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Heading data-testid='test-heading'>Test heading</Heading>);
    const heading = screen.getByTestId('test-heading');
    expect(heading).toBeInTheDocument();
  });

  it('passes through HTML attributes', () => {
    renderWithTheme(
      <Heading
        id='heading-id'
        className='custom-class'
        title='Heading title'
        data-testid='heading-with-attrs'
      >
        Heading with attributes
      </Heading>
    );

    const heading = screen.getByTestId('heading-with-attrs');
    expect(heading).toHaveAttribute('id', 'heading-id');
    expect(heading).toHaveAttribute('title', 'Heading title');
    expect(heading).toHaveClass('custom-class');
  });

  it('combines all props correctly', () => {
    renderWithTheme(
      <Heading
        level='h3'
        size='xl'
        weight='bold'
        color='primary'
        align='center'
        truncate
        className='combined-heading'
        data-testid='combined-heading'
      >
        Combined heading
      </Heading>
    );

    const heading = screen.getByTestId('combined-heading');
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H3');
    expect(heading).toHaveClass('combined-heading');
  });

  it('handles nested content correctly', () => {
    renderWithTheme(
      <Heading>
        Heading with <span>nested</span> content
      </Heading>
    );

    const heading = screen.getByRole('heading');
    const nestedSpan = screen.getByText('nested');

    expect(heading).toBeInTheDocument();
    expect(nestedSpan).toBeInTheDocument();
    expect(heading).toContainElement(nestedSpan);
  });

  it('has proper accessibility attributes', () => {
    renderWithTheme(
      <Heading level='h1' aria-label='Main heading'>
        Page Title
      </Heading>
    );
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('aria-label', 'Main heading');
  });

  it('maintains correct heading hierarchy', () => {
    renderWithTheme(
      <div>
        <Heading level='h1'>Main Title</Heading>
        <Heading level='h2'>Subtitle</Heading>
        <Heading level='h3'>Section Title</Heading>
      </div>
    );

    const h1 = screen.getByRole('heading', { level: 1 });
    const h2 = screen.getByRole('heading', { level: 2 });
    const h3 = screen.getByRole('heading', { level: 3 });

    expect(h1).toBeInTheDocument();
    expect(h2).toBeInTheDocument();
    expect(h3).toBeInTheDocument();
  });
});
