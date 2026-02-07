import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const PickerTrigger = styled.button<{ $isOwn: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease;
  color: ${props => props.theme.text.secondary};

  &:hover {
    background: ${props => props.theme.background.secondary};
    opacity: 1;
  }
`;

const PickerWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const PickerPopover = styled.div<{ $position: 'above' | 'below' }>`
  position: absolute;
  ${props => (props.$position === 'above' ? 'bottom: 100%' : 'top: 100%')};
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.secondary};
  border-radius: 24px;
  padding: 0.25rem 0.375rem;
  display: flex;
  gap: 0.125rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: ${props => (props.$position === 'above' ? '0.25rem' : '0')};
  margin-top: ${props => (props.$position === 'below' ? '0.25rem' : '0')};
`;

const EmojiButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.125rem;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => props.theme.background.secondary};
    transform: scale(1.2);
  }

  &:active {
    transform: scale(0.9);
  }
`;

const QUICK_REACTIONS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F622}', '\u{1F44F}', '\u{1F525}'];

type ReactionPickerProps = {
  isOwn: boolean;
  onSelectReaction: (emoji: string) => void;
};

export function ReactionPicker({ isOwn, onSelectReaction }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('above');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleToggle = useCallback(() => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      setPosition(spaceAbove < 80 ? 'below' : 'above');
    }
    setIsOpen(prev => !prev);
  }, [isOpen]);

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelectReaction(emoji);
      setIsOpen(false);
    },
    [onSelectReaction]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <PickerWrapper ref={wrapperRef} className="reaction-picker-wrapper">
      <PickerTrigger
        ref={triggerRef}
        $isOwn={isOwn}
        onClick={handleToggle}
        aria-label="Add reaction"
        aria-expanded={isOpen}
        className="reaction-picker-trigger"
      >
        {'\u{1F600}'}
      </PickerTrigger>
      {isOpen && (
        <PickerPopover $position={position} role="listbox" aria-label="Choose a reaction">
          {QUICK_REACTIONS.map(emoji => (
            <EmojiButton
              key={emoji}
              onClick={() => handleSelect(emoji)}
              role="option"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </EmojiButton>
          ))}
        </PickerPopover>
      )}
    </PickerWrapper>
  );
}
