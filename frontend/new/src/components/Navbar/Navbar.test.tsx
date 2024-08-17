import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { BrowserRouter as Router } from 'react-router-dom'
import { theme } from '@adoptdontshop/styles'
import Navbar from './Navbar'
import { usePermissions, Role } from '@adoptdontshop/permissions'

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
    <ThemeProvider theme={theme}>
      <Router>{ui}</Router>
    </ThemeProvider>,
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
    expect(screen.getByText('Account')).toBeInTheDocument()

    // Rescue and Admin dropdowns should not be present
    expect(screen.queryByText('Rescue')).not.toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  // TODO: Fix
  it.skip('renders Rescue dropdown when user has STAFF role', () => {
    ;(usePermissions as jest.Mock).mockReturnValue({
      hasRole: (role: Role) => role === Role.STAFF,
    })

    renderWithProviders(<Navbar />)

    // Verify Rescue dropdown is present
    expect(screen.getByText('Rescue')).toBeInTheDocument()
    expect(screen.getByText('Applications')).toBeInTheDocument()
    expect(screen.getByText('Ratings')).toBeInTheDocument()
    expect(screen.getByText('Pets')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  // TODO: Fix
  it.skip('renders Admin dropdown when user has ADMIN role', () => {
    ;(usePermissions as jest.Mock).mockReturnValue({
      hasRole: (role: Role) => role === Role.ADMIN,
    })

    renderWithProviders(<Navbar />)

    // Verify Admin dropdown is present
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Conversations')).toBeInTheDocument()
    expect(screen.getByText('Logs')).toBeInTheDocument()
    expect(screen.getByText('Rescues')).toBeInTheDocument()
  })

  it('renders both Rescue and Admin dropdowns when user has both roles', () => {
    ;(usePermissions as jest.Mock).mockReturnValue({
      hasRole: (role: Role) => role === Role.STAFF || role === Role.ADMIN,
    })

    renderWithProviders(<Navbar />)

    // Verify Rescue and Admin dropdowns are present
    expect(screen.getByText('Rescue')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })
})
