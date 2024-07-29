import React from 'react';

interface ButtonProps {
	type?: 'button' | 'submit' | 'reset';
	onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
	children: React.ReactNode;
	disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
	type = 'button',
	onClick,
	children,
	disabled = false,
}) => {
	return (
		<button type={type} onClick={onClick} disabled={disabled}>
			{children}
		</button>
	);
};

export default Button;
