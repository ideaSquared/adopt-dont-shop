import { lightTheme as theme } from '@adoptdontshop/styles'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ThemeProvider } from 'styled-components'
import { Alert } from './Alert'

describe('Alert', () => {
  const renderWithTheme = (component: React.ReactNode) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>)
  }

  it('renders success alert by default', () => {
    renderWithTheme(<Alert>Success message</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Success message')
    expect(alert).toBeVisible()
  })

  it.each([
    ['success', 'Success alert'],
    ['error', 'Error alert'],
    ['warning', 'Warning alert'],
    ['info', 'Info alert'],
  ])('renders %s alert correctly', (variant, message) => {
    renderWithTheme(
      <Alert variant={variant as 'success' | 'error' | 'warning' | 'info'}>
        {message}
      </Alert>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(message)
    expect(alert).toBeVisible()
  })

  it('applies custom className when provided', () => {
    const customClass = 'custom-alert'
    renderWithTheme(
      <Alert className={customClass}>Alert with custom class</Alert>,
    )
    expect(screen.getByRole('alert')).toHaveClass(customClass)
  })
})
