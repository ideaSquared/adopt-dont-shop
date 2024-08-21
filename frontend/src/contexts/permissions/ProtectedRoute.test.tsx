import { screen } from '@testing-library/dom'
import { render } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Permission, Role } from '.'
import { UserProvider } from '../auth/UserContext'
import PermissionProvider from './PermissionContext'
import ProtectedRoute from './ProtectedRoute'

const TestComponent: React.FC = () => <div>Protected Content</div>

describe('ProtectedRoute', () => {
  it('should render the protected content if the user has the required permission', () => {
    render(
      <UserProvider>
        <PermissionProvider roles={[Role.RESCUE_MANAGER]}>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route
                element={
                  <ProtectedRoute
                    requiredPermission={Permission.VIEW_RESCUE_INFO}
                  />
                }
              >
                <Route path="/" element={<TestComponent />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </PermissionProvider>
      </UserProvider>,
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should navigate to login if the user does not have the required permission', () => {
    render(
      <UserProvider>
        <PermissionProvider roles={[Role.STAFF]}>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route
                element={
                  <ProtectedRoute
                    requiredPermission={Permission.VIEW_RESCUE_INFO}
                  />
                }
              >
                <Route path="/" element={<TestComponent />} />
              </Route>
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </PermissionProvider>
      </UserProvider>,
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })
})
