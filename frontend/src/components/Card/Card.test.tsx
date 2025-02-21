import { lightTheme as theme } from '@adoptdontshop/styles'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ThemeProvider } from 'styled-components'
import Card from '../Card'

describe('Card', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  it('renders the card with the correct title and children', () => {
    renderWithTheme(
      <Card title="Test Card">
        <p>Card content</p>
      </Card>,
    )
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies the correct styles to the card container', () => {
    const { container } = renderWithTheme(
      <Card title="Test Card">
        <p>Card content</p>
      </Card>,
    )
    const card = container.firstChild
    expect(card).toHaveStyle(`
      border: 1px solid ${theme.border.color.default};
      border-radius: 0.25rem;
      margin-bottom: 1rem;
    `)
  })

  it('applies the correct styles to the card header', () => {
    const { container } = renderWithTheme(
      <Card title="Test Card">
        <p>Card content</p>
      </Card>,
    )
    const header = container.querySelector('div > h5.card-title')?.parentElement
    expect(header).toHaveStyle(`
      background-color: ${theme.background.content};
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid ${theme.border.color.default};
    `)
  })

  it('applies the correct styles to the card body', () => {
    const { container } = renderWithTheme(
      <Card title="Test Card">
        <p>Card content</p>
      </Card>,
    )
    const body = container.querySelector('div > p')?.parentElement
    expect(body).toHaveStyle(`
      padding: 1.25rem;
    `)
  })
})
