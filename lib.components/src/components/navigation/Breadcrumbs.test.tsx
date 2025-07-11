import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../styles/theme';
import { Breadcrumbs } from './Breadcrumbs';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

const mockItems = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Electronics', href: '/products/electronics' },
  { label: 'Smartphones', href: '/products/electronics/smartphones' },
];

describe('Breadcrumbs', () => {
  it('renders correctly with items', () => {
    renderWithTheme(<Breadcrumbs items={mockItems} />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Smartphones')).toBeInTheDocument();
  });

  it('renders links for non-current items', () => {
    renderWithTheme(<Breadcrumbs items={mockItems} />);

    const homeLink = screen.getByRole('link', { name: 'Home' });
    const productsLink = screen.getByRole('link', { name: 'Products' });
    const electronicsLink = screen.getByRole('link', { name: 'Electronics' });

    expect(homeLink).toHaveAttribute('href', '/');
    expect(productsLink).toHaveAttribute('href', '/products');
    expect(electronicsLink).toHaveAttribute('href', '/products/electronics');
  });

  it('renders current item as text, not link', () => {
    renderWithTheme(<Breadcrumbs items={mockItems} />);

    // Last item should not be a link
    const smartphonesText = screen.getByText('Smartphones');
    // Should be a <button> or <span> for current, not <a>
    expect(['BUTTON', 'SPAN']).toContain(smartphonesText.tagName);
  });

  it('handles click events on breadcrumb items', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    const itemsWithClick = [
      { label: 'Home', onClick: handleClick },
      { label: 'Products', href: '/products' },
      { label: 'Current' },
    ];

    renderWithTheme(<Breadcrumbs items={itemsWithClick} />);

    const homeButton = screen.getByRole('button', { name: 'Home' });
    await user.click(homeButton);

    expect(handleClick).toHaveBeenCalled();
  });

  it('renders with different separators', () => {
    renderWithTheme(<Breadcrumbs items={mockItems} separator='>' />);

    const breadcrumbs = screen.getByRole('navigation');
    expect(breadcrumbs).toBeInTheDocument();
    // The separator should be present in the DOM
    expect(breadcrumbs.textContent).toContain('>');
  });

  it('renders with custom separator component', () => {
    const CustomSeparator = () => <span data-testid='custom-separator'>|</span>;

    renderWithTheme(<Breadcrumbs items={mockItems} separator={<CustomSeparator />} />);

    const separators = screen.getAllByTestId('custom-separator');
    expect(separators).toHaveLength(mockItems.length - 1);
  });

  it('handles empty items array', () => {
    renderWithTheme(<Breadcrumbs items={[]} />);

    const breadcrumbs = screen.getByRole('navigation');
    expect(breadcrumbs).toBeInTheDocument();

    // Should have empty list
    const list = breadcrumbs.querySelector('ol');
    expect(list).toBeEmptyDOMElement();
  });

  it('handles single item', () => {
    const singleItem = [{ label: 'Home', href: '/' }];
    renderWithTheme(<Breadcrumbs items={singleItem} />);

    const homeText = screen.getByText('Home');
    expect(homeText).toBeInTheDocument();
    // Single item should not be a link (it's the current page)
    expect(['BUTTON', 'SPAN']).toContain(homeText.tagName);
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Breadcrumbs items={mockItems} data-testid='test-breadcrumbs' />);
    const breadcrumbs = screen.getByTestId('test-breadcrumbs');
    expect(breadcrumbs).toBeInTheDocument();
  });

  it('passes through HTML attributes', () => {
    renderWithTheme(
      <Breadcrumbs
        items={mockItems}
        className='custom-class'
        data-testid='breadcrumbs-with-attrs'
      />
    );

    const breadcrumbs = screen.getByTestId('breadcrumbs-with-attrs');
    expect(breadcrumbs).toBeInTheDocument();
    expect(breadcrumbs).toHaveClass('custom-class');
  });

  it('has proper accessibility structure', () => {
    renderWithTheme(<Breadcrumbs items={mockItems} />);

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(mockItems.length);
  });

  it('combines all props correctly', () => {
    renderWithTheme(
      <Breadcrumbs
        items={mockItems}
        separator='→'
        className='combined-breadcrumbs'
        data-testid='combined-breadcrumbs'
      />
    );

    const breadcrumbs = screen.getByTestId('combined-breadcrumbs');
    expect(breadcrumbs).toBeInTheDocument();
    expect(breadcrumbs).toHaveClass('combined-breadcrumbs');

    // Check that the custom separator is used
    expect(breadcrumbs.textContent).toContain('→');
  });

  it('handles items with disabled state', () => {
    const itemsWithDisabled = [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products', disabled: true },
      { label: 'Current Page' },
    ];

    renderWithTheme(<Breadcrumbs items={itemsWithDisabled} />);

    const homeLink = screen.getByRole('link', { name: 'Home' });
    const productsText = screen.getByText('Products');

    expect(homeLink).toBeInTheDocument();
    // Disabled item should not be a link, should be a button or span
    expect(['BUTTON', 'SPAN']).toContain(productsText.tagName);
  });
});
