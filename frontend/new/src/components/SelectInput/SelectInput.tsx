import React from 'react';

interface SelectInputProps {
	label: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
	options: { value: string; label: string }[];
	required?: boolean;
}

const SelectInput: React.FC<SelectInputProps> = ({
	label,
	value,
	onChange,
	options,
	required = false,
}) => {
	return (
		<div>
			<label>{label}:</label>
			<select value={value} onChange={onChange} required={required}>
				<option value=''>Select a type</option>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
};

export default SelectInput;
