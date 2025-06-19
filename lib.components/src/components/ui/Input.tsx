import React from 'react';
import styled from 'styled-components';
import { InputProps } from '../../types';

interface StyledInputWrapperProps {
  $hasError: boolean;
  $size: 'sm' | 'md' | 'lg';
  $isFullWidth: boolean;
}

const InputWrapper = styled.div<{ $isFullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  width: ${props => (props.$isFullWidth ? '100%' : 'auto')};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const InputLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.text.body};
`;

const RequiredIndicator = styled.span`
  color: ${({ theme }) => theme.text.danger};
  margin-left: ${({ theme }) => theme.spacing.xs};
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  width: 100%;
`;

const StyledInput = styled.input<StyledInputWrapperProps>`
  width: 100%;
  background-color: ${({ theme }) => theme.background.content};
  color: ${({ theme }) => theme.text.body};
  border: ${({ theme }) => theme.border.width.thin} solid
    ${({ theme, $hasError }) =>
      $hasError ? theme.border.color.danger : theme.border.color.default};
  border-radius: ${({ theme }) => theme.border.radius.md};
  outline: none;
  transition: all ${({ theme }) => theme.transitions.fast};
  font-family: ${({ theme }) => theme.typography.family.body};

  &:focus {
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.border.color.danger : theme.border.color.focus};
    box-shadow: 0 0 0 2px
      ${({ theme, $hasError }) =>
        $hasError ? `${theme.background.danger}40` : `${theme.background.primary}40`};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.background.disabled};
    cursor: not-allowed;
    opacity: 0.6;
  }

  &::placeholder {
    color: ${({ theme }) => theme.text.dim};
  }

  /* Apply size styles */
  ${({ $size, theme }) => {
    switch ($size) {
      case 'sm':
        return `
          padding: ${theme.spacing.xs} ${theme.spacing.sm};
          font-size: ${theme.typography.size.sm};
        `;
      case 'lg':
        return `
          padding: ${theme.spacing.sm} ${theme.spacing.md};
          font-size: ${theme.typography.size.lg};
        `;
      default:
        return `
          padding: ${theme.spacing.sm} ${theme.spacing.md};
          font-size: ${theme.typography.size.base};
        `;
    }
  }}

  /* Make room for icons if present */
  ${({ theme }) => `
    &.has-start-icon {
      padding-left: ${theme.spacing.xl};
    }
    
    &.has-end-icon {
      padding-right: ${theme.spacing.xl};
    }
  `}
`;

const IconWrapper = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: ${({ theme }) => theme.text.dim};
`;

const StartIconWrapper = styled(IconWrapper)`
  left: ${({ theme }) => theme.spacing.sm};
`;

const EndIconWrapper = styled(IconWrapper)`
  right: ${({ theme }) => theme.spacing.sm};
`;

const HelperText = styled.p<{ $hasError: boolean }>`
  font-size: ${({ theme }) => theme.typography.size.xs};
  margin-top: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme, $hasError }) => ($hasError ? theme.text.danger : theme.text.dim)};
`;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      helperText,
      id,
      required = false,
      isFullWidth = true,
      size = 'md',
      startIcon,
      endIcon,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;
    const hasError = !!error;
    const helpText = error || helperText;
    const helperId = helpText ? `${inputId}-helper` : undefined;

    const startIconClass = startIcon ? 'has-start-icon' : '';
    const endIconClass = endIcon ? 'has-end-icon' : '';

    return (
      <InputWrapper $isFullWidth={isFullWidth}>
        {label && (
          <InputLabel htmlFor={inputId}>
            {label}
            {required && <RequiredIndicator>*</RequiredIndicator>}
          </InputLabel>
        )}

        <InputContainer>
          {startIcon && <StartIconWrapper>{startIcon}</StartIconWrapper>}

          <StyledInput
            id={inputId}
            ref={ref}
            $hasError={hasError}
            $size={size}
            $isFullWidth={isFullWidth}
            className={`${className} ${startIconClass} ${endIconClass}`.trim()}
            aria-invalid={hasError}
            aria-describedby={helperId}
            required={required}
            {...props}
          />

          {endIcon && <EndIconWrapper>{endIcon}</EndIconWrapper>}
        </InputContainer>

        {helpText && (
          <HelperText id={helperId} $hasError={hasError}>
            {helpText}
          </HelperText>
        )}
      </InputWrapper>
    );
  }
);

Input.displayName = 'Input';
