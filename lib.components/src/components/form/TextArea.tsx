import React, { forwardRef, useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';

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

const getSizeStyles = (size: TextAreaSize) => {
  const sizes = {
    sm: css`
      min-height: 80px;
      padding: 8px 12px;
      font-size: 14px;
    `,
    md: css`
      min-height: 100px;
      padding: 12px 16px;
      font-size: 16px;
    `,
    lg: css`
      min-height: 120px;
      padding: 16px 20px;
      font-size: 18px;
    `,
  };
  return sizes[size];
};

const getVariantStyles = (variant: TextAreaVariant, theme: any) => {
  const variants = {
    default: css`
      border: 1px solid ${theme.colors.neutral[300]};
      background-color: ${theme.colors.neutral.white};
      border-radius: ${theme.spacing.xs};

      &:focus {
        border-color: ${theme.colors.primary.main};
        box-shadow: 0 0 0 3px ${theme.colors.primary.light}40;
      }
    `,
    filled: css`
      border: 1px solid transparent;
      background-color: ${theme.colors.neutral[100]};
      border-radius: ${theme.spacing.xs};

      &:focus {
        background-color: ${theme.colors.neutral.white};
        border-color: ${theme.colors.primary.main};
        box-shadow: 0 0 0 3px ${theme.colors.primary.light}40;
      }
    `,
    underlined: css`
      border: none;
      border-bottom: 2px solid ${theme.colors.neutral[300]};
      background-color: transparent;
      border-radius: 0;
      padding-left: 0;
      padding-right: 0;

      &:focus {
        border-bottom-color: ${theme.colors.primary.main};
        box-shadow: none;
      }
    `,
  };
  return variants[variant];
};

const getStateStyles = (state: TextAreaState, theme: any) => {
  const states = {
    default: css``,
    error: css`
      border-color: ${theme.colors.semantic.error.main};
      &:focus {
        border-color: ${theme.colors.semantic.error.main};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.error.light}40;
      }
    `,
    success: css`
      border-color: ${theme.colors.semantic.success.main};
      &:focus {
        border-color: ${theme.colors.semantic.success.main};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.success.light}40;
      }
    `,
    warning: css`
      border-color: ${theme.colors.semantic.warning.main};
      &:focus {
        border-color: ${theme.colors.semantic.warning.main};
        box-shadow: 0 0 0 3px ${theme.colors.semantic.warning.light}40;
      }
    `,
  };
  return states[state];
};

const Container = styled.div<{ $fullWidth: boolean }>`
  display: ${({ $fullWidth }) => ($fullWidth ? 'block' : 'inline-block')};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const Label = styled.label<{ $required: boolean }>`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.neutral[700]};

  ${({ $required }) =>
    $required &&
    css`
      &::after {
        content: ' *';
        color: ${({ theme }) => theme.colors.semantic.error.main};
      }
    `}
`;

const TextAreaWrapper = styled.div`
  position: relative;
`;

const StyledTextArea = styled.textarea<{
  $size: TextAreaSize;
  $variant: TextAreaVariant;
  $state: TextAreaState;
  $autoResize: boolean;
}>`
  width: 100%;
  border: none;
  outline: none;
  transition: all ${({ theme }) => theme.transitions.fast};
  color: ${({ theme }) => theme.colors.neutral[900]};
  font-family: inherit;
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  resize: ${({ $autoResize }) => ($autoResize ? 'none' : 'vertical')};

  ${({ $size }) => getSizeStyles($size)}
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  ${({ $state, theme }) => getStateStyles($state, theme)}

  &::placeholder {
    color: ${({ theme }) => theme.colors.neutral[400]};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.neutral[400]};
    cursor: not-allowed;
    resize: none;
  }

  &:read-only {
    resize: none;
  }
`;

const FooterContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: ${({ theme }) => theme.spacing.xs};
  gap: ${({ theme }) => theme.spacing.sm};
`;

const HelperText = styled.div<{ $state: TextAreaState }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme, $state }) =>
    $state === 'error'
      ? theme.colors.semantic.error.main
      : $state === 'success'
        ? theme.colors.semantic.success.main
        : $state === 'warning'
          ? theme.colors.semantic.warning.main
          : theme.colors.neutral[600]};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
  flex: 1;
`;

const CharacterCount = styled.div<{ $isOverLimit: boolean }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme, $isOverLimit }) =>
    $isOverLimit ? theme.colors.semantic.error.main : theme.colors.neutral[500]};
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
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
    const adjustHeight = () => {
      const textArea = textAreaRef.current;
      if (!textArea || !autoResize) return;

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
    };

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
    }, [value, defaultValue, autoResize]);

    // Adjust height when value changes externally
    useEffect(() => {
      if (autoResize) {
        adjustHeight();
      }
    }, [value]);

    const isOverLimit = maxLength !== undefined && characterCount > maxLength;
    const showFooter = effectiveHelperText || showCharacterCount;

    return (
      <Container $fullWidth={fullWidth} className={className}>
        {label && (
          <Label htmlFor={inputId} $required={required}>
            {label}
          </Label>
        )}

        <TextAreaWrapper>
          <StyledTextArea
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
            $size={size}
            $variant={variant}
            $state={effectiveState}
            $autoResize={autoResize}
            data-testid={dataTestId}
            onChange={handleChange}
            {...props}
          />
        </TextAreaWrapper>

        {showFooter && (
          <FooterContainer>
            {effectiveHelperText && (
              <HelperText $state={effectiveState}>{effectiveHelperText}</HelperText>
            )}

            {showCharacterCount && (
              <CharacterCount $isOverLimit={isOverLimit}>
                {maxLength ? `${characterCount}/${maxLength}` : characterCount}
              </CharacterCount>
            )}
          </FooterContainer>
        )}
      </Container>
    );
  }
);

