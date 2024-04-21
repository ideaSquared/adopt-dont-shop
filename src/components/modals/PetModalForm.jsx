import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Image } from 'react-bootstrap';
import PetService from '../../services/PetService';
import 'PetModalForm.scss';

const PetModalForm = ({
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

	const handleFileChange = async (event) => {
		const files = Array.from(event.target.files);

		try {
			await PetService.uploadPetImages(petDetails.pet_id, files);
			await refreshPetDetails(); // This assumes refreshPetDetails properly updates petDetails including images
		} catch (error) {
			console.error('Error uploading files:', error);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsLoading(true);
		setError(null);
		try {
			// Use the createOrUpdatePet service method for both creating and updating pets
			const response = await PetService.createOrUpdatePet(
				petDetails,
				isEditMode
			);

			// Assuming the response includes the saved pet details, adjust as needed
			const savedPet = response.data;

			if (selectedFiles.length > 0) {
				await PetService.uploadPetImages(savedPet.pet_id, selectedFiles);
			}

			refreshPets(); // Trigger parent component to refresh the pet list
			handleClose(); // Close the modal form
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
					<Image
						src={URL.createObjectURL(file)}
						alt='preview'
						className='w-100'
						fluid
					/>
				</div>
			))
		) : (
			<p>No files selected for upload.</p>
		);
	};

	const renderPetImages = () => {
		return (
			petDetails?.images?.map((image, index) => (
				<div
					key={index}
					style={{
						position: 'relative',
						display: 'inline-block',
						marginRight: '8px',
					}}
				>
					<Image src={fileUploadsPath + image} thumbnail />
					<Button
						onClick={() => handleRemoveImage(index)}
						style={{
							position: 'absolute',
							top: '0',
							right: '0',
							backgroundColor: 'red',
							color: 'white',
							border: 'none',
							borderRadius: '50%',
							cursor: 'pointer',
							padding: '0 6px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						X
					</Button>
				</div>
			)) || <p>No images available.</p>
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
		// Extract the filename of the image to be deleted
		const imageToDelete = petDetails.images[index];

		try {
			setIsLoading(true);

			// First, call the service to delete the image file and update the database
			await PetService.deletePetImages(petDetails.pet_id, [imageToDelete]);

			// Then, update the local state to reflect the change immediately for a better user experience
			const updatedImages = petDetails.images.filter((_, idx) => idx !== index);
			const updatedPetDetails = { ...petDetails, images: updatedImages };
			setPetDetails(updatedPetDetails);

			// Optionally, refresh the pet details to ensure the UI is in sync with the backend
			await refreshPetDetails();
		} catch (error) {
			console.error('Error deleting pet image:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal show={show} onHide={handleClose} size='lg'>
			<Form onSubmit={handleSubmit}>
				<Modal.Header closeButton>
					<Modal.Title>{isEditMode ? 'Edit Pet' : 'Add Pet'}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{isLoading && <div>Loading pet details...</div>}
					{error && <div className='text-danger'>{error}</div>}
					{!isLoading && !error && (
						<>
							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group>
										<Form.Label>Pet Images</Form.Label>
										<div className='pet-images-container'>
											{/* Display a loading indicator when images are being fetched */}
											{isLoading && <p>Loading images...</p>}

											{/* Display an error message if there was an issue fetching the images */}
											{error && <p className='text-danger'>{imagesError}</p>}

											{/* Once loading is complete and if there's no error, check for images */}
											{!isLoading &&
												!error &&
												(petDetails?.images?.length > 0 ? (
													renderPetImages()
												) : (
													<p>No images available.</p>
												))}
										</div>
									</Form.Group>
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group controlId='formFileMultiple' className='mb-3'>
										<Form.Label>Upload images</Form.Label>
										<Form.Control
											type='file'
											multiple
											accept='image/*'
											onChange={handleFileChange}
										/>
									</Form.Group>
									{/* <div className='image-previews'>
										{selectedFiles.map((file, index) => (
											<div key={index} className='image-preview'>
												<Image
													src={URL.createObjectURL(file)}
													alt='preview'
													className='w-100'
													fluid
												/>
											</div>
										))}
									</div> */}
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Name</Form.Label>
										<Form.Control
											type='text'
											placeholder='Enter pet name'
											name='name'
											value={petDetails?.name || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													name: e.target.value,
												})
											}
										/>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Age</Form.Label>
										<Form.Control
											type='number'
											placeholder="Enter pet's age"
											name='age'
											value={petDetails?.age || ''}
											onChange={(e) =>
												setPetDetails({ ...petDetails, age: e.target.value })
											}
										/>
									</Form.Group>
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12} md={4}>
									<Form.Group>
										<Form.Label>Gender</Form.Label>
										<Form.Control
											as='select'
											name='gender'
											value={petDetails?.gender || ''}
											onChange={(e) =>
												setPetDetails({ ...petDetails, gender: e.target.value })
											}
										>
											<option value=''>Select gender...</option>
											<option value='Male'>Male</option>
											<option value='Female'>Female</option>
											<option value='Other'>Other</option>
											<option value='Unknown'>Unknown</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={4}>
									<Form.Group>
										<Form.Label>Status</Form.Label>
										<Form.Control
											as='select'
											name='status'
											value={petDetails?.status || ''}
											onChange={(e) =>
												setPetDetails({ ...petDetails, status: e.target.value })
											}
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
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={4}>
									<Form.Group>
										<Form.Label>Type</Form.Label>
										<Form.Control
											type='text'
											placeholder="Enter pet's type"
											name='type'
											value={petDetails?.type || ''}
											onChange={(e) =>
												setPetDetails({ ...petDetails, type: e.target.value })
											}
										/>
									</Form.Group>
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group>
										<Form.Label>Short description</Form.Label>
										<Form.Control
											as='textarea'
											rows={2}
											placeholder='Enter a short description'
											name='short_description'
											value={petDetails?.short_description || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													short_description: e.target.value,
												})
											}
										/>
									</Form.Group>
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group>
										<Form.Label>Long description</Form.Label>
										<Form.Control
											as='textarea'
											rows={3}
											placeholder='Enter a detailed description'
											name='long_description'
											value={petDetails?.long_description || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													long_description: e.target.value,
												})
											}
										/>
									</Form.Group>
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Vaccination status</Form.Label>
										<Form.Control
											as='select'
											name='vaccination_status'
											value={petDetails?.vaccination_status || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													vaccination_status: e.target.value,
												})
											}
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
											<option value='Medical Exemption'>
												Medical Exemption
											</option>
										</Form.Control>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Breed</Form.Label>
										<Form.Control
											type='text'
											placeholder="Enter pet's breed"
											name='breed'
											value={petDetails?.breed || ''}
											onChange={(e) =>
												setPetDetails({
													...petDetails,
													breed: e.target.value,
												})
											}
										/>
									</Form.Group>
								</Col>
							</Row>
							{/* Add more form groups as needed based on your pet model's requirements */}
						</>
					)}
				</Modal.Body>

				<Modal.Footer>
					<Button variant='secondary' onClick={handleClose}>
						Close
					</Button>
					<Button variant='primary' type='submit' onClick={handleSubmit}>
						Save Changes
					</Button>
				</Modal.Footer>
			</Form>
		</Modal>
	);
};

export default PetModalForm;
