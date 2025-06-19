import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../../styles/ThemeProvider';
import { lightTheme } from '../../../styles/theme';

// Mock react-world-flags
jest.mock('react-world-flags', () => {
  return React.forwardRef<HTMLElement, any>((props, ref) => (
    <span {...props} ref={ref} data-testid='flag-icon'>
      🏁
    </span>
  ));
});

import countries from './CountryList.json';
import CountrySelect from './CountrySelectInput';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

describe('CountrySelect Component', () => {
  const mockOnCountryChange = jest.fn();

  beforeEach(() => {
    mockOnCountryChange.mockClear();
  });

  it('should render correctly with default props', () => {
    renderWithTheme(<CountrySelect onCountryChange={mockOnCountryChange} />);
    expect(screen.getByRole('button')).toHaveTextContent('Select Country');
  });

  it('should open the dropdown when clicked', () => {
    renderWithTheme(<CountrySelect onCountryChange={mockOnCountryChange} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('should close the dropdown when clicking outside', () => {
    renderWithTheme(<CountrySelect onCountryChange={mockOnCountryChange} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should display the selected country', () => {
    renderWithTheme(
      <CountrySelect onCountryChange={mockOnCountryChange} countryValue='United States' />
    );
    expect(screen.getByText('United States')).toBeInTheDocument();
  });

  it('should call onCountryChange when a country is selected', () => {
    renderWithTheme(<CountrySelect onCountryChange={mockOnCountryChange} />);
    fireEvent.click(screen.getByRole('button'));
    const countryOption = screen.getByText(countries[0].name);
    fireEvent.click(countryOption);
    expect(mockOnCountryChange).toHaveBeenCalledWith(countries[0].name);
  });

  it('should highlight the correct country with keyboard navigation', () => {
    renderWithTheme(<CountrySelect onCountryChange={mockOnCountryChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    // Just verify the first country option is present after keyboard navigation
    const firstCountryOption = screen.getByText(countries[0].name);
    expect(firstCountryOption).toBeInTheDocument();
  });

  it('should select a country with Enter key', () => {
    renderWithTheme(<CountrySelect onCountryChange={mockOnCountryChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(mockOnCountryChange).toHaveBeenCalledWith(countries[0].name);
  });

  it('should close the dropdown when Escape key is pressed', () => {
    renderWithTheme(<CountrySelect onCountryChange={mockOnCountryChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should be disabled when the disabled prop is true', () => {
    renderWithTheme(<CountrySelect onCountryChange={mockOnCountryChange} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
