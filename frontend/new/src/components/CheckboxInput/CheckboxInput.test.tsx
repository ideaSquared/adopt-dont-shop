import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import CheckboxInput from '../CheckboxInput'
import { ThemeProvider } from 'styled-components'
import { theme } from '@adoptdontshop/styles'

describe('CheckboxInput', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  it('renders the checkbox correctly', () => {
    renderWithTheme(<CheckboxInput checked={false} onChange={() => {}} />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('checkbox can be checked and unchecked', () => {
    const onChangeMock = jest.fn()
    renderWithTheme(<CheckboxInput checked={false} onChange={onChangeMock} />)

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(onChangeMock).toHaveBeenCalledTimes(1)
  })

  it('checkbox is checked when checked prop is true', () => {
    renderWithTheme(<CheckboxInput checked={true} onChange={() => {}} />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('checkbox is disabled when disabled prop is true', () => {
    renderWithTheme(
      <CheckboxInput checked={false} onChange={() => {}} disabled />,
    )
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()
  })

  it('checkbox has correct styles from styled-components', () => {
    const { container } = renderWithTheme(
      <CheckboxInput checked={false} onChange={() => {}} />,
    )
    const checkbox = container.querySelector('input[type="checkbox"]')
    expect(checkbox).toHaveStyle(`
			width: auto;
			height: auto;
			cursor: pointer;
			margin: 0;
			padding: 0;
		`)
  })
})
