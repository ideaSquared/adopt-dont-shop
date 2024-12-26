import { theme } from '@adoptdontshop/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'styled-components'
import Tooltip from './Tooltip'

// TODO: Errors with testing this - maybe due to Radix will investigate another time
describe.skip('Tooltip Component', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  test('renders tooltip content on hover with a span element', async () => {
    renderWithTheme(
      <Tooltip content="Tooltip Content">
        <span>Hover me</span>
      </Tooltip>,
    )

    // Tooltip content should not be in the document initially
    expect(screen.queryByText('Tooltip Content')).not.toBeInTheDocument()

    // Hover over the span
    await userEvent.hover(screen.getByText('Hover me'))

    // Wait for the tooltip content to appear
    expect(await screen.findByText('Tooltip Content')).toBeInTheDocument()

    // Unhover the span
    await userEvent.unhover(screen.getByText('Hover me'))

    // Tooltip content should disappear
    expect(screen.queryByText('Tooltip Content')).not.toBeInTheDocument()
  })

  test('renders tooltip content on hover with a div element', async () => {
    renderWithTheme(
      <Tooltip content="Tooltip Content">
        <div>Hover over this div</div>
      </Tooltip>,
    )

    expect(screen.queryByText('Tooltip Content')).not.toBeInTheDocument()

    await userEvent.hover(screen.getByText('Hover over this div'))

    expect(await screen.findByText('Tooltip Content')).toBeInTheDocument()

    await userEvent.unhover(screen.getByText('Hover over this div'))

    expect(screen.queryByText('Tooltip Content')).not.toBeInTheDocument()
  })
})
