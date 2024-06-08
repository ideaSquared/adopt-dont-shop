import React, { useState } from 'react';
import { Rescue } from '../../types/rescue';
import { Application } from '../../services/ApplicationsService';

interface ApplicationFormProps {
	rescueProfile?: Rescue;
	application: Application;
	isViewing: boolean;
	isCustomer: boolean;
}

const FormFields: React.FC<{
	formData: Application;
	handleChange: (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => void;
}> = ({ formData, handleChange }) => (
	<>
		<div>
			<label className='block text-gray-700'>First Name:</label>
			<input
				type='text'
				name='first_name'
				value={formData.first_name}
				onChange={handleChange}
				className='mt-1 block w-full border border-gray-300 rounded py-2 px-3'
			/>
		</div>
		<div>
			<label className='block text-gray-700'>Pet Name:</label>
			<input
				type='text'
				name='pet_name'
				value={formData.pet_name}
				onChange={handleChange}
				className='mt-1 block w-full border border-gray-300 rounded py-2 px-3'
			/>
		</div>
		<div>
			<label className='block text-gray-700'>Description:</label>
			<textarea
				name='description'
				value={formData.description}
				onChange={handleChange}
				className='mt-1 block w-full border border-gray-300 rounded py-2 px-3'
			/>
		</div>
	</>
);

const ApplicationForm: React.FC<ApplicationFormProps> = ({
	rescueProfile,
	application,
	isViewing,
	isCustomer,
}) => {
	const [formData, setFormData] = useState(application);

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Handle form submission
		console.log(formData);
	};

	const isActioned = formData.actioned_by !== null;

	return (
		<div className='bg-white shadow-md rounded p-4 relative'>
			<h2 className='text-xl font-semibold mb-4'>Application Form</h2>
			<div className='absolute top-4 right-4 space-x-2'>
				<span className='bg-gray-200 text-gray-700 py-1 px-3 rounded-full text-sm'>
					{formData.status}
				</span>
				<span className='bg-gray-200 text-gray-700 py-1 px-3 rounded-full text-sm'>
					{formData.actioned_by}
				</span>
			</div>
			{isViewing && !isCustomer ? (
				<div>
					{rescueProfile ? (
						<p>Viewing Application for: {rescueProfile.rescue_name}</p>
					) : (
						<p>Viewing Application</p>
					)}
					<form onSubmit={handleSubmit} className='space-y-4'>
						<FormFields formData={formData} handleChange={handleChange} />
						<div className='mt-4'>
							{isActioned ? (
								<div>
									{formData.status === 'approved' ? (
										<span className='text-green-500 font-semibold'>
											Approved
										</span>
									) : (
										<span className='text-red-500 font-semibold'>Rejected</span>
									)}
								</div>
							) : (
								<>
									<button
										type='button'
										className='bg-green-500 text-white py-2 px-4 rounded mr-2'
									>
										Approve
									</button>
									<button
										type='button'
										className='bg-red-500 text-white py-2 px-4 rounded'
									>
										Reject
									</button>
								</>
							)}
						</div>
					</form>
				</div>
			) : (
				<form onSubmit={handleSubmit} className='space-y-4'>
					<FormFields formData={formData} handleChange={handleChange} />
					{isCustomer && (
						<button
							type='submit'
							className='bg-blue-500 text-white py-2 px-4 rounded'
						>
							Submit Application
						</button>
					)}
				</form>
			)}
		</div>
	);
};

export default ApplicationForm;
