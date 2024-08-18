import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CountrySelect from './CountrySelectInput'
import countries from './CountryList.json'

// TODO: Fix
describe.skip('CountrySelect Component', () => {
  const mockOnCountryChange = jest.fn()

  beforeEach(() => {
    mockOnCountryChange.mockClear()
  })

  it('should render correctly with default props', () => {
    render(<CountrySelect onCountryChange={mockOnCountryChange} />)
    expect(screen.getByRole('button')).toHaveTextContent('Select Country')
  })

  it('should open the dropdown when clicked', () => {
    render(<CountrySelect onCountryChange={mockOnCountryChange} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('should close the dropdown when clicking outside', () => {
    render(<CountrySelect onCountryChange={mockOnCountryChange} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.mouseDown(document)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('should display the selected country', () => {
    render(
      <CountrySelect
        onCountryChange={mockOnCountryChange}
        countryValue="United States"
      />,
    )
    expect(screen.getByText('United States')).toBeInTheDocument()
  })

  it('should call onCountryChange when a country is selected', () => {
    render(<CountrySelect onCountryChange={mockOnCountryChange} />)
    fireEvent.click(screen.getByRole('button'))
    const countryOption = screen.getByText(countries[0].name)
    fireEvent.click(countryOption)
    expect(mockOnCountryChange).toHaveBeenCalledWith(countries[0].name)
  })

  it('should highlight the correct country with keyboard navigation', () => {
    render(<CountrySelect onCountryChange={mockOnCountryChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' })
    const highlightedOption = screen.getByText(countries[0].name)
    expect(highlightedOption.parentElement).toHaveClass('highlighted')
  })

  it('should select a country with Enter key', () => {
    render(<CountrySelect onCountryChange={mockOnCountryChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(mockOnCountryChange).toHaveBeenCalledWith(countries[0].name)
  })

  it('should close the dropdown when Escape key is pressed', () => {
    render(<CountrySelect onCountryChange={mockOnCountryChange} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('should be disabled when the disabled prop is true', () => {
    render(<CountrySelect onCountryChange={mockOnCountryChange} disabled />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
