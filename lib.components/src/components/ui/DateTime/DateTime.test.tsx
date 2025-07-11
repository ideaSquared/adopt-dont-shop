import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';

// Mock Radix UI tooltip
jest.mock('@radix-ui/react-tooltip', () => ({
  Provider: Object.assign(
    function MockTooltipProvider({ children }: { children: React.ReactNode }) {
      return <div>{children}</div>;
    },
    { displayName: 'MockTooltipProvider' }
  ),
  Root: Object.assign(
    function MockTooltipRoot({ children }: { children: React.ReactNode }) {
      return <div>{children}</div>;
    },
    { displayName: 'MockTooltipRoot' }
  ),
  Trigger: React.forwardRef(function MockTooltipTrigger(
    {
      children,
      asChild,
      ...props
    }: { children: React.ReactNode; asChild?: boolean } & React.HTMLAttributes<HTMLDivElement>,
    ref: React.ForwardedRef<HTMLDivElement>
  ) {
    if (asChild && React.isValidElement(children)) {
      // Avoid passing ref if not supported by the child
      return React.cloneElement(children, { ...props });
    }
    return (
      <div {...props} ref={ref}>
        {children}
      </div>
    );
  }),
  Portal: Object.assign(
    function MockTooltipPortal({ children }: { children: React.ReactNode }) {
      return <div>{children}</div>;
    },
    { displayName: 'MockTooltipPortal' }
  ),
  Content: Object.assign(
    function MockTooltipContent({ children, ...props }: { children: React.ReactNode }) {
      return (
        <div {...props} data-testid='tooltip-content'>
          {children}
        </div>
      );
    },
    { displayName: 'MockTooltipContent' }
  ),
  Arrow: React.forwardRef(function MockTooltipArrow(
    props: React.HTMLAttributes<HTMLDivElement>,
    ref: React.ForwardedRef<HTMLDivElement>
  ) {
    return <div {...props} ref={ref} data-testid='tooltip-arrow' />;
  }),
}));

import DateTime from './DateTime';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
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
