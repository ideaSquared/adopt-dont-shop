import styled, { keyframes } from 'styled-components';

const bounce = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
`;

const TypingContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin: 0.5rem 1rem;
  background: ${props => props.theme.background.secondary};
  border-radius: 18px 18px 18px 4px;
  max-width: 200px;
  color: ${props => props.theme.text.secondary};
  font-size: 0.875rem;
`;

const TypingDots = styled.div`
  display: flex;
  gap: 2px;
`;

const Dot = styled.div<{ delay: number }>`
  width: 4px;
  height: 4px;
  background: ${props => props.theme.text.secondary};
  border-radius: 50%;
  animation: ${bounce} 1.4s infinite;
  animation-delay: ${props => props.delay}s;
`;

interface TypingIndicatorProps {
  userName: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <TypingContainer>
      <span>{userName} is typing</span>
      <TypingDots>
        <Dot delay={0} />
        <Dot delay={0.1} />
        <Dot delay={0.2} />
      </TypingDots>
    </TypingContainer>
  );
}
