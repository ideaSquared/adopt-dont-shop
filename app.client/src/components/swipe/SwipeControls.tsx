import React from 'react';
import styled from 'styled-components';

interface SwipeControlsProps {
  onAction: (action: 'pass' | 'info' | 'like' | 'super_like') => void;
  disabled?: boolean;
  className?: string;
}

const ControlsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem;

  @media (max-width: 768px) {
    gap: 0.75rem;
    padding: 0.75rem;
  }
`;

const ActionButton = styled.button<{ $variant: 'pass' | 'info' | 'like' | 'super' }>`
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.5rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  &:not(:disabled):hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:not(:disabled):active {
    transform: scale(0.95);
  }

  ${props => {
    switch (props.$variant) {
      case 'pass':
        return `
          width: 50px;
          height: 50px;
          background: #ff6b6b;
          color: white;
          box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
          
          &:not(:disabled):hover {
            background: #ee5a5a;
            box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
          }
        `;
      case 'info':
        return `
          width: 45px;
          height: 45px;
          background: #ffd93d;
          color: white;
          box-shadow: 0 2px 8px rgba(255, 217, 61, 0.3);
          
          &:not(:disabled):hover {
            background: #ffcd02;
            box-shadow: 0 4px 12px rgba(255, 217, 61, 0.4);
          }
        `;
      case 'like':
        return `
          width: 60px;
          height: 60px;
          background: #4ecdc4;
          color: white;
          box-shadow: 0 2px 8px rgba(78, 205, 196, 0.3);
          
          &:not(:disabled):hover {
            background: #45b7b8;
            box-shadow: 0 4px 12px rgba(78, 205, 196, 0.4);
          }
        `;
      case 'super':
        return `
          width: 45px;
          height: 45px;
          background: #74b9ff;
          color: white;
          box-shadow: 0 2px 8px rgba(116, 185, 255, 0.3);
          
          &:not(:disabled):hover {
            background: #0984e3;
            box-shadow: 0 4px 12px rgba(116, 185, 255, 0.4);
          }
        `;
      default:
        return '';
    }
  }}
`;

const ButtonIcon = styled.span`
  font-size: inherit;
  line-height: 1;
`;

export const SwipeControls: React.FC<SwipeControlsProps> = ({
  onAction,
  disabled = false,
  className,
}) => {
  const handleAction = (action: 'pass' | 'info' | 'like' | 'super_like') => {
    if (!disabled) {
      onAction(action);
    }
  };

  return (
    <ControlsContainer className={className}>
      <ActionButton
        $variant='pass'
        onClick={() => handleAction('pass')}
        disabled={disabled}
        title='Pass - Not interested'
        type='button'
      >
        <ButtonIcon>❌</ButtonIcon>
      </ActionButton>

      <ActionButton
        $variant='info'
        onClick={() => handleAction('info')}
        disabled={disabled}
        title='Info - View details'
        type='button'
      >
        <ButtonIcon>ℹ️</ButtonIcon>
      </ActionButton>

      <ActionButton
        $variant='like'
        onClick={() => handleAction('like')}
        disabled={disabled}
        title='Like - Add to favorites'
        type='button'
      >
        <ButtonIcon>❤️</ButtonIcon>
      </ActionButton>

      <ActionButton
        $variant='super'
        onClick={() => handleAction('super_like')}
        disabled={disabled}
        title='Super Like - Priority interest'
        type='button'
      >
        <ButtonIcon>⭐</ButtonIcon>
      </ActionButton>
    </ControlsContainer>
  );
};
