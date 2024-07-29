import React from 'react';

interface TextInputProps {
	label: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	type?: string;
	required?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
	label,
	value,
	onChange,
	type = 'text',
	required = false,
}) => {
	return (
		<div>
			<label>{label}:</label>
			<input
				type={type}
				value={value}
				onChange={onChange}
				required={required}
			/>
		</div>
	);
};

export default TextInput;
