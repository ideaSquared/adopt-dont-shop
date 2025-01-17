import { lightTheme as theme } from '@adoptdontshop/styles'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ThemeProvider } from 'styled-components'
import Table from './Table'

// TODO: Fix these
describe.skip('Table Component', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  it('should apply striped styles when striped prop is true', async () => {
    renderWithTheme(
      <Table striped>
        <thead>
          <tr>
            <th>Header 1</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Row 1</td>
          </tr>
          <tr>
            <td>Row 2</td>
          </tr>
          <tr>
            <td>Row 3</td>
          </tr>
        </tbody>
      </Table>,
    )

    const rows = screen.getAllByRole('row')
    const secondRow = rows[2] // The second row is the third element, because the first row is the header

    expect(secondRow).toHaveStyle(
      `background-color: ${theme.background.contrast}`,
    )
  })

  it('should apply hover styles on table rows', () => {
    renderWithTheme(
      <Table>
        <thead>
          <tr>
            <th>Header 1</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Row 1</td>
          </tr>
        </tbody>
      </Table>,
    )

    const row = screen.getByText('Row 1').closest('tr')

    if (row) {
      // Simulate hover event
      row.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      expect(row).toHaveStyle(
        `background-color: ${theme.background.mouseHighlight}`,
      )
    }
  })

  it('should render actions column with flexbox when hasActions is true', () => {
    renderWithTheme(
      <Table hasActions>
        <thead>
          <tr>
            <th>Data</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Data 1</td>
            <td>Action 1</td>
          </tr>
        </tbody>
      </Table>,
    )

    const actionCell = screen.getByText('Action 1').closest('td')
    expect(actionCell).toHaveStyle('display: flex')
    expect(actionCell).toHaveStyle('gap: 0.5rem')
  })

  it('should not apply striped styles when striped prop is false', () => {
    renderWithTheme(
      <Table>
        <thead>
          <tr>
            <th>Header 1</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Row 1</td>
          </tr>
          <tr>
            <td>Row 2</td>
          </tr>
        </tbody>
      </Table>,
    )

    const rows = screen.getAllByRole('row')
    const secondRow = rows[2] // The second row is the third element, because the first row is the header

    expect(secondRow).not.toHaveStyle(
      `background-color: ${theme.background.contrast}`,
    )
  })

  it('should not apply flexbox styles to last column when hasActions is false', () => {
    renderWithTheme(
      <Table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Data 1</td>
            <td>Action 1</td>
          </tr>
        </tbody>
      </Table>,
    )

    const actionCell = screen.getByText('Action 1').closest('td')
    expect(actionCell).not.toHaveStyle('display: flex')
    expect(actionCell).not.toHaveStyle('gap: 0.5rem')
  })
})
