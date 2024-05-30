import React, { useState } from 'react';
import PetService from '../../services/PetService';
import AllowedPreferences from '../AllowedPreferences';
import BaseSidebar from './BaseSidebar';

const PetFormSidebar = ({
	show,
	handleClose,
	petDetails,
	setPetDetails,
	isEditMode,
	refreshPets,
}) => {
	const [selectedFiles, setSelectedFiles] = useState([]);
	const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const allowedPreferences = AllowedPreferences();

	const handleFileChange = async (event) => {
		const files = Array.from(event.target.files);

		try {
			await PetService.uploadPetImages(petDetails.pet_id, files);
			await refreshPetDetails();
		} catch (error) {
			console.error('Error uploading files:', error);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsLoading(true);
		setError(null);
		try {
			const response = await PetService.createOrUpdatePet(
				petDetails,
				isEditMode
			);

			const savedPet = response.data;

			if (selectedFiles.length > 0) {
				await PetService.uploadPetImages(savedPet.pet_id, selectedFiles);
			}

			refreshPets();
			handleClose();
		} catch (error) {
			console.error('Error submitting pet details:', error);
			setError('Failed to submit pet details.');
		} finally {
			setIsLoading(false);
		}
	};

	const renderImagePreviews = () => {
		return selectedFiles.length > 0 ? (
			selectedFiles.map((file, index) => (
				<div key={index} className='image-preview'>
					<img
						src={URL.createObjectURL(file)}
						alt='preview'
						className='w-100'
					/>
				</div>
			))
		) : (
			<p>No files selected for upload.</p>
		);
	};

	const renderPetImages = () => {
		return (
			<div className='grid grid-cols-3 gap-4'>
				{petDetails?.images?.map((image, index) => (
					<div key={index} className='relative'>
						<img
							src={fileUploadsPath + image}
							alt={image}
							className='w-full h-auto object-cover'
						/>
						<button
							onClick={() => handleRemoveImage(index)}
							className='absolute top-0 right-0 bg-red-500 text-white rounded-full p-1'
						>
							X
						</button>
					</div>
				)) || <p>No images available.</p>}
			</div>
		);
	};

	const refreshPetDetails = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const updatedPetDetails = await PetService.getPetById(petDetails?.pet_id);
			setPetDetails(updatedPetDetails.data);
		} catch (error) {
			console.error('Error fetching updated pet details:', error);
			setError('Failed to load updated pet details.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveImage = async (index) => {
		const imageToDelete = petDetails.images[index];

		try {
			setIsLoading(true);
			await PetService.deletePetImages(petDetails.pet_id, [imageToDelete]);

			const updatedImages = petDetails.images.filter((_, idx) => idx !== index);
			const updatedPetDetails = { ...petDetails, images: updatedImages };
			setPetDetails(updatedPetDetails);

			await refreshPetDetails();
		} catch (error) {
			console.error('Error deleting pet image:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const renderSelectOptions = (category) => {
		return allowedPreferences[category].map((preference) => (
			<option key={preference} value={preference}>
				{preference
					.split('_')
					.map((word, index) =>
						index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
					)
					.join(' ')}
			</option>
		));
	};

	return (
		<BaseSidebar
			show={show}
			handleClose={handleClose}
			title={isEditMode ? 'Edit Pet' : 'Add Pet'}
			size='w-1/3'
		>
			<form onSubmit={handleSubmit} className='space-y-6 flex flex-col h-full'>
				{isLoading && <div>Loading pet details...</div>}
				{error && <div className='text-danger'>{error}</div>}
				{!isLoading && !error && (
					<div className='flex-grow overflow-y-auto space-y-6'>
						{/* Pet Images */}
						<div>
							<label className='block text-sm font-medium text-gray-700'>
								Pet Images
							</label>
							<div className='flex flex-wrap items-center'>
								{isLoading && <p>Loading images...</p>}
								{!isLoading &&
									!error &&
									(petDetails?.images?.length > 0 ? (
										renderPetImages()
									) : (
										<p>No images available.</p>
									))}
							</div>
						</div>
						{/* Upload images */}
						<div>
							<label className='block text-sm font-medium text-gray-700'>
								Upload images
							</label>
							<input
								type='file'
								multiple
								accept='image/*'
								onChange={handleFileChange}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>
						{/* Name */}
						<div>
							<label
								htmlFor='name'
								className='block text-sm font-medium text-gray-700'
							>
								Name
							</label>
							<input
								type='text'
								id='name'
								placeholder='Enter pet name'
								value={petDetails?.name || ''}
								onChange={(e) =>
									setPetDetails({ ...petDetails, name: e.target.value })
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>
						{/* Age */}
						<div>
							<label
								htmlFor='age'
								className='block text-sm font-medium text-gray-700'
							>
								Age
							</label>
							<input
								type='number'
								id='age'
								placeholder="Enter pet's age"
								value={petDetails?.age || ''}
								onChange={(e) =>
									setPetDetails({ ...petDetails, age: e.target.value })
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>
						{/* Gender */}
						<div>
							<label
								htmlFor='gender'
								className='block text-sm font-medium text-gray-700'
							>
								Gender
							</label>
							<select
								id='gender'
								value={petDetails?.gender || ''}
								onChange={(e) =>
									setPetDetails({ ...petDetails, gender: e.target.value })
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select gender...</option>
								<option value='Male'>Male</option>
								<option value='Female'>Female</option>
								<option value='Other'>Other</option>
								<option value='Unknown'>Unknown</option>
							</select>
						</div>
						{/* Status */}
						<div>
							<label
								htmlFor='status'
								className='block text-sm font-medium text-gray-700'
							>
								Status
							</label>
							<select
								id='status'
								value={petDetails?.status || ''}
								onChange={(e) =>
									setPetDetails({ ...petDetails, status: e.target.value })
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select pet's status</option>
								<option value='Available'>Available</option>
								<option value='Reserved'>Reserved</option>
								<option value='Adoption Pending'>Adoption Pending</option>
								<option value='Adopted'>Adopted</option>
								<option value='Draft'>Draft</option>
								<option value='Quarantine'>Quarantine</option>
								<option value='On Hold'>On Hold</option>
								<option value='Not Available for Adoption'>
									Not Available for Adoption
								</option>
							</select>
						</div>
						{/* Type */}
						<div>
							<label
								htmlFor='type'
								className='block text-sm font-medium text-gray-700'
							>
								Type
							</label>
							<input
								type='text'
								id='type'
								placeholder='Enter pet type'
								value={petDetails?.type || ''}
								onChange={(e) =>
									setPetDetails({ ...petDetails, type: e.target.value })
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>
						{/* Breed */}
						<div>
							<label
								htmlFor='breed'
								className='block text-sm font-medium text-gray-700'
							>
								Breed
							</label>
							<input
								type='text'
								id='breed'
								placeholder='Enter pet breed'
								value={petDetails?.breed || ''}
								onChange={(e) =>
									setPetDetails({ ...petDetails, breed: e.target.value })
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>
						{/* Short Description */}
						<div>
							<label
								htmlFor='short_description'
								className='block text-sm font-medium text-gray-700'
							>
								Short description
							</label>
							<textarea
								id='short_description'
								rows={2}
								placeholder='Enter a short description'
								value={petDetails?.short_description || ''}
								onChange={(e) =>
									setPetDetails({
										...petDetails,
										short_description: e.target.value,
									})
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>

						{/* Long Description */}
						<div>
							<label
								htmlFor='long_description'
								className='block text-sm font-medium text-gray-700'
							>
								Long description
							</label>
							<textarea
								id='long_description'
								rows={3}
								placeholder='Enter a detailed description'
								value={petDetails?.long_description || ''}
								onChange={(e) =>
									setPetDetails({
										...petDetails,
										long_description: e.target.value,
									})
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							/>
						</div>

						{/* Vaccination Status */}
						<div>
							<label
								htmlFor='vaccination_status'
								className='block text-sm font-medium text-gray-700'
							>
								Vaccination status
							</label>
							<select
								id='vaccination_status'
								value={petDetails.vaccination_status}
								onChange={(e) =>
									setPetDetails({
										...petDetails,
										vaccination_status: e.target.value,
									})
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select vaccination status</option>
								<option value='Fully Vaccinated'>Fully Vaccinated</option>
								<option value='Partially Vaccinated'>
									Partially Vaccinated
								</option>
								<option value='Unvaccinated'>Unvaccinated</option>
								<option value='Booster Required'>Booster Required</option>
								<option value='Overdue for Vaccinations'>
									Overdue for Vaccinations
								</option>
								<option value='Medical Exemption'>Medical Exemption</option>
							</select>
						</div>
						{/* Temperament */}
						<div>
							<label
								htmlFor='temperament'
								className='block text-sm font-medium text-gray-700'
							>
								Temperament
							</label>
							<select
								id='temperament'
								value={petDetails?.temperament || ''}
								onChange={(e) =>
									setPetDetails({
										...petDetails,
										temperament: e.target.value,
									})
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select temperament</option>
								{renderSelectOptions('temperament')}
							</select>
						</div>
						{/* Health */}
						<div>
							<label
								htmlFor='health'
								className='block text-sm font-medium text-gray-700'
							>
								Health
							</label>
							<select
								id='health'
								value={petDetails?.health || ''}
								onChange={(e) =>
									setPetDetails({ ...petDetails, health: e.target.value })
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select health</option>
								{renderSelectOptions('health')}
							</select>
						</div>
						{/* Size */}
						<div>
							<label
								htmlFor='size'
								className='block text-sm font-medium text-gray-700'
							>
								Size
							</label>
							<select
								id='size'
								value={petDetails?.size || ''}
								onChange={(e) =>
									setPetDetails({ ...petDetails, size: e.target.value })
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select size</option>
								{renderSelectOptions('size')}
							</select>
						</div>
						{/* Grooming Needs */}
						<div>
							<label
								htmlFor='grooming_needs'
								className='block text-sm font-medium text-gray-700'
							>
								Grooming Needs
							</label>
							<select
								id='grooming_needs'
								value={petDetails?.grooming_needs || ''}
								onChange={(e) =>
									setPetDetails({
										...petDetails,
										grooming_needs: e.target.value,
									})
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select grooming needs</option>
								{renderSelectOptions('grooming_needs')}
							</select>
						</div>
						{/* Training & Socialization */}
						<div>
							<label
								htmlFor='training_socialization'
								className='block text-sm font-medium text-gray-700'
							>
								Training & Socialization
							</label>
							<select
								id='training_socialization'
								value={petDetails?.training_socialization || ''}
								onChange={(e) =>
									setPetDetails({
										...petDetails,
										training_socialization: e.target.value,
									})
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select training & socialization status</option>
								{renderSelectOptions('training_socialization')}
							</select>
						</div>
						{/* Commitment Level */}
						<div>
							<label
								htmlFor='commitment_level'
								className='block text-sm font-medium text-gray-700'
							>
								Commitment Level
							</label>
							<select
								id='commitment_level'
								value={petDetails?.commitment_level || ''}
								onChange={(e) =>
									setPetDetails({
										...petDetails,
										commitment_level: e.target.value,
									})
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select commitment level</option>
								{renderSelectOptions('commitment_level')}
							</select>
						</div>
						{/* Other Pets */}
						<div>
							<label
								htmlFor='other_pets'
								className='block text-sm font-medium text-gray-700'
							>
								Other Pets
							</label>
							<select
								id='other_pets'
								value={petDetails?.other_pets || ''}
								onChange={(e) =>
									setPetDetails({
										...petDetails,
										other_pets: e.target.value,
									})
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select other pet preference</option>
								{renderSelectOptions('other_pets')}
							</select>
						</div>
						{/* Household */}
						<div>
							<label
								htmlFor='household'
								className='block text-sm font-medium text-gray-700'
							>
								Household
							</label>
							<select
								id='household'
								value={petDetails?.household || ''}
								onChange={(e) =>
									setPetDetails({
										...petDetails,
										household: e.target.value,
									})
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select household</option>
								{renderSelectOptions('household')}
							</select>
						</div>
						{/* Energy */}
						<div>
							<label
								htmlFor='energy'
								className='block text-sm font-medium text-gray-700'
							>
								Energy
							</label>
							<select
								id='energy'
								value={petDetails?.energy || ''}
								onChange={(e) =>
									setPetDetails({ ...petDetails, energy: e.target.value })
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select energy level</option>
								{renderSelectOptions('energy')}
							</select>
						</div>
						{/* Family */}
						<div>
							<label
								htmlFor='family'
								className='block text-sm font-medium text-gray-700'
							>
								Family
							</label>
							<select
								id='family'
								value={petDetails?.family || ''}
								onChange={(e) =>
									setPetDetails({ ...petDetails, family: e.target.value })
								}
								className='mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
							>
								<option value=''>Select family preference</option>
								{renderSelectOptions('family')}
							</select>
						</div>
					</div>
				)}
				<div className='flex justify-end mt-4'>
					<button
						className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
						onClick={handleClose}
					>
						Close
					</button>
					<button
						className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
						type='submit'
						onClick={handleSubmit}
					>
						Save Changes
					</button>
				</div>
			</form>
		</BaseSidebar>
	);
};

export default PetFormSidebar;
