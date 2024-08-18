import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from '../Button'
import { ThemeProvider } from 'styled-components'
import { theme } from '@adoptdontshop/styles'

describe('Button', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  it('renders the button correctly', () => {
    renderWithTheme(<Button>Click Me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', () => {
    const onClickMock = jest.fn()
    renderWithTheme(<Button onClick={onClickMock}>Click Me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    fireEvent.click(button)
    expect(onClickMock).toHaveBeenCalledTimes(1)
  })

  // TODO: Fix or remove
  it.skip('applies the correct styles for the "success" variant', () => {
    const { container } = renderWithTheme(
      <Button variant="success">Success</Button>,
    )
    const button = container.firstChild
    expect(button).toHaveStyle(`
      background-color: ${theme.background.success};
      color: ${theme.text.success};
    `)
  })

  // TODO: Fix or remove
  it.skip('applies the correct styles for the "danger" variant', () => {
    const { container } = renderWithTheme(
      <Button variant="danger">Danger</Button>,
    )
    const button = container.firstChild
    expect(button).toHaveStyle(`
      background-color: ${theme.background.danger};
      color: ${theme.text.danger};
    `)
  })

  it('is disabled when the disabled prop is true', () => {
    renderWithTheme(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button', { name: /disabled/i })
    expect(button).toBeDisabled()
  })

  it('applies the correct hover styles', () => {
    const { container } = renderWithTheme(
      <Button variant="info">Hover Me</Button>,
    )
    const button = container.firstChild

    fireEvent.mouseOver(button as HTMLElement)
    expect(button).toHaveStyle(`
      background-color: ${theme.background.mouseHighlight};
    `)
  })
})
