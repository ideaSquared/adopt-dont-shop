import React from 'react'
import styled from 'styled-components'

interface CheckboxProps {
  checked: boolean
  // eslint-disable-next-line no-unused-vars
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
}

const StyledCheckbox = styled.input.attrs({ type: 'checkbox' })`
	width: auto; /* Use the browser's default size */
	height: auto;
	cursor: pointer;
	margin: 0;
	padding: 0;
	background-color ${(props) => props.theme.text.body}
`

const CheckboxInput: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <StyledCheckbox checked={checked} onChange={onChange} disabled={disabled} />
  )
}

export default CheckboxInput
