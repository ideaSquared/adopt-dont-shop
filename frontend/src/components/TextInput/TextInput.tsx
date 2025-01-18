import React from 'react'
import styled, { css } from 'styled-components'

type AddonVariant = 'content' | 'success' | 'error' | 'warning' | 'info'

type Addon = {
  content: React.ReactNode
  variant?: AddonVariant
}

type TextInputProps = {
  value: string | number | null
  type: string
  name?: string
  id?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  endAddons?: Addon[]
}

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  width: 100%;
`

const StyledInput = styled.input<{ hasEndAddons?: boolean }>`
  padding: 0.375rem 0.75rem;
  border: 1px solid ${(props) => props.theme.border.color.default};
  border-radius: ${(props) => props.theme.border.radius.md};
  height: 2.375rem;
  font-size: 1rem;
  line-height: 1.5;
  width: 100%;
  background-color: ${(props) => props.theme.background.content};
  color: ${(props) => props.theme.text.body};
  box-sizing: border-box;

  ${(props) =>
    props.hasEndAddons &&
    `
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  `}

  &:disabled {
    background-color: ${(props) => props.theme.background.disabled};
    border-color: ${(props) => props.theme.border.color.disabled};
    opacity: 0.65;
    cursor: not-allowed;
  }
`

const getVariantStyles = (variant: AddonVariant) => {
  const variantMap = {
    content: css`
      background-color: ${(props) => props.theme.background.content};
      color: ${(props) => props.theme.text.body};
    `,

    success: css`
      background-color: ${(props) => props.theme.background.success};
      color: ${(props) => props.theme.text.success};
    `,

    error: css`
      background-color: ${(props) => props.theme.background.danger};
      color: ${(props) => props.theme.text.danger};
    `,

    warning: css`
      background-color: ${(props) => props.theme.background.warning};
      color: ${(props) => props.theme.text.warning};
    `,

    info: css`
      background-color: ${(props) => props.theme.background.info};
      color: ${(props) => props.theme.text.info};
    `,
  }

  return variantMap[variant]
}

const EndAddonWrapper = styled.div<{ variant: AddonVariant; isLast: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border: 1px solid;
  border-left: none;

  ${(props) =>
    !props.isLast &&
    `border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  `}

  ${(props) =>
    props.isLast &&
    `
    border-top-right-radius: ${props.theme.border.radius.md};
    border-bottom-right-radius: ${props.theme.border.radius.md};
   `}
  border-color: ${(props) => props.theme.border.color.default};
  ${(props) => getVariantStyles(props.variant)}
`

const TextInput: React.FC<TextInputProps> = ({
  value,
  name,
  type,
  id,
  onChange,
  placeholder = '',
  disabled = false,
  required = false,
  endAddons = [],
}) => {
  return (
    <InputWrapper>
      <StyledInput
        type={type}
        name={name}
        id={id}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        hasEndAddons={endAddons.length > 0}
      />

      {endAddons.map((addon, index) => (
        <EndAddonWrapper
          key={index}
          variant={addon.variant || 'content'}
          isLast={index === endAddons.length - 1}
        >
          {addon.content}
        </EndAddonWrapper>
      ))}
    </InputWrapper>
  )
}

export default TextInput
