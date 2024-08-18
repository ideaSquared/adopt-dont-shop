import React from 'react'
import { render, screen } from '@testing-library/react'
import Footer from './Footer'

describe('Footer', () => {
  it('renders correctly', () => {
    render(<Footer />)

    // Check if the footer is rendered
    const footerElement = screen.getByRole('contentinfo')
    expect(footerElement).toBeInTheDocument()

    // Check if the correct text is rendered inside the footer
    expect(footerElement).toHaveTextContent(
      '© 2024 Adopt Dont Shop & ideaSquared. All rights reserved.',
    )
  })
})
