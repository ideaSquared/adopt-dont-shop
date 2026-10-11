import { useEffect, useRef, type KeyboardEvent } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focus handling for a hand-rolled modal dialog (the shared Modal in
 * lib.components does the same): move focus into the dialog when it opens,
 * keep Tab inside it, and give focus back to whatever had it on close.
 */
export const useDialogFocus = <T extends HTMLElement>(isOpen: boolean) => {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      if (previouslyFocused && document.body.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  const onKeyDown = (event: KeyboardEvent<T>) => {
    if (event.key !== 'Tab' || !ref.current) {
      return;
    }
    const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  };

  return { ref, onKeyDown };
};
