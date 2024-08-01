import React, { ChangeEvent, FormEvent } from 'react';

interface ResetPasswordFormProps {
	onPasswordChange: (value: string) => void;
	onConfirmPasswordChange: (value: string) => void;
	onResetPassword: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
	onPasswordChange,
	onConfirmPasswordChange,
	onResetPassword,
}) => {
	return (
		<form
			onSubmit={(e: FormEvent) => {
				e.preventDefault();
				onResetPassword();
			}}
			className='max-w-sm mx-auto space-y-6'
		>
			<div className='space-y-2'>
				<label
					htmlFor='password'
					className='block text-sm font-medium text-gray-700'
				>
					Password
				</label>
				<input
					type='password'
					id='password'
					name='password'
					onChange={(e: ChangeEvent<HTMLInputElement>) =>
						onPasswordChange(e.target.value)
					}
					placeholder='Password'
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
					aria-required='true'
				/>
			</div>
			<div className='space-y-2'>
				<label
					htmlFor='confirmPassword'
					className='block text-sm font-medium text-gray-700'
				>
					Confirm Password
				</label>
				<input
					type='password'
					id='confirmPassword'
					name='confirmPassword'
					onChange={(e: ChangeEvent<HTMLInputElement>) =>
						onConfirmPasswordChange(e.target.value)
					}
					placeholder='Confirm Password'
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
					aria-required='true'
				/>
			</div>
			<button
				type='submit'
				className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full'
			>
				Reset Password
			</button>
		</form>
	);
};

export default ResetPasswordForm;
