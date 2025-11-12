import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';
import {
  FiHome,
  FiUsers,
  FiShield,
  FiMessageSquare,
  FiBarChart2,
  FiSettings,
  FiFileText,
  FiAlertTriangle,
  FiHelpCircle,
  FiChevronLeft,
  FiChevronRight,
  FiActivity,
} from 'react-icons/fi';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const SidebarContainer = styled.aside<{ $collapsed: boolean }>`
  width: ${props => (props.$collapsed ? '80px' : '280px')};
  height: 100vh;
  background: #1f2937;
  color: #f9fafb;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  border-right: 1px solid #374151;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 3px;
  }
`;

const SidebarHeader = styled.div<{ $collapsed: boolean }>`
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: ${props => (props.$collapsed ? 'center' : 'space-between')};
  border-bottom: 1px solid #374151;
  min-height: 80px;
`;

const Logo = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  font-size: ${props => (props.$collapsed ? '1.5rem' : '1.25rem')};
  color: ${props => props.theme.colors.primary[400]};
`;

const ToggleButton = styled.button`
  background: transparent;
  border: 1px solid #4b5563;
  color: #f9fafb;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #374151;
    border-color: ${props => props.theme.colors.primary[500]};
  }
`;

const Nav = styled.nav`
  flex: 1;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const NavSection = styled.div<{ $collapsed: boolean }>`
  margin: ${props => (props.$collapsed ? '1rem 0' : '1rem 0 0.5rem 0')};
  padding: ${props => (props.$collapsed ? '0' : '0 1rem')};
`;

const NavSectionTitle = styled.div<{ $collapsed: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
  margin-bottom: 0.5rem;
  display: ${props => (props.$collapsed ? 'none' : 'block')};
  padding-left: 0.5rem;
`;

const NavDivider = styled.div<{ $collapsed: boolean }>`
  height: 1px;
  background: #374151;
  margin: ${props => (props.$collapsed ? '1rem 0.75rem' : '1rem 1rem')};
`;

const StyledNavLink = styled(NavLink)<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: ${props => (props.$collapsed ? '0.75rem' : '0.75rem 1rem')};
  margin: ${props => (props.$collapsed ? '0 0.5rem' : '0 0.5rem')};
  color: #d1d5db;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
  justify-content: ${props => (props.$collapsed ? 'center' : 'flex-start')};
  position: relative;

  &:hover {
    background: #374151;
    color: #ffffff;
  }

  &.active {
    background: ${props => props.theme.colors.primary[600]};
    color: #ffffff;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 70%;
      background: ${props => props.theme.colors.primary[300]};
      border-radius: 0 2px 2px 0;
    }
  }

  svg {
    font-size: 1.25rem;
    min-width: 1.25rem;
  }

  span {
    display: ${props => (props.$collapsed ? 'none' : 'block')};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const SidebarFooter = styled.div<{ $collapsed: boolean }>`
  padding: 1rem;
  border-top: 1px solid #374151;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: ${props => (props.$collapsed ? 'center' : 'stretch')};
`;

const FooterText = styled.div<{ $collapsed: boolean }>`
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: ${props => (props.$collapsed ? 'center' : 'left')};
  display: ${props => (props.$collapsed ? 'none' : 'block')};
`;

export const AdminSidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <SidebarContainer $collapsed={collapsed}>
      <SidebarHeader $collapsed={collapsed}>
        <Logo $collapsed={collapsed}>
          <span>🐾</span>
          {!collapsed && <span>Admin</span>}
        </Logo>
        {!collapsed && (
          <ToggleButton onClick={onToggle} aria-label='Toggle sidebar'>
            <FiChevronLeft size={16} />
          </ToggleButton>
        )}
      </SidebarHeader>

      {collapsed && (
        <div style={{ padding: '1rem 0', display: 'flex', justifyContent: 'center' }}>
          <ToggleButton onClick={onToggle} aria-label='Expand sidebar'>
            <FiChevronRight size={16} />
          </ToggleButton>
        </div>
      )}

      <Nav>
        {/* Main Section */}
        <NavSection $collapsed={collapsed}>
          <NavSectionTitle $collapsed={collapsed}>Main</NavSectionTitle>
          <StyledNavLink to='/' $collapsed={collapsed} end>
            <FiHome />
            <span>Dashboard</span>
          </StyledNavLink>
          <StyledNavLink to='/analytics' $collapsed={collapsed}>
            <FiBarChart2 />
            <span>Analytics</span>
          </StyledNavLink>
        </NavSection>

        <NavDivider $collapsed={collapsed} />

        {/* Management Section */}
        <NavSection $collapsed={collapsed}>
          <NavSectionTitle $collapsed={collapsed}>Management</NavSectionTitle>
          <StyledNavLink to='/users' $collapsed={collapsed}>
            <FiUsers />
            <span>Users</span>
          </StyledNavLink>
          <StyledNavLink to='/rescues' $collapsed={collapsed}>
            <FiShield />
            <span>Rescues</span>
          </StyledNavLink>
        </NavSection>

        <NavDivider $collapsed={collapsed} />

        {/* Safety & Support Section */}
        <NavSection $collapsed={collapsed}>
          <NavSectionTitle $collapsed={collapsed}>Safety & Support</NavSectionTitle>
          <StyledNavLink to='/moderation' $collapsed={collapsed}>
            <FiAlertTriangle />
            <span>Moderation</span>
          </StyledNavLink>
          <StyledNavLink to='/support' $collapsed={collapsed}>
            <FiHelpCircle />
            <span>Support Tickets</span>
          </StyledNavLink>
          <StyledNavLink to='/messages' $collapsed={collapsed}>
            <FiMessageSquare />
            <span>Messages</span>
          </StyledNavLink>
        </NavSection>

        <NavDivider $collapsed={collapsed} />

        {/* System Section */}
        <NavSection $collapsed={collapsed}>
          <NavSectionTitle $collapsed={collapsed}>System</NavSectionTitle>
          <StyledNavLink to='/configuration' $collapsed={collapsed}>
            <FiSettings />
            <span>Configuration</span>
          </StyledNavLink>
          <StyledNavLink to='/audit' $collapsed={collapsed}>
            <FiActivity />
            <span>Audit Logs</span>
          </StyledNavLink>
          <StyledNavLink to='/reports' $collapsed={collapsed}>
            <FiFileText />
            <span>Reports</span>
          </StyledNavLink>
        </NavSection>
      </Nav>

      <SidebarFooter $collapsed={collapsed}>
        <FooterText $collapsed={collapsed}>Admin Panel v1.0.0</FooterText>
        <FooterText $collapsed={collapsed}>Adopt Don't Shop</FooterText>
      </SidebarFooter>
    </SidebarContainer>
  );
};
