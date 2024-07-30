import React from 'react';
import styled from 'styled-components';

interface ButtonProps {
	type?: 'button' | 'submit' | 'reset';
	onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
	children: React.ReactNode;
	disabled?: boolean;
	variant?: 'content' | 'success' | 'danger' | 'warning' | 'info';
}

const StyledButton = styled.button<ButtonProps>`
	padding: 0.375rem 0.75rem;
	border: 1px solid transparent;
	border-radius: 0.25rem;
	font-size: 1rem;
	line-height: 1.5;
	cursor: pointer;

	${(props) => {
		switch (props.variant) {
			case 'content':
				return `background-color: ${props.theme.background.content}; color: ${props.theme.text.body};`;
			case 'success':
				return `background-color: ${props.theme.background.success}; color: white;`;
			case 'danger':
				return `background-color: ${props.theme.background.danger}; color: white;`;
			case 'warning':
				return `background-color: ${props.theme.background.warning}; color: black;`;
			case 'info':
				return `background-color: ${props.theme.background.info}; color: white;`;
			default:
				return `background-color: ${props.theme.background.content}; color: ${props.theme.text.body};`;
		}
	}}

	&:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}
`;

const Button: React.FC<ButtonProps> = ({
	type = 'button',
	onClick,
	children,
	disabled = false,
	variant = 'content',
}) => {
	return (
		<StyledButton
			type={type}
			onClick={onClick}
			disabled={disabled}
			variant={variant}
		>
			{children}
		</StyledButton>
	);
};

export default Button;
