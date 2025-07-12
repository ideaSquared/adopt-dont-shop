import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';

// Create comprehensive mocks for Radix UI components
const mockRadixUI = {
  Root: Object.assign(
    function MockDropdownRoot({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) {
      return (
        <div data-testid='dropdown-root' {...props}>
          {children}
        </div>
      );
    },
    { displayName: 'MockDropdownRoot' }
  ),
  Trigger: React.forwardRef<
    HTMLButtonElement,
    React.PropsWithChildren<{ asChild?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>>
  >(function MockDropdownTrigger(props, ref) {
    const { children, asChild, ...rest } = props;
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, {
        ...rest,
        ref,
        'data-testid': 'dropdown-trigger',
      });
    }
    return (
      <button {...rest} ref={ref} data-testid='dropdown-trigger'>
        {children}
      </button>
    );
  }),
  Portal: Object.assign(
    function MockDropdownPortal({ children }: { children: React.ReactNode }) {
      return <div data-testid='dropdown-portal'>{children}</div>;
    },
    { displayName: 'MockDropdownPortal' }
  ),
  Content: React.forwardRef<
    HTMLDivElement,
    React.PropsWithChildren<
      { sideOffset?: number; align?: string } & React.HTMLAttributes<HTMLDivElement>
    >
  >(function MockDropdownContent(props, ref) {
    const { children, sideOffset, align, ...rest } = props;
    return (
      <div
        {...rest}
        ref={ref}
        data-testid='dropdown-content'
        data-side-offset={sideOffset}
        data-align={align}
      >
        {children}
      </div>
    );
  }),
  Item: React.forwardRef<
    HTMLDivElement,
    React.PropsWithChildren<
      {
        as?: React.ElementType;
        href?: string;
        onClick?: React.MouseEventHandler;
      } & React.HTMLAttributes<HTMLDivElement>
    >
  >(function MockDropdownItem(props, ref) {
    const { children, as, href, onClick, ...rest } = props;
    const Element: React.ElementType = as || (href ? 'a' : 'div');
    return (
      <Element
        {...rest}
        ref={ref}
        href={href}
        onClick={onClick}
        data-testid='dropdown-item'
        role='menuitem'
      >
        {children}
      </Element>
    );
  }),
};

// Mock the entire Radix UI module
jest.mock('@radix-ui/react-dropdown-menu', () => mockRadixUI);

// Import the component after mocking
import { DropdownButton } from './DropdownButton';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('DropdownButton', () => {
  const mockOnClick = jest.fn();
  const mockOnClick2 = jest.fn();

  const sampleItems = [
    { label: 'Edit', onClick: mockOnClick },
    { label: 'View Details', to: '/details' },
    { label: 'Delete', onClick: mockOnClick2 },
  ];

  beforeEach(() => {
    mockOnClick.mockClear();
    mockOnClick2.mockClear();
  });

  it('renders correctly with trigger label', () => {
    renderWithTheme(<DropdownButton triggerLabel='Actions' items={sampleItems} />);

    const trigger = screen.getByTestId('dropdown-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Actions');
    expect(trigger).toHaveAttribute('aria-label', 'Actions');
  });

  it('applies custom className when provided', () => {
    renderWithTheme(
      <DropdownButton triggerLabel='Actions' items={sampleItems} className='custom-dropdown' />
    );

    const trigger = screen.getByTestId('dropdown-trigger');
    expect(trigger).toHaveClass('custom-dropdown');
  });

  it('handles empty items array', () => {
    renderWithTheme(<DropdownButton triggerLabel='Empty' items={[]} />);

    const trigger = screen.getByTestId('dropdown-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Empty');
  });

  it('renders dropdown structure with Radix components', () => {
    renderWithTheme(<DropdownButton triggerLabel='Actions' items={sampleItems} />);

    // Check that the Radix UI structure is rendered
    expect(screen.getByTestId('dropdown-root')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-portal')).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
  });

  it('renders all dropdown items with correct content', () => {
    renderWithTheme(<DropdownButton triggerLabel='Actions' items={sampleItems} />);

    // Check item content is rendered
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    // Check that link item has href
    const linkItem = screen.getByText('View Details');
    expect(linkItem).toHaveAttribute('href', '/details');
    expect(linkItem.tagName).toBe('A');
  });

  it('handles click events on dropdown items', () => {
    renderWithTheme(<DropdownButton triggerLabel='Actions' items={sampleItems} />);

    const editItem = screen.getByText('Edit');
    const deleteItem = screen.getByText('Delete');

    fireEvent.click(editItem);
    expect(mockOnClick).toHaveBeenCalledTimes(1);

    fireEvent.click(deleteItem);
    expect(mockOnClick2).toHaveBeenCalledTimes(1);
  });

  it('renders items with correct element types', () => {
    renderWithTheme(<DropdownButton triggerLabel='Actions' items={sampleItems} />);

    const editItem = screen.getByText('Edit');
    const linkItem = screen.getByText('View Details');
    const deleteItem = screen.getByText('Delete');

    // Edit and Delete items should be div elements (no href)
    expect(editItem.tagName).toBe('DIV');
    expect(deleteItem.tagName).toBe('DIV');
    // Link item should be an anchor element
    expect(linkItem.tagName).toBe('A');
  });

  it('applies correct accessibility attributes to trigger', () => {
    renderWithTheme(<DropdownButton triggerLabel='Actions' items={sampleItems} />);

    const trigger = screen.getByTestId('dropdown-trigger');
    expect(trigger).toHaveAttribute('aria-label', 'Actions');
  });

  it('passes sideOffset and align props to Content', () => {
    renderWithTheme(<DropdownButton triggerLabel='Actions' items={sampleItems} />);

    const content = screen.getByTestId('dropdown-content');
    expect(content).toHaveAttribute('data-side-offset', '5');
    expect(content).toHaveAttribute('data-align', 'end');
  });

  it('supports keyboard interaction on trigger', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DropdownButton triggerLabel='Actions' items={sampleItems} />);

    const trigger = screen.getByTestId('dropdown-trigger');

    // Focus the trigger
    await user.tab();
    expect(trigger).toHaveFocus();

    // Trigger should be focusable and interactive (styled-components button)
    expect(trigger).toBeInTheDocument();
    expect(trigger.tagName).toBe('BUTTON');
  });

  it('handles items without onClick or to props', () => {
    const itemsWithoutHandlers = [{ label: 'Read Only Item' }, { label: 'Another Item' }];

    renderWithTheme(<DropdownButton triggerLabel='Actions' items={itemsWithoutHandlers} />);

    expect(screen.getByText('Read Only Item')).toBeInTheDocument();
    expect(screen.getByText('Another Item')).toBeInTheDocument();
  });

  it('renders items in correct order', () => {
    renderWithTheme(<DropdownButton triggerLabel='Actions' items={sampleItems} />);

    const content = screen.getByTestId('dropdown-content');
    const childElements = Array.from(content.children);

    expect(childElements).toHaveLength(3);
    expect(childElements[0]).toHaveTextContent('Edit');
    expect(childElements[1]).toHaveTextContent('View Details');
    expect(childElements[2]).toHaveTextContent('Delete');
  });
});
