import React from 'react';

interface TextFilter {
	type: 'text';
	label?: string;
	placeholder: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface SelectOption {
	value: string;
	label?: string;
}

interface SelectFilter {
	type: 'select';
	label?: string;
	value: string;
	options: SelectOption[];
	onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface SwitchFilter {
	type: 'switch';
	label?: string;
	id: string;
	name: string;
	checked: boolean;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface ButtonFilter {
	type: 'button';
	label?: string;
	onClick?: () => void;
	disabled?: boolean;
}

type Filter = TextFilter | SelectFilter | SwitchFilter | ButtonFilter;

interface GenericFilterFormProps {
	filters: Filter[];
	onAddClick?: () => void;
	canAdd?: boolean; // Making canAdd optional
}

const GenericFilterForm: React.FC<GenericFilterFormProps> = ({
	filters,
	onAddClick,
	canAdd = false, // Default value for canAdd
}) => {
	return (
		<div className='flex flex-wrap gap-4 mb-3 items-center'>
			{filters.map((filter, index) => {
				switch (filter.type) {
					case 'text':
						return (
							<div
								key={index}
								className='flex-1 min-w-[150px] flex flex-col space-y-2'
							>
								<label className='text-sm font-medium text-gray-700'>
									{filter.label}
								</label>
								<input
									aria-label={filter.label}
									type='text'
									placeholder={filter.placeholder}
									value={filter.value}
									onChange={filter.onChange}
									className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
								/>
							</div>
						);
					case 'select':
						return (
							<div
								key={index}
								className='flex-1 min-w-[150px] flex flex-col space-y-2'
							>
								<label className='text-sm font-medium text-gray-700'>
									{filter.label}
								</label>
								<select
									aria-label={filter.label}
									value={filter.value}
									onChange={filter.onChange}
									className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
								>
									{filter.options.map((option, idx) => (
										<option key={idx} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
						);
					case 'switch':
						return (
							<div
								key={index}
								className='flex-1 min-w-[150px] flex items-center space-x-2'
							>
								<label
									htmlFor={filter.id}
									className='text-sm font-medium text-gray-700'
								>
									{filter.label}
								</label>
								<input
									type='checkbox'
									id={filter.id}
									name={filter.name}
									checked={filter.checked}
									onChange={filter.onChange}
									className='form-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
								/>
							</div>
						);
					case 'button':
						return (
							<div
								key={index}
								className='flex-1 min-w-[150px] flex justify-end items-center'
							>
								<button
									onClick={filter.onClick}
									disabled={filter.disabled}
									className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full'
								>
									{filter.label}
								</button>
							</div>
						);
					default:
						return null;
				}
			})}
			{canAdd && (
				<div className='flex-1 min-w-[150px] flex justify-end'>
					<button
						onClick={onAddClick}
						className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
					>
						Add
					</button>
				</div>
			)}
		</div>
	);
};

export default GenericFilterForm;
