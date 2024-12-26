import { Role, usePermissions } from '@adoptdontshop/permissions'
import { theme } from '@adoptdontshop/styles'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { UserProvider } from '../../contexts/auth/UserContext'
import Navbar from './Navbar'

// Mock the usePermissions hook
jest.mock('@adoptdontshop/permissions', () => ({
  usePermissions: jest.fn(),
  Role: {
    STAFF: 'STAFF',
    ADMIN: 'ADMIN',
  },
}))

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <UserProvider>
      <ThemeProvider theme={theme}>
        <Router>{ui}</Router>
      </ThemeProvider>
    </UserProvider>,
  )
}

describe('Navbar', () => {
  it('renders correctly with basic elements', () => {
    ;(usePermissions as jest.Mock).mockReturnValue({
      hasRole: () => false,
    })

    renderWithProviders(<Navbar />)

    // Verify Home link is present
    expect(screen.getByText('Home')).toBeInTheDocument()

    // Verify Account DropdownMenu is present
    expect(screen.getByText('User')).toBeInTheDocument()

    // Rescue and Admin dropdowns should not be present
    expect(screen.queryByText('Staff')).not.toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('renders Rescue dropdown when user has STAFF role', async () => {
    ;(usePermissions as jest.Mock).mockReturnValue({
      hasRole: (role: Role) => role === Role.STAFF,
    })

    renderWithProviders(<Navbar />)

    // Trigger the dropdown
    const staffTrigger = screen.getByText('Staff')
    await act(async () => {
      await userEvent.click(staffTrigger)
    })

    // Check if the dropdown items are present
    expect(screen.getByText(/Applications/i)).toBeInTheDocument()
    expect(screen.getByText(/Pets/i)).toBeInTheDocument()
    expect(screen.getByText(/Settings/i)).toBeInTheDocument()
  })

  it('renders Admin dropdown when user has ADMIN role', async () => {
    ;(usePermissions as jest.Mock).mockReturnValue({
      hasRole: (role: Role) => role === Role.ADMIN,
    })

    renderWithProviders(<Navbar />)

    // Trigger the dropdown
    const adminTrigger = screen.getByText('Admin')
    await act(async () => {
      await userEvent.click(adminTrigger)
    })

    // Check if the dropdown items are present
    expect(screen.getByText(/Logs/i)).toBeInTheDocument()
    expect(screen.getByText(/Rescues/i)).toBeInTheDocument()
  })
})
