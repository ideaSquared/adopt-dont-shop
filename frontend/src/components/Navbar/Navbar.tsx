import { DropdownMenu } from '@adoptdontshop/components'
import { Role, usePermissions } from '@adoptdontshop/permissions'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { useUser } from '../../contexts/auth/UserContext'
import { useFeatureFlag } from '../../contexts/feature-flags/FeatureFlagContext'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'

const StyledNavbar = styled.header`
  background-color: ${(props) => props.theme.background.content};
  color: ${(props) => props.theme.text.body};
  padding: 1rem;
  border-bottom: 1px solid ${(props) => props.theme.border.color.default};
  position: relative;

  @media (min-width: 768px) {
    padding: 1rem 2rem;
  }
`

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (min-width: 768px) {
    justify-content: center;
  }
`

const NavList = styled.ul<{ isOpen: boolean }>`
  display: ${({ isOpen }) => (isOpen ? 'flex' : 'none')};
  flex-direction: column;
  list-style-type: none;
  margin: 0;
  padding: 1rem 0;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: ${(props) => props.theme.background.content};
  border-bottom: 1px solid ${(props) => props.theme.border.color.default};
  z-index: 1000;

  @media (min-width: 768px) {
    display: flex;
    flex-direction: row;
    position: static;
    padding: 0;
    border: none;
    align-items: center;
    width: 100%;
    justify-content: center;
  }
`

const NavItem = styled.li`
  margin: 0.5rem 1rem;

  @media (min-width: 768px) {
    margin: 0 1rem;
  }
`

const NavbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: 1rem;

  @media (min-width: 768px) {
    margin-top: 0;
  }
`

const MenuButton = styled.button`
  display: flex;
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  color: ${(props) => props.theme.text.body};

  @media (min-width: 768px) {
    display: none;
  }
`

const HamburgerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
)

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, logout } = useUser()
  const { hasRole } = usePermissions()

  const canViewRescueDashboard = hasRole(Role.STAFF)
  const canViewAdminDashboard = hasRole(Role.ADMIN)
  const chatBetaEnabled = useFeatureFlag('chat_beta')

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <StyledNavbar>
      <Nav aria-label="Main navigation">
        <MenuButton
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="nav-menu"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <HamburgerIcon />
        </MenuButton>

        <NavList id="nav-menu" isOpen={isMenuOpen}>
          <NavItem>
            <Link to="/" onClick={closeMenu}>
              Home
            </Link>
          </NavItem>

          <NavItem>
            <DropdownMenu
              triggerLabel={user && user.first_name ? user.first_name : 'User'}
              items={
                user
                  ? [
                      { label: 'Profile', to: '/settings' },
                      { label: 'Chat', to: '/chat' },
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
                    { label: 'Chat', to: '/chat' },
                  ]}
                />
              </NavItem>
            ))}

          {canViewRescueDashboard && (
            <NavItem>
              <DropdownMenu
                triggerLabel="Staff"
                items={[
                  { label: 'Dashboard', to: '/dashboard' },
                  { label: 'Applications', to: '/applications' },
                  { label: 'Pets', to: '/pets' },
                  { label: 'Staff', to: '/staff' },
                  { label: 'Settings', to: '/rescue' },
                  { label: 'Chat', to: '/chat' },
                ]}
              />
            </NavItem>
          )}

          {canViewAdminDashboard && (
            <NavItem>
              <DropdownMenu
                triggerLabel="Admin"
                items={[
                  { label: 'Dashboard', to: '/admin/dashboard' },
                  { label: 'Users', to: '/users' },
                  ...(chatBetaEnabled
                    ? [{ label: 'Conversations', to: '/conversations' }]
                    : []),
                  { label: 'Logs', to: '/logs' },
                  { label: 'Rescues', to: '/rescues' },
                  { label: 'Pets (Admin)', to: '/admin/pets' },
                  { label: 'Feature flags', to: '/feature-flags' },
                  { label: 'Ratings', to: '/ratings' },
                  { label: 'Applications (Admin)', to: '/admin/applications' },
                  { label: 'Chat (Admin)', to: '/admin/chat' },
                ]}
              />
            </NavItem>
          )}

          <NavbarRight>
            <ThemeToggle />
          </NavbarRight>
        </NavList>
      </Nav>
    </StyledNavbar>
  )
}

export default Navbar
