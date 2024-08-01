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
	padding: 0.5rem 1rem;
	border: 1px solid ${(props) => props.theme.border.content};
	border-radius: 0.375rem;
	font-size: 1rem;
	line-height: 1.5;
	cursor: pointer;
	transition: background-color 0.3s ease, color 0.3s ease, box-shadow 0.2s ease;
	box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);

	${(props) => {
		switch (props.variant) {
			case 'content':
				return `
          background-color: ${props.theme.background.content};
          &:hover {
            background-color: ${props.theme.background.mouseHighlight};
          }
        `;
			case 'success':
				return `
          background-color: ${props.theme.background.success};
          color: ${props.theme.text.success};
          &:hover {
            background-color: ${props.theme.background.mouseHighlight};
          }
        `;
			case 'danger':
				return `
          background-color: ${props.theme.background.danger};
          color: ${props.theme.text.danger};
          &:hover {
            background-color: ${props.theme.background.mouseHighlight};
          }
        `;
			case 'warning':
				return `
          background-color: ${props.theme.background.warning};
          color: ${props.theme.text.warning};
          &:hover {
            background-color: ${props.theme.background.mouseHighlight};
          }
        `;
			case 'info':
				return `
          background-color: ${props.theme.background.info};
          color: ${props.theme.text.info};
          &:hover {
            background-color: ${props.theme.background.mouseHighlight};
          }
        `;
			default:
				return `
          background-color: ${props.theme.background.content};
          &:hover {
            background-color: ${props.theme.background.mouseHighlight};
          }
        `;
		}
	}}

	color: ${(props) => props.theme.text.body};

	&:hover {
		box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.15);
	}

	&:disabled {
		opacity: 0.65;
		cursor: not-allowed;
		box-shadow: none;
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
