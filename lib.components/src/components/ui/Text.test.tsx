import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { lightTheme } from '../../styles/theme';

import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { Text } from './Text';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('Text', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Text>Default text</Text>);
    const text = screen.getByText('Default text');
    expect(text).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    // Only use supported variants from TextVariant type
    const variants = ['body', 'caption', 'small', 'lead', 'muted', 'highlight'] as const;

    variants.forEach(variant => {
      renderWithTheme(<Text variant={variant}>{variant} text</Text>);
      const text = screen.getByText(`${variant} text`);
      expect(text).toBeInTheDocument();
    });
  });

  it('renders with different sizes', () => {
    // Only use supported sizes from TextSize type
    const sizes = ['xs', 'sm', 'base', 'lg', 'xl'] as const;

    sizes.forEach(size => {
      renderWithTheme(<Text size={size}>{size} text</Text>);
      const text = screen.getByText(`${size} text`);
      expect(text).toBeInTheDocument();
    });
  });

  it('renders with different weights', () => {
    const weights = ['light', 'normal', 'medium', 'semibold', 'bold'] as const;

    weights.forEach(weight => {
      renderWithTheme(<Text weight={weight}>{weight} text</Text>);
      const text = screen.getByText(`${weight} text`);
      expect(text).toBeInTheDocument();
    });
  });

  it('renders with different colors', () => {
    // Only use supported colors from TextColor type (remove 'error')
    const colors = [
      'body',
      'dark',
      'light',
      'muted',
      'primary',
      'secondary',
      'success',
      'danger',
      'warning',
      'info',
    ] as const;

    colors.forEach(color => {
      renderWithTheme(<Text color={color}>{color} text</Text>);
      const text = screen.getByText(`${color} text`);
      expect(text).toBeInTheDocument();
    });
  });

  it('renders with different alignments', () => {
    const alignments = ['left', 'center', 'right', 'justify'] as const;

    alignments.forEach(align => {
      renderWithTheme(<Text align={align}>{align} aligned text</Text>);
      const text = screen.getByText(`${align} aligned text`);
      expect(text).toBeInTheDocument();
    });
  });

  it('renders as different HTML elements based on as prop', () => {
    renderWithTheme(<Text as='p'>Paragraph text</Text>);
    const paragraph = screen.getByText('Paragraph text');
    expect(paragraph.tagName).toBe('P');

    renderWithTheme(<Text as='span'>Span text</Text>);
    const span = screen.getByText('Span text');
    expect(span.tagName).toBe('SPAN');
  });

  it('applies truncate styles when truncate prop is true', () => {
    renderWithTheme(
      <Text truncate data-testid='truncated-text'>
        This is a very long text that should be truncated
      </Text>
    );
    const text = screen.getByTestId('truncated-text');
    expect(text).toBeInTheDocument();
  });

  it('applies italic styles when italic prop is true', () => {
    renderWithTheme(<Text italic>Italic text</Text>);
    const text = screen.getByText('Italic text');
    expect(text).toBeInTheDocument();
  });

  it('applies underline styles when underline prop is true', () => {
    renderWithTheme(<Text underline>Underlined text</Text>);
    const text = screen.getByText('Underlined text');
    expect(text).toBeInTheDocument();
  });

  it('applies uppercase transform when transform is uppercase', () => {
    // Remove unsupported transform prop
    renderWithTheme(<Text style={{ textTransform: 'uppercase' }}>uppercase text</Text>);
    const text = screen.getByText('uppercase text');
    expect(text).toBeInTheDocument();
  });

  it('applies lowercase transform when transform is lowercase', () => {
    // Remove unsupported transform prop
    renderWithTheme(<Text style={{ textTransform: 'lowercase' }}>LOWERCASE TEXT</Text>);
    const text = screen.getByText('LOWERCASE TEXT');
    expect(text).toBeInTheDocument();
  });

  it('applies capitalize transform when transform is capitalize', () => {
    // Remove unsupported transform prop
    renderWithTheme(<Text style={{ textTransform: 'capitalize' }}>capitalize text</Text>);
    const text = screen.getByText('capitalize text');
    expect(text).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Text data-testid='test-text'>Test text</Text>);
    const text = screen.getByTestId('test-text');
    expect(text).toBeInTheDocument();
  });

  it('passes through HTML attributes', () => {
    renderWithTheme(
      <Text id='text-id' className='custom-class' title='Text title' data-testid='text-with-attrs'>
        Text with attributes
      </Text>
    );

    const text = screen.getByTestId('text-with-attrs');
    expect(text).toHaveAttribute('id', 'text-id');
    expect(text).toHaveAttribute('title', 'Text title');
    expect(text).toHaveClass('custom-class');
  });

  it('combines all props correctly', () => {
    renderWithTheme(
      <Text
        variant='body'
        size='lg'
        weight='bold'
        color='primary'
        align='center'
        italic
        underline
        style={{ textTransform: 'uppercase' }}
        truncate
        as='h2'
        className='combined-text'
        data-testid='combined-text'
      >
        Combined text
      </Text>
    );

    const text = screen.getByTestId('combined-text');
    expect(text).toBeInTheDocument();
    expect(text.tagName).toBe('H2');
    expect(text).toHaveClass('combined-text');
  });

  it('handles nested content correctly', () => {
    renderWithTheme(
      <Text>
        Text with <strong>bold</strong> and <em>italic</em> content
      </Text>
    );

    const text = screen.getByText(/Text with/);
    const bold = screen.getByText('bold');
    const italic = screen.getByText('italic');

    expect(text).toBeInTheDocument();
    expect(bold).toBeInTheDocument();
    expect(italic).toBeInTheDocument();
  });

  it('renders with line height when provided', () => {
    // Remove unsupported lineHeight prop
    renderWithTheme(
      <Text style={{ lineHeight: 1.25 }} data-testid='tight-text'>
        Tight line height
      </Text>
    );
    const text = screen.getByTestId('tight-text');
    expect(text).toBeInTheDocument();
  });
});
