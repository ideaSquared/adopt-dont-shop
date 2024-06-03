import React from 'react';

interface ForgotPasswordProps {
	onEmailChange: (value: string) => void;
	onForgotPassword: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({
	onEmailChange,
	onForgotPassword,
}) => {
	return (
		<form
			className='max-w-sm mx-auto space-y-6'
			onSubmit={(e) => {
				e.preventDefault();
				onForgotPassword();
			}}
		>
			<div className='space-y-2'>
				<label
					htmlFor='email'
					className='block text-sm font-medium text-gray-700'
				>
					Email address
				</label>
				<input
					type='email'
					id='email'
					name='email'
					onChange={(e) => onEmailChange(e.target.value)}
					placeholder='Enter your email'
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
					aria-required='true'
				/>
			</div>
			<button
				type='submit'
				className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full'
			>
				Reset my password
			</button>
		</form>
	);
};

export default ForgotPassword;
