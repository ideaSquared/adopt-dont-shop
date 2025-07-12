import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { EmptyState } from './EmptyState';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('EmptyState', () => {
  it('renders correctly with basic props', () => {
    renderWithTheme(<EmptyState title='No data found' data-testid='empty-state' />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders with description', () => {
    renderWithTheme(
      <EmptyState
        title='No pets found'
        description='Try adjusting your search filters to find more pets.'
        data-testid='empty-state'
      />
    );

    expect(screen.getByText('No pets found')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your search filters to find more pets.')
    ).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    const CustomIcon = () => <div data-testid='custom-icon'>Custom Icon</div>;

    renderWithTheme(
      <EmptyState title='Custom empty state' icon={<CustomIcon />} data-testid='empty-state' />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders with image', () => {
    renderWithTheme(
      <EmptyState title='No data' image='/path/to/image.png' data-testid='empty-state' />
    );

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/path/to/image.png');
  });

  it('renders different variants with appropriate icons', () => {
    const variants: Array<'default' | 'error' | 'search' | 'loading'> = [
      'default',
      'error',
      'search',
      'loading',
    ];

    variants.forEach(variant => {
      const { unmount } = renderWithTheme(
        <EmptyState title='Test title' variant={variant} data-testid={`empty-state-${variant}`} />
      );

      expect(screen.getByTestId(`empty-state-${variant}`)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders action buttons', () => {
    const action1 = jest.fn();
    const action2 = jest.fn();

    const actions = [
      { label: 'Primary Action', onClick: action1, variant: 'primary' as const },
      { label: 'Secondary Action', onClick: action2, variant: 'secondary' as const },
    ];

    renderWithTheme(<EmptyState title='No data' actions={actions} data-testid='empty-state' />);

    expect(screen.getByText('Primary Action')).toBeInTheDocument();
    expect(screen.getByText('Secondary Action')).toBeInTheDocument();
  });

  it('handles action button clicks', () => {
    const handleAction = jest.fn();

    const actions = [{ label: 'Click me', onClick: handleAction }];

    renderWithTheme(<EmptyState title='No data' actions={actions} data-testid='empty-state' />);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('disables action buttons when specified', () => {
    const handleAction = jest.fn();

    const actions = [{ label: 'Disabled Action', onClick: handleAction, disabled: true }];

    renderWithTheme(<EmptyState title='No data' actions={actions} data-testid='empty-state' />);

    const button = screen.getByText('Disabled Action');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleAction).not.toHaveBeenCalled();
  });

  it('applies different sizes', () => {
    const { rerender } = renderWithTheme(
      <EmptyState title='Small' size='sm' data-testid='empty-state' />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <EmptyState title='Medium' size='md' data-testid='empty-state' />
      </StyledThemeProvider>
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <EmptyState title='Large' size='lg' data-testid='empty-state' />
      </StyledThemeProvider>
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    renderWithTheme(<EmptyState title='No data' data-testid='empty-state' />);

    const container = screen.getByTestId('empty-state');
    expect(container).toHaveAttribute('role', 'status');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('renders multiple actions correctly', () => {
    const actions = [
      { label: 'Action 1', onClick: jest.fn() },
      { label: 'Action 2', onClick: jest.fn() },
      { label: 'Action 3', onClick: jest.fn() },
    ];

    renderWithTheme(
      <EmptyState title='Multiple actions' actions={actions} data-testid='empty-state' />
    );

    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
    expect(screen.getByText('Action 3')).toBeInTheDocument();
  });

  it('renders without actions when none provided', () => {
    renderWithTheme(<EmptyState title='No actions' data-testid='empty-state' />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('prefers image over icon when both provided', () => {
    const CustomIcon = () => <div data-testid='custom-icon'>Custom Icon</div>;

    renderWithTheme(
      <EmptyState
        title='Image and icon'
        icon={<CustomIcon />}
        image='/path/to/image.png'
        data-testid='empty-state'
      />
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-icon')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithTheme(
      <EmptyState title='Custom class' className='custom-empty-state' data-testid='empty-state' />
    );

    expect(screen.getByTestId('empty-state')).toHaveClass('custom-empty-state');
  });
});
