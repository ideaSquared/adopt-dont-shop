import React from 'react'
import { render, screen } from '@testing-library/react'
import PermissionProvider, { usePermissions } from './PermissionContext'
import { Role, Permission } from '.'

const TestComponent: React.FC = () => {
  const { hasPermission, hasRole } = usePermissions()

  return (
    <div>
      <div>
        Has VIEW_RESCUE_INFO Permission:{' '}
        {hasPermission(Permission.VIEW_RESCUE_INFO).toString()}
      </div>
      <div>
        Has RESCUE_MANAGER Role: {hasRole(Role.RESCUE_MANAGER).toString()}
      </div>
    </div>
  )
}

describe('PermissionProvider and usePermissions', () => {
  it('should return true for permissions the role has', () => {
    render(
      <PermissionProvider roles={[Role.RESCUE_MANAGER]}>
        <TestComponent />
      </PermissionProvider>,
    )

    expect(
      screen.getByText('Has VIEW_RESCUE_INFO Permission: true'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Has RESCUE_MANAGER Role: true'),
    ).toBeInTheDocument()
  })

  it('should return false for permissions the role does not have', () => {
    render(
      <PermissionProvider roles={[Role.STAFF]}>
        <TestComponent />
      </PermissionProvider>,
    )

    expect(
      screen.getByText('Has VIEW_RESCUE_INFO Permission: false'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Has RESCUE_MANAGER Role: false'),
    ).toBeInTheDocument()
  })

  it('should throw an error if usePermissions is used outside of PermissionProvider', () => {
    // Jest's method to catch errors
    jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<TestComponent />)).toThrow(
      'usePermissions must be used within a PermissionProvider',
    )

    jest.restoreAllMocks()
  })
})
