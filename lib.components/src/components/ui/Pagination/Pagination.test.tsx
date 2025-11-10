import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { Pagination } from './Pagination';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with basic props', () => {
    renderWithTheme(<Pagination {...defaultProps} data-testid='pagination' />);

    expect(screen.getByTestId('pagination')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 1')).toBeInTheDocument();
  });

  it('does not render when totalPages is 1 or less', () => {
    renderWithTheme(<Pagination {...defaultProps} totalPages={1} data-testid='pagination' />);

    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
  });

  it('handles page change correctly', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination {...defaultProps} onPageChange={handlePageChange} data-testid='pagination' />
    );

    fireEvent.click(screen.getByLabelText('Go to page 2'));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('handles next page navigation', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination {...defaultProps} onPageChange={handlePageChange} data-testid='pagination' />
    );

    fireEvent.click(screen.getByLabelText('Go to next page'));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('handles previous page navigation', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination
        {...defaultProps}
        currentPage={5}
        onPageChange={handlePageChange}
        data-testid='pagination'
      />
    );

    fireEvent.click(screen.getByLabelText('Go to previous page'));
    expect(handlePageChange).toHaveBeenCalledWith(4);
  });

  it('disables previous button on first page', () => {
    renderWithTheme(<Pagination {...defaultProps} currentPage={1} data-testid='pagination' />);

    expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    renderWithTheme(
      <Pagination {...defaultProps} currentPage={10} totalPages={10} data-testid='pagination' />
    );

    expect(screen.getByLabelText('Go to next page')).toBeDisabled();
  });

  it('shows first and last buttons when enabled', () => {
    renderWithTheme(<Pagination {...defaultProps} showFirstLast={true} data-testid='pagination' />);

    expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();
  });

  it('handles first page navigation', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination
        {...defaultProps}
        currentPage={5}
        showFirstLast={true}
        onPageChange={handlePageChange}
        data-testid='pagination'
      />
    );

    fireEvent.click(screen.getByLabelText('Go to first page'));
    expect(handlePageChange).toHaveBeenCalledWith(1);
  });

  it('handles last page navigation', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination
        {...defaultProps}
        currentPage={5}
        showFirstLast={true}
        onPageChange={handlePageChange}
        data-testid='pagination'
      />
    );

    fireEvent.click(screen.getByLabelText('Go to last page'));
    expect(handlePageChange).toHaveBeenCalledWith(10);
  });

  it('shows ellipsis for large page ranges', () => {
    renderWithTheme(
      <Pagination {...defaultProps} currentPage={10} totalPages={20} data-testid='pagination' />
    );

    expect(screen.getAllByText('...')).toHaveLength(2);
  });

  it('highlights current page', () => {
    renderWithTheme(<Pagination {...defaultProps} currentPage={3} data-testid='pagination' />);

    const currentPageButton = screen.getByLabelText('Go to page 3');
    expect(currentPageButton).toHaveAttribute('aria-current', 'page');
  });

  it('disables all buttons when disabled prop is true', () => {
    renderWithTheme(
      <Pagination {...defaultProps} disabled={true} showFirstLast={true} data-testid='pagination' />
    );

    expect(screen.getByLabelText('Go to first page')).toBeDisabled();
    expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
    expect(screen.getByLabelText('Go to next page')).toBeDisabled();
    expect(screen.getByLabelText('Go to last page')).toBeDisabled();
  });

  it('hides prev/next buttons when showPrevNext is false', () => {
    renderWithTheme(<Pagination {...defaultProps} showPrevNext={false} data-testid='pagination' />);

    expect(screen.queryByLabelText('Go to previous page')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Go to next page')).not.toBeInTheDocument();
  });

  it('applies different sizes', () => {
    const { rerender } = renderWithTheme(
      <Pagination {...defaultProps} size='sm' data-testid='pagination' />
    );

    expect(screen.getByTestId('pagination')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <Pagination {...defaultProps} size='lg' data-testid='pagination' />
      </StyledThemeProvider>
    );

    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('applies different variants', () => {
    const { rerender } = renderWithTheme(
      <Pagination {...defaultProps} variant='outlined' data-testid='pagination' />
    );

    expect(screen.getByTestId('pagination')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <Pagination {...defaultProps} variant='minimal' data-testid='pagination' />
      </StyledThemeProvider>
    );

    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('respects siblingCount prop', () => {
    renderWithTheme(
      <Pagination
        {...defaultProps}
        currentPage={10}
        totalPages={20}
        siblingCount={2}
        data-testid='pagination'
      />
    );

    // Should show more sibling pages around current page
    expect(screen.getByLabelText('Go to page 8')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 9')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 10')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 11')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to page 12')).toBeInTheDocument();
  });

  it('does not call onPageChange for current page', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination
        {...defaultProps}
        currentPage={3}
        onPageChange={handlePageChange}
        data-testid='pagination'
      />
    );

    fireEvent.click(screen.getByLabelText('Go to page 3'));
    expect(handlePageChange).not.toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    renderWithTheme(<Pagination {...defaultProps} data-testid='pagination' />);

    const nav = screen.getByTestId('pagination');
    expect(nav).toHaveAttribute('role', 'navigation');
    expect(nav).toHaveAttribute('aria-label', 'Pagination');
  });
});
