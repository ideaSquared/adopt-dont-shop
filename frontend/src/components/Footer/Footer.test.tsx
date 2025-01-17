import { lightTheme as theme } from '@adoptdontshop/styles'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ThemeProvider } from 'styled-components'
import Footer from './Footer'

describe('Footer', () => {
  const renderWithTheme = (component: React.ReactNode) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>)
  }

  it('renders correctly', () => {
    renderWithTheme(<Footer />)

    // Check if the footer is rendered
    const footerElement = screen.getByRole('contentinfo')
    expect(footerElement).toBeInTheDocument()

    // Check if the correct text is rendered inside the footer
    expect(footerElement).toHaveTextContent(
      '© 2024 Adopt Dont Shop & ideaSquared. All rights reserved.',
    )
  })
})
