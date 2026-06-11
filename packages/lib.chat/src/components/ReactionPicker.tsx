import { useCallback, useEffect, useRef, useState } from 'react';
import * as styles from './ReactionPicker.css';

const QUICK_REACTIONS = [
  '\u{1F44D}',
  '\u{2764}\u{FE0F}',
  '\u{1F602}',
  '\u{1F622}',
  '\u{1F44F}',
  '\u{1F525}',
];

type ReactionPickerProps = {
  isOwn: boolean;
  onSelectReaction: (emoji: string) => void;
};

export function ReactionPicker({ isOwn: _isOwn, onSelectReaction }: ReactionPickerProps) {
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
    setIsOpen((prev) => !prev);
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
    <div ref={wrapperRef} className={styles.pickerWrapper} data-classname="reaction-picker-wrapper">
      <button
        ref={triggerRef}
        className={`${styles.pickerTrigger} reaction-picker-trigger`}
        onClick={handleToggle}
        aria-label="Add reaction"
        aria-expanded={isOpen}
      >
        {'\u{1F600}'}
      </button>
      {isOpen && (
        <div
          className={styles.pickerPopover[position]}
          role="listbox"
          aria-label="Choose a reaction"
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className={styles.emojiButton}
              onClick={() => handleSelect(emoji)}
              role="option"
              aria-selected={false}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
