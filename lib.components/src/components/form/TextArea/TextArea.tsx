import React, { forwardRef, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import * as styles from './TextArea.css';

export type TextAreaSize = 'sm' | 'md' | 'lg';
export type TextAreaVariant = 'default' | 'filled' | 'underlined';
export type TextAreaState = 'default' | 'error' | 'success' | 'warning';

export type TextAreaProps = {
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  size?: TextAreaSize;
  variant?: TextAreaVariant;
  state?: TextAreaState;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  error?: string;
  helperText?: string;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  autoResize?: boolean;
  showCharacterCount?: boolean;
  maxLength?: number;
  fullWidth?: boolean;
  className?: string;
  'data-testid'?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>;

const TextAreaComponent = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      placeholder,
      size = 'md',
      variant = 'default',
      state = 'default',
      disabled = false,
      required = false,
      readOnly = false,
      error,
      helperText,
      rows = 4,
      minRows = 2,
      maxRows = 10,
      autoResize = false,
      showCharacterCount = false,
      maxLength,
      fullWidth = false,
      className,
      'data-testid': dataTestId,
      id,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [characterCount, setCharacterCount] = useState(0);

    // Combine refs
    const combinedRef = (node: HTMLTextAreaElement) => {
      if (textAreaRef.current !== node) {
        (textAreaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const inputId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;
    const effectiveState = error ? 'error' : state;
    const effectiveHelperText = error || helperText;

    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      const textArea = textAreaRef.current;
      if (!textArea || !autoResize) {
        return;
      }

      // Reset height to calculate scrollHeight
      textArea.style.height = 'auto';

      const scrollHeight = textArea.scrollHeight;
      const lineHeight = parseInt(getComputedStyle(textArea).lineHeight);
      const paddingTop = parseInt(getComputedStyle(textArea).paddingTop);
      const paddingBottom = parseInt(getComputedStyle(textArea).paddingBottom);

      const minHeight = minRows * lineHeight + paddingTop + paddingBottom;
      const maxHeight = maxRows * lineHeight + paddingTop + paddingBottom;

      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textArea.style.height = `${newHeight}px`;
    }, [autoResize, minRows, maxRows]);

    // Handle value changes
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setCharacterCount(newValue.length);

      if (autoResize) {
        adjustHeight();
      }

      if (onChange) {
        onChange(e);
      }
    };

    // Initialize character count and height
    useEffect(() => {
      const textArea = textAreaRef.current;
      if (textArea) {
        const initialValue = value || defaultValue || textArea.value || '';
        setCharacterCount(initialValue.length);

        if (autoResize) {
          adjustHeight();
        }
      }
    }, [value, defaultValue, autoResize, adjustHeight]);

    // Adjust height when value changes externally
    useEffect(() => {
      if (autoResize) {
        adjustHeight();
      }
    }, [value, autoResize, adjustHeight]);

    const isOverLimit = maxLength !== undefined && characterCount > maxLength;
    const showFooter = effectiveHelperText || showCharacterCount;

    return (
      <div className={clsx(styles.container({ fullWidth }), className)}>
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(styles.label, required && styles.labelRequired)}
          >
            {label}
          </label>
        )}

        <div className={styles.textAreaWrapper}>
          <textarea
            ref={combinedRef}
            id={inputId}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            readOnly={readOnly}
            rows={autoResize ? minRows : rows}
            maxLength={maxLength}
            value={value}
            defaultValue={defaultValue}
            data-testid={dataTestId}
            onChange={handleChange}
            className={styles.textArea({
              size,
              variant,
              state: effectiveState,
              autoResize,
            })}
            {...props}
          />
        </div>

        {showFooter && (
          <div className={styles.footerContainer}>
            {effectiveHelperText && (
              <div className={styles.helperText({ state: effectiveState })}>
                {effectiveHelperText}
              </div>
            )}

            {showCharacterCount && (
              <div className={styles.characterCount({ isOverLimit })}>
                {maxLength ? `${characterCount}/${maxLength}` : characterCount}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

TextAreaComponent.displayName = 'TextArea';

export const TextArea = TextAreaComponent;
