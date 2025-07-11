import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme as theme } from '../../../styles/theme';
import BaseSidebar from '../BaseSidebar';

describe('BaseSidebar', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<StyledThemeProvider theme={theme}>{ui}</StyledThemeProvider>);
  };

  it('renders the sidebar with the correct title and content', () => {
    renderWithTheme(
      <BaseSidebar show={true} handleClose={() => {}} title='Test Sidebar'>
        <p>Sidebar content</p>
      </BaseSidebar>
    );
    expect(screen.getByText('Test Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Sidebar content')).toBeInTheDocument();
  });

  it('does not display the sidebar when "show" is false', () => {
    const { container } = renderWithTheme(
      <BaseSidebar show={false} handleClose={() => {}} title='Test Sidebar'>
        <p>Sidebar content</p>
      </BaseSidebar>
    );
    const sidebarContainer = container.firstChild;
    expect(sidebarContainer).toHaveStyle('transform: translateX(100%)');
  });

  it('displays the sidebar when "show" is true', () => {
    const { container } = renderWithTheme(
      <BaseSidebar show={true} handleClose={() => {}} title='Test Sidebar'>
        <p>Sidebar content</p>
      </BaseSidebar>
    );
    const sidebarContainer = container.firstChild;
    expect(sidebarContainer).toHaveStyle('transform: translateX(0)');
  });

  it('calls the handleClose function when the close button is clicked', () => {
    const handleCloseMock = jest.fn();
    renderWithTheme(
      <BaseSidebar show={true} handleClose={handleCloseMock} title='Test Sidebar'>
        <p>Sidebar content</p>
      </BaseSidebar>
    );
    const closeButton = screen.getByRole('button', { name: /×/i });
    fireEvent.click(closeButton);
    expect(handleCloseMock).toHaveBeenCalledTimes(1);
  });

  it('renders the sidebar with the correct width based on the "size" prop', () => {
    const { container } = renderWithTheme(
      <BaseSidebar show={true} handleClose={() => {}} title='Test Sidebar' size='50%'>
        <p>Sidebar content</p>
      </BaseSidebar>
    );
    const sidebarContainer = container.firstChild;
    expect(sidebarContainer).toHaveStyle('width: 50%');
  });
});
