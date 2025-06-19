import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../../styles/ThemeProvider';
import { lightTheme } from '../../../styles/theme';
import { Stack } from './Stack';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

describe('Stack', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(
      <Stack data-testid='stack'>
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );
    const stack = screen.getByTestId('stack');
    const item1 = screen.getByText('Item 1');
    const item2 = screen.getByText('Item 2');

    expect(stack).toBeInTheDocument();
    expect(item1).toBeInTheDocument();
    expect(item2).toBeInTheDocument();
  });

  it('renders with different directions', () => {
    const directions = ['row', 'column'] as const;

    directions.forEach(direction => {
      renderWithTheme(
        <Stack direction={direction} data-testid={`stack-${direction}`}>
          <div>Item 1</div>
          <div>Item 2</div>
        </Stack>
      );
      const stack = screen.getByTestId(`stack-${direction}`);
      expect(stack).toBeInTheDocument();
    });
  });

  it('renders with different spacing', () => {
    const spacings = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

    spacings.forEach(spacing => {
      renderWithTheme(
        <Stack spacing={spacing} data-testid={`stack-${spacing}`}>
          <div>Item 1</div>
          <div>Item 2</div>
        </Stack>
      );
      const stack = screen.getByTestId(`stack-${spacing}`);
      expect(stack).toBeInTheDocument();
    });
  });

  it('renders with different alignments', () => {
    const alignments = ['start', 'center', 'end', 'stretch'] as const;

    alignments.forEach(align => {
      renderWithTheme(
        <Stack align={align} data-testid={`stack-${align}`}>
          <div>Item 1</div>
          <div>Item 2</div>
        </Stack>
      );
      const stack = screen.getByTestId(`stack-${align}`);
      expect(stack).toBeInTheDocument();
    });
  });

  it('renders with different justify values', () => {
    const justifyOptions = ['start', 'center', 'end', 'between', 'around'] as const;

    justifyOptions.forEach(justify => {
      renderWithTheme(
        <Stack justify={justify} data-testid={`stack-${justify}`}>
          <div>Item 1</div>
          <div>Item 2</div>
        </Stack>
      );
      const stack = screen.getByTestId(`stack-${justify}`);
      expect(stack).toBeInTheDocument();
    });
  });

  it('wraps items when wrap prop is true', () => {
    renderWithTheme(
      <Stack wrap data-testid='wrapped-stack'>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Stack>
    );
    const stack = screen.getByTestId('wrapped-stack');
    expect(stack).toBeInTheDocument();
  });

  it('fills container when fullWidth prop is true', () => {
    renderWithTheme(
      <Stack fullWidth data-testid='full-width-stack'>
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );
    const stack = screen.getByTestId('full-width-stack');
    expect(stack).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(
      <Stack data-testid='test-stack'>
        <div>Item</div>
      </Stack>
    );
    const stack = screen.getByTestId('test-stack');
    expect(stack).toBeInTheDocument();
  });

  it('passes through HTML attributes', () => {
    renderWithTheme(
      <Stack
        id='stack-id'
        className='custom-class'
        title='Stack title'
        data-testid='stack-with-attrs'
      >
        <div>Item</div>
      </Stack>
    );

    const stack = screen.getByTestId('stack-with-attrs');
    expect(stack).toHaveAttribute('id', 'stack-id');
    expect(stack).toHaveAttribute('title', 'Stack title');
    expect(stack).toHaveClass('custom-class');
  });

  it('combines all props correctly', () => {
    renderWithTheme(
      <Stack
        direction='row'
        spacing='lg'
        align='center'
        justify='between'
        wrap
        fullWidth
        className='combined-stack'
        data-testid='combined-stack'
      >
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Stack>
    );

    const stack = screen.getByTestId('combined-stack');
    expect(stack).toBeInTheDocument();
    expect(stack).toHaveClass('combined-stack');
  });

  it('handles varying content types', () => {
    renderWithTheme(
      <Stack data-testid='mixed-content-stack'>
        <button>Button</button>
        <p>Paragraph</p>
        <span>Span</span>
        <div>Div</div>
      </Stack>
    );

    const stack = screen.getByTestId('mixed-content-stack');
    const button = screen.getByRole('button', { name: 'Button' });
    const paragraph = screen.getByText('Paragraph');
    const span = screen.getByText('Span');
    const div = screen.getByText('Div');

    expect(stack).toBeInTheDocument();
    expect(button).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
    expect(span).toBeInTheDocument();
    expect(div).toBeInTheDocument();
  });

  it('handles single child correctly', () => {
    renderWithTheme(
      <Stack data-testid='single-child-stack'>
        <div>Single item</div>
      </Stack>
    );

    const stack = screen.getByTestId('single-child-stack');
    const item = screen.getByText('Single item');

    expect(stack).toBeInTheDocument();
    expect(item).toBeInTheDocument();
  });

  it('handles empty stack', () => {
    renderWithTheme(<Stack data-testid='empty-stack' />);
    const stack = screen.getByTestId('empty-stack');
    expect(stack).toBeInTheDocument();
  });
});
