import React from 'react';
import { MdClose, MdFavorite, MdPerson } from 'react-icons/md';
import { Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string;
}

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideUp = keyframes`
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: all 0.3s ease;
  animation: ${({ $isOpen }) => ($isOpen ? fadeIn : 'none')} 0.3s ease;
`;

const ModalContent = styled.div<{ $isOpen: boolean }>`
  background: white;
  border-radius: 20px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  position: relative;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
  animation: ${({ $isOpen }) => ($isOpen ? slideUp : 'none')} 0.3s ease;

  @media (max-width: 768px) {
    margin: 1rem;
    padding: 1.5rem;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #f5f5f5;
    color: #333;
  }
`;

const Icon = styled.div`
  font-size: 4rem;
  margin-bottom: 1.5rem;
  color: #4ecdc4;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 1rem;
`;

const Message = styled.p`
  font-size: 1rem;
  color: #666;
  line-height: 1.6;
  margin-bottom: 2rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PrimaryButton = styled(Link)`
  background: linear-gradient(45deg, #4ecdc4, #44a08d);
  color: white;
  padding: 1rem 2rem;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(78, 205, 196, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(78, 205, 196, 0.4);
  }
`;

const SecondaryButton = styled(Link)`
  background: transparent;
  color: #4ecdc4;
  padding: 1rem 2rem;
  border: 2px solid #4ecdc4;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: #4ecdc4;
    color: white;
    transform: translateY(-2px);
  }
`;

const SkipButton = styled.button`
  background: none;
  border: none;
  color: #999;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s ease;

  &:hover {
    color: #666;
  }
`;

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  isOpen,
  onClose,
  action = 'interact with pets',
}) => {
  const getActionMessage = () => {
    switch (action) {
      case 'like':
        return 'add pets to your favorites';
      case 'super_like':
        return 'super like pets';
      case 'pass':
        return 'continue discovering pets';
      case 'info':
        return 'view detailed pet information';
      default:
        return 'interact with pets';
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'like':
      case 'super_like':
        return <MdFavorite />;
      default:
        return <MdPerson />;
    }
  };

  return (
    <ModalOverlay $isOpen={isOpen} onClick={onClose}>
      <ModalContent $isOpen={isOpen} onClick={e => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <MdClose />
        </CloseButton>

        <Icon>{getActionIcon()}</Icon>

        <Title>Join Adopt Don&apos;t Shop</Title>

        <Message>
          To {getActionMessage()}, you&apos;ll need to create an account or sign in. It&apos;s free
          and helps us find you the perfect pet match!
        </Message>

        <ButtonGroup>
          <PrimaryButton to='/register' onClick={onClose}>
            <MdPerson />
            Create Account
          </PrimaryButton>

          <SecondaryButton to='/login' onClick={onClose}>
            Sign In
          </SecondaryButton>

          <SkipButton onClick={onClose}>Continue browsing</SkipButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};
