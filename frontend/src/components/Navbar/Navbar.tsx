import { DropdownMenu } from '@adoptdontshop/components'
import { Role, usePermissions } from '@adoptdontshop/permissions'
import React from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { useUser } from '../../contexts/auth/UserContext'
import { useFeatureFlag } from '../../contexts/feature-flags/FeatureFlagContext'

const StyledNavbar = styled.header`
  background-color: ${(props) => props.theme.background.content};
  color: ${(props) => props.theme.text.body};
  padding: 1rem 2rem;
  border-bottom: 1px solid ${(props) => props.theme.border.content};
`

const Nav = styled.nav`
  display: flex;
  justify-content: center;
  align-items: center;
`

const NavList = styled.ul`
  display: flex;
  list-style-type: none;
  margin: 0;
  padding: 0;
`

const NavItem = styled.li`
  margin: 0 1rem;
`

const Navbar: React.FC = () => {
  const { user, logout } = useUser()
  const { hasRole } = usePermissions()

  const canViewRescueDashboard = hasRole(Role.STAFF)
  const canViewAdminDashboard = hasRole(Role.ADMIN)

  const chatBetaEnabled = useFeatureFlag('chat_beta')

  return (
    <StyledNavbar>
      <Nav>
        <NavList>
          <NavItem>
            <Link to="/">Home</Link>
          </NavItem>

          <NavItem>
            <DropdownMenu
              triggerLabel={user && user.first_name ? user.first_name : 'User'}
              items={
                user
                  ? [
                      { label: 'Profile', to: '/settings' },
                      { label: 'Logout', onClick: logout },
                    ]
                  : [
                      { label: 'Login', to: '/login' },
                      { label: 'Create Account', to: '/create-account' },
                      { label: 'Forgot Password', to: '/forgot-password' },
                      { label: 'Reset Password', to: '/reset-password' },
                    ]
              }
            />
          </NavItem>

          {hasRole(Role.USER) ||
            (hasRole(Role.VERIFIED_USER) && (
              <NavItem>
                <DropdownMenu
                  triggerLabel="Verified User"
                  items={[
                    { label: 'Swipe', to: '/swipe' },
                    ...(chatBetaEnabled
                      ? [{ label: 'Chat', to: '/chat' }]
                      : []),
                  ]}
                />
              </NavItem>
            ))}

          {canViewRescueDashboard && (
            <NavItem>
              <DropdownMenu
                triggerLabel="Staff"
                items={[
                  { label: 'Applications', to: '/applications' },
                  { label: 'Pets', to: '/pets' },
                  { label: 'Staff', to: '/staff' },
                  { label: 'Settings', to: '/rescue' },
                ]}
              />
            </NavItem>
          )}

          {canViewAdminDashboard && (
            <NavItem>
              <DropdownMenu
                triggerLabel="Admin"
                items={[
                  { label: 'Users', to: '/users' },
                  ...(chatBetaEnabled
                    ? [{ label: 'Conversations', to: '/conversations' }]
                    : []),
                  { label: 'Logs', to: '/logs' },
                  { label: 'Rescues', to: '/rescues' },
                  { label: 'Feature flags', to: '/feature-flags' },
                  { label: 'Ratings', to: '/ratings' },
                ]}
              />
            </NavItem>
          )}
        </NavList>
      </Nav>
    </StyledNavbar>
  )
}

export default Navbar
