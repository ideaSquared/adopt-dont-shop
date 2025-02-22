import React from 'react'
import styled from 'styled-components'

interface BaseSidebarProps {
  show: boolean
  handleClose: () => void
  title: string
  size?: string
  children: React.ReactNode
}

const SidebarContainer = styled.div<{ $show: boolean; $size: string }>`
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: ${(props) => props.$size};
  background-color: ${(props) => props.theme.background.content};
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  transform: ${(props) => (props.$show ? 'translateX(0)' : 'translateX(100%)')};
  transition: transform 0.3s ease-in-out;
  z-index: 1000;
  display: flex;
  flex-direction: column;
`

const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid ${(props) => props.theme.border.color.default};
`

const SidebarTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${(props) => props.theme.text.body};
  cursor: pointer;

  &:hover {
    color: ${(props) => props.theme.text.body};
  }
`

const SidebarContent = styled.div`
  padding: 16px;
  overflow-y: auto;
  flex-grow: 1;
`

const BaseSidebar: React.FC<BaseSidebarProps> = ({
  show,
  handleClose,
  title,
  size = '33%',
  children,
}) => {
  return (
    <SidebarContainer $show={show} $size={size}>
      <SidebarHeader>
        <SidebarTitle>{title}</SidebarTitle>
        <CloseButton onClick={handleClose}>&times;</CloseButton>
      </SidebarHeader>
      <SidebarContent>{children}</SidebarContent>
    </SidebarContainer>
  )
}

export default BaseSidebar
