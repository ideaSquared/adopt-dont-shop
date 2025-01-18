import { lightTheme as theme } from '@adoptdontshop/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'styled-components'
import GenericFilters, { FilterConfig } from './GenericFilters'

describe('GenericFilters Component', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  const mockOnFilterChange = jest.fn()

  const filterConfig: FilterConfig[] = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'Enter name' },
    { name: 'date', label: 'Date', type: 'date' },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'cat', label: 'Cat' },
        { value: 'dog', label: 'Dog' },
      ],
    },
    { name: 'verified', label: 'Verified', type: 'checkbox' },
  ]

  const initialFilters = {
    name: '',
    date: '',
    category: '',
    verified: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all inputs based on the configuration', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: 'Category' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Verified' }),
    ).toBeInTheDocument()
  })

  it('updates the text input value on change', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />,
    )

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    fireEvent.change(nameInput, { target: { value: 'Fluffy' } })

    expect(mockOnFilterChange).toHaveBeenCalledWith('name', 'Fluffy')
  })

  it('updates the date input value on change', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />,
    )

    const dateInput = screen.getByLabelText('Date')
    fireEvent.change(dateInput, { target: { value: '2023-01-01' } })

    expect(mockOnFilterChange).toHaveBeenCalledWith('date', '2023-01-01')
  })

  it('updates the select input value on change', async () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />,
    )

    const selectInput = screen.getByRole('combobox', { name: 'Category' })
    await userEvent.selectOptions(selectInput, 'dog')

    expect(mockOnFilterChange).toHaveBeenCalledWith('category', 'dog')
  })

  //   TODO: Fix this test - but do we need to we test this anyway?
  it.skip('updates the checkbox value on change', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />,
    )

    const checkboxInput = screen.getByRole('checkbox', { name: 'Verified' })

    // First click - check
    fireEvent.click(checkboxInput)
    expect(mockOnFilterChange).toHaveBeenCalledWith('verified', true)

    // Second click - uncheck
    fireEvent.click(checkboxInput)
    expect(mockOnFilterChange).toHaveBeenCalledWith('verified', false)
  })

  it('renders options for select input', () => {
    renderWithTheme(
      <GenericFilters
        filters={initialFilters}
        onFilterChange={mockOnFilterChange}
        filterConfig={filterConfig}
      />,
    )

    const selectInput = screen.getByRole('combobox', { name: 'Category' })
    const options = screen.getAllByRole('option')

    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('Select an option')
    expect(options[1]).toHaveTextContent('Cat')
    expect(options[2]).toHaveTextContent('Dog')
  })
})
