import React from 'react';
import { Link } from 'react-router-dom';

const LoginForm = ({ onEmailChange, onPasswordChange, onLogin }) => {
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onLogin();
			}}
			className='space-y-6'
		>
			<div>
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
			<div>
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
					onChange={(e) => onPasswordChange(e.target.value)}
					placeholder='Enter your password'
					className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
					aria-required='true'
				/>
			</div>
			<div className='flex items-center justify-between'>
				<button
					type='submit'
					className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
				>
					Login
				</button>
				<Link
					to='/forgot-password'
					className='text-sm font-medium text-indigo-600 hover:text-indigo-500'
				>
					Forgot password?
				</Link>
			</div>
		</form>
	);
};

export default LoginForm;
