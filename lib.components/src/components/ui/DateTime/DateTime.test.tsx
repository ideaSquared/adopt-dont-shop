import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../../styles/ThemeProvider';
import { lightTheme } from '../../../styles/theme';

// Mock Radix UI tooltip
jest.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Trigger: React.forwardRef<HTMLElement, any>(({ children, asChild, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, { ...props, ref });
    }
    return (
      <div {...props} ref={ref}>
        {children}
      </div>
    );
  }),
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children, ...props }: { children: React.ReactNode }) => (
    <div {...props} data-testid='tooltip-content'>
      {children}
    </div>
  ),
  Arrow: React.forwardRef<HTMLElement, any>((props, ref) => (
    <div {...props} ref={ref} data-testid='tooltip-arrow' />
  )),
}));

import DateTime from './DateTime';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

describe('DateTime Component', () => {
  const mockTimestamp = '2024-08-16T14:30:00Z';

  it('renders the formatted date and time correctly without tooltip', () => {
    renderWithTheme(<DateTime timestamp={mockTimestamp} showTooltip={false} />);

    const dateTimeElement = screen.getByText(/16th August 2024, 14:30 UTC/i);
    expect(dateTimeElement).toBeInTheDocument();
  });

  it('renders the tooltip with correct content when showTooltip is true', async () => {
    renderWithTheme(<DateTime timestamp={mockTimestamp} showTooltip={true} />);

    const dateTimeElement = screen.getByText(/16th August 2024, 14:30 UTC/i);
    expect(dateTimeElement).toBeInTheDocument();

    fireEvent.mouseOver(dateTimeElement);

    await waitFor(() => {
      expect(screen.findByText(/Local Time:/i)).toBeTruthy();
      expect(screen.findByText(/UTC:/i)).toBeTruthy();
      expect(screen.findByText(/New York:/i)).toBeTruthy();
    });
  });

  it('formats the date correctly with ordinal suffix', () => {
    renderWithTheme(<DateTime timestamp={mockTimestamp} />);

    const dateTimeElement = screen.getByText(/16th August 2024, 14:30 UTC/i);
    expect(dateTimeElement).toBeInTheDocument();
  });

  it('formats the date correctly in the specified locale', () => {
    renderWithTheme(<DateTime timestamp={mockTimestamp} localeOption='en-US' />);

    const dateTimeElement = screen.getByText(/August 16, 2024, 02:30 PM UTC/i);
    expect(dateTimeElement).toBeInTheDocument();
  });
});
