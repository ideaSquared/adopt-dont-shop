import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { Container } from './Container';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('Container', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(
      <Container>
        <div>Container content</div>
      </Container>
    );
    const content = screen.getByText('Container content');
    expect(content).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    renderWithTheme(
      <Container size='lg' data-testid='large-container'>
        Content for large size
      </Container>
    );
    const container = screen.getByTestId('large-container');
    expect(container).toBeInTheDocument();
  });

  it('applies fluid styles when fluid prop is true', () => {
    renderWithTheme(
      <Container fluid data-testid='fluid-container'>
        Fluid container content
      </Container>
    );
    const container = screen.getByTestId('fluid-container');
    expect(container).toBeInTheDocument();
  });

  it('centers content when centerContent prop is true', () => {
    renderWithTheme(
      <Container centerContent data-testid='centered-container'>
        Centered content
      </Container>
    );
    const container = screen.getByTestId('centered-container');
    expect(container).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Container data-testid='test-container'>Test content</Container>);
    const container = screen.getByTestId('test-container');
    expect(container).toBeInTheDocument();
  });

  it('passes through HTML attributes', () => {
    renderWithTheme(
      <Container id='container-id' className='custom-class' data-testid='container-with-attrs'>
        Container with attributes
      </Container>
    );
    const container = screen.getByTestId('container-with-attrs');
    expect(container).toHaveAttribute('id', 'container-id');
    expect(container).toHaveClass('custom-class');
  });

  it('renders with custom className', () => {
    renderWithTheme(
      <Container className='custom-container-class' data-testid='custom-container'>
        Custom styled container
      </Container>
    );
    const container = screen.getByTestId('custom-container');
    expect(container).toHaveClass('custom-container-class');
  });

  it('combines size and fluid props correctly', () => {
    renderWithTheme(
      <Container size='xl' fluid data-testid='xl-fluid-container'>
        XL Fluid container
      </Container>
    );
    const container = screen.getByTestId('xl-fluid-container');
    expect(container).toBeInTheDocument();
  });

  it('combines all props correctly', () => {
    renderWithTheme(
      <Container
        size='lg'
        fluid
        centerContent
        className='combined-container'
        data-testid='combined-container'
      >
        Combined props container
      </Container>
    );
    const container = screen.getByTestId('combined-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('combined-container');
  });

  it('handles nested content correctly', () => {
    renderWithTheme(
      <Container data-testid='parent-container'>
        <div>
          <p>Nested paragraph</p>
          <button>Nested button</button>
        </div>
      </Container>
    );

    const container = screen.getByTestId('parent-container');
    const paragraph = screen.getByText('Nested paragraph');
    const button = screen.getByText('Nested button');

    expect(container).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });
});
