import React from 'react'
import styled from 'styled-components'
import { Button } from '../'

interface ModalProps {
  title: string
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  size?: 'small' | 'medium' | 'large'
}

const StyledModal = styled.div<{ isOpen: boolean }>`
  display: ${(props) => (props.isOpen ? 'block' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1050;
  overflow-y: auto;
`

const StyledModalDialog = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  position: relative;
  width: ${(props) =>
    props.size === 'small'
      ? '300px'
      : props.size === 'medium'
        ? '600px'
        : '900px'};
  margin: 1.75rem auto;
  pointer-events: none;
  display: flex;
  align-items: center;
  min-height: 100vh;
`

const StyledModalContent = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  pointer-events: auto;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.3rem;
  outline: 0;
  max-height: 90vh;
  overflow-y: auto;
`

const StyledModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  border-top-left-radius: 0.3rem;
  border-top-right-radius: 0.3rem;
`

const StyledModalBody = styled.div`
  position: relative;
  flex: 1 1 auto;
  padding: 1rem;
`

const StyledModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0.75rem;
  border-top: 1px solid #e9ecef;
  border-bottom-right-radius: 0.3rem;
  border-bottom-left-radius: 0.3rem;
`

const Modal: React.FC<ModalProps> = ({
  title,
  children,
  isOpen,
  onClose,
  size = 'small',
}) => {
  if (!isOpen) return null

  return (
    <StyledModal isOpen={isOpen}>
      <StyledModalDialog role="dialog" size={size}>
        <StyledModalContent>
          <StyledModalHeader>
            <h2>{title}</h2>
            <Button
              type="button"
              aria-label="Close"
              data-testid="modal-close-button"
              onClick={onClose}
            >
              &times;
            </Button>
          </StyledModalHeader>
          <StyledModalBody>{children}</StyledModalBody>
          <StyledModalFooter>
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </StyledModalFooter>
        </StyledModalContent>
      </StyledModalDialog>
    </StyledModal>
  )
}

export default Modal
