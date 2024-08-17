import { DropdownMenu } from '@adoptdontshop/components'
import { Role, usePermissions } from '@adoptdontshop/permissions'
import React from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

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
  const { hasRole } = usePermissions()

  const canViewRescueDashboard = hasRole(Role.STAFF)
  const canViewAdminDashboard = hasRole(Role.ADMIN)

  return (
    <StyledNavbar>
      <Nav>
        <NavList>
          <NavItem>
            <Link to="/">Home</Link>
          </NavItem>

          <NavItem>
            <DropdownMenu
              triggerLabel="Account"
              items={[
                { label: 'Login', to: '/login' },
                { label: 'Create Account', to: '/create-account' },
                { label: 'Forgot Password', to: '/forgot-password' },
                { label: 'Reset Password', to: '/reset-password' },
                { label: 'Settings', to: '/settings' },
              ]}
            />
          </NavItem>

          <NavItem>
            <DropdownMenu
              triggerLabel="Swipe"
              items={[
                { label: 'Swipe', to: '/swipe' },
                { label: 'Chat', to: '/chat' },
              ]}
            />
          </NavItem>

          {canViewRescueDashboard && (
            <NavItem>
              <DropdownMenu
                triggerLabel="Rescue"
                items={[
                  { label: 'Applications', to: '/applications' },
                  { label: 'Ratings', to: '/ratings' },
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
                  { label: 'Conversations', to: '/conversations' },
                  { label: 'Logs', to: '/logs' },
                  { label: 'Rescues', to: '/rescues' },
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
