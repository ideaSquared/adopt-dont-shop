import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { ProgressBar } from './ProgressBar';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

describe('ProgressBar', () => {
  it('renders correctly with basic props', () => {
    renderWithTheme(<ProgressBar value={50} data-testid="progress-bar" />);
    
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays correct progress value', () => {
    renderWithTheme(<ProgressBar value={75} max={100} data-testid="progress-bar" />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
  });

  it('renders with label', () => {
    renderWithTheme(
      <ProgressBar value={30} label="Download progress" data-testid="progress-bar" />
    );
    
    expect(screen.getByText('Download progress')).toBeInTheDocument();
  });

  it('shows percentage when enabled', () => {
    renderWithTheme(
      <ProgressBar value={45} showPercentage data-testid="progress-bar" />
    );
    
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('shows value when enabled', () => {
    renderWithTheme(
      <ProgressBar value={7} max={10} showValue data-testid="progress-bar" />
    );
    
    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('prioritizes percentage over value when both enabled', () => {
    renderWithTheme(
      <ProgressBar
        value={60}
        max={100}
        showValue
        showPercentage
        data-testid="progress-bar"
      />
    );
    
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.queryByText('60/100')).not.toBeInTheDocument();
  });

  it('clamps value within bounds', () => {
    const { rerender } = renderWithTheme(
      <ProgressBar value={150} max={100} data-testid="progress-bar" />
    );
    
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');

    rerender(
      <ThemeProvider theme={lightTheme}>
        <ProgressBar value={-10} max={100} data-testid="progress-bar" />
      </ThemeProvider>
    );
    
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('renders indeterminate progress', () => {
    renderWithTheme(
      <ProgressBar value={50} indeterminate data-testid="progress-bar" />
    );
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).not.toHaveAttribute('aria-valuenow');
    expect(progressBar).toHaveAttribute('aria-label', 'Progress - loading');
  });

  it('applies different sizes', () => {
    const { rerender } = renderWithTheme(
      <ProgressBar value={50} size="sm" data-testid="progress-bar" />
    );
    
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <ProgressBar value={50} size="lg" data-testid="progress-bar" />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('applies different variants', () => {
    const variants: Array<'default' | 'success' | 'warning' | 'error'> = [
      'default',
      'success',
      'warning',
      'error'
    ];

    variants.forEach(variant => {
      const { unmount } = renderWithTheme(
        <ProgressBar value={50} variant={variant} data-testid={`progress-${variant}`} />
      );
      
      expect(screen.getByTestId(`progress-${variant}`)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders striped progress bar', () => {
    renderWithTheme(
      <ProgressBar value={50} striped data-testid="progress-bar" />
    );
    
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('renders animated striped progress bar', () => {
    renderWithTheme(
      <ProgressBar value={50} striped animated data-testid="progress-bar" />
    );
    
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('handles zero value correctly', () => {
    renderWithTheme(
      <ProgressBar value={0} showPercentage data-testid="progress-bar" />
    );
    
    expect(screen.getByText('0%')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('handles maximum value correctly', () => {
    renderWithTheme(
      <ProgressBar value={100} max={100} showPercentage data-testid="progress-bar" />
    );
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('has proper accessibility attributes', () => {
    renderWithTheme(
      <ProgressBar value={50} label="File upload" data-testid="progress-bar" />
    );
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'File upload - 50 of 100');
  });

  it('includes screen reader text', () => {
    renderWithTheme(
      <ProgressBar value={75} label="Loading" showPercentage data-testid="progress-bar" />
    );
    
    // Screen reader text should be present but visually hidden
    expect(screen.getByText('Loading - 75% complete')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    renderWithTheme(
      <ProgressBar
        value={50}
        className="custom-progress"
        data-testid="progress-bar"
      />
    );
    
    expect(screen.getByTestId('progress-bar')).toHaveClass('custom-progress');
  });

  it('handles fractional values correctly', () => {
    renderWithTheme(
      <ProgressBar value={33.33} showPercentage data-testid="progress-bar" />
    );
    
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('works with custom max value', () => {
    renderWithTheme(
      <ProgressBar value={15} max={20} showValue data-testid="progress-bar" />
    );
    
    expect(screen.getByText('15/20')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemax', '20');
  });

  it('indeterminate state overrides value display', () => {
    renderWithTheme(
      <ProgressBar
        value={75}
        indeterminate
        showPercentage
        label="Loading"
        data-testid="progress-bar"
      />
    );
    
    // Should not show percentage in indeterminate state
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });
}); 