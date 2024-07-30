import React from 'react';
import styled from 'styled-components';

interface Option {
	value: string;
	label: string;
}

interface SelectInputProps {
	options: Option[];
	value: string;
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
	disabled?: boolean;
	required?: boolean;
}

const StyledSelect = styled.select`
	padding: 0.375rem 0.75rem;
	border: 1px solid #ced4da;
	border-radius: 0.25rem;
	font-size: 1rem;
	line-height: 1.5;
	width: 100%;
	background-color: ${(props) => props.theme.background.content};
	color: ${(props) => props.theme.text.body};

	option {
		background-color: ${(props) => props.theme.background.content};
		color: ${(props) => props.theme.text.body};
	}
`;

const SelectInput: React.FC<SelectInputProps> = ({
	options,
	value,
	onChange,
	disabled = false,
	required = false,
}) => {
	return (
		<StyledSelect
			value={value}
			onChange={onChange}
			disabled={disabled}
			required={required}
		>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</StyledSelect>
	);
};

export default SelectInput;