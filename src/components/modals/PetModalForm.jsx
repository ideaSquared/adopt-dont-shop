import React, { useState } from 'react';
import {
	Modal,
	Button,
	Form,
	Row,
	Col,
	Image,
	Card,
	Container,
} from 'react-bootstrap';
import {
	uploadPetImages,
	getPetById,
	createOrUpdatePet,
} from '../../services/PetService';

const PetModalForm = ({
	show,
	handleClose,
	petDetails,
	setPetDetails,
	isEditMode,
	handlePetChange,
	refreshPets,
	createOrUpdatePet,
}) => {
	// State for managing selected files
	const [selectedFiles, setSelectedFiles] = useState([]);
	const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [isLoadingImages, setIsLoadingImages] = useState(false);
	const [imagesError, setImagesError] = useState(null);

	// Function to handle file input change
	const handleFileChange = async (event) => {
		const files = Array.from(event.target.files);
		if (files.length > 0) {
			try {
				await uploadPetImages(petDetails._id, files);
				await refreshPetDetails();
			} catch (error) {
				console.error('Error uploading files:', error);
			}
		}
	};

	// Combined submit handler
	const handleSubmit = async (event) => {
		event.preventDefault();
		try {
			const savedPet = await createOrUpdatePet(petDetails, isEditMode);

			if (selectedFiles.length > 0) {
				await uploadPetImages(savedPet.data.data._id, selectedFiles);
			}
			refreshPets();
			handleClose();
		} catch (error) {
			console.error('Error submitting pet details:', error);
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
		if (!petDetails?.images?.length) {
			return <p>No images available.</p>;
		}

		return (
			<Container>
				<Row xs={1} md={2} lg={4} className='g-4'>
					{petDetails.images.map((image, index) => (
						<Col key={index}>
							<Card className='position-relative'>
								<Card.Img variant='top' src={fileUploadsPath + image} />
								<Button
									onClick={() => handleRemoveImage(index)}
									variant='danger'
									className='position-absolute'
									style={{
										top: '0.5rem', // Adjust these values as needed
										right: '0.5rem', // Adjust these values as needed
										border: 'none',
										borderRadius: '50%',
										padding: '0.25rem 0.5rem', // Adjust padding to change size
										fontSize: '1rem', // Adjust font size as needed
										lineHeight: 1,
										width: '30px', // Adjust width and height to change button size
										height: '30px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
									}}
								>
									&times;{' '}
								</Button>
							</Card>
						</Col>
					))}
				</Row>
			</Container>
		);
	};

	const refreshPetDetails = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const updatedPetDetails = await getPetById(petDetails?._id);
			setPetDetails(updatedPetDetails.data);
		} catch (error) {
			console.error('Error fetching updated pet details:', error);
			setError('Failed to load updated pet details.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveImage = async (index) => {
		// Create a new array without the image at the given index
		const updatedImages = petDetails.images.filter((_, idx) => idx !== index);

		// Update petDetails with the new images array
		const updatedPetDetails = { ...petDetails, images: updatedImages };

		try {
			setIsLoading(true);
			// Assuming createOrUpdatePet updates the pet and returns the updated pet details
			const updatedPet = await createOrUpdatePet(updatedPetDetails, true);
			setPetDetails(updatedPet.data); // Update your state with the returned updated pet details
			// Optionally refresh the pets list if needed
			refreshPetDetails();
		} catch (error) {
			console.error('Error updating pet details:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal show={show} onHide={handleClose}>
			<Form onSubmit={handlePetChange}>
				<Modal.Header closeButton>
					<Modal.Title>{isEditMode ? 'Edit Pet' : 'Add Pet'}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{isLoading && <div>Loading pet details...</div>}
					{error && <div className='text-danger'>{error}</div>}
					{!isLoading && !error && (
						<>
							{/* Images Row */}

							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group>
										<Form.Label>Pet Images</Form.Label>
										<div className='pet-images-container'>
											{/* Display a loading indicator when images are being fetched */}
											{isLoadingImages && <p>Loading images...</p>}

											{/* Display an error message if there was an issue fetching the images */}
											{imagesError && (
												<p className='text-danger'>{imagesError}</p>
											)}

											{/* Once loading is complete and if there's no error, check for images */}
											{!isLoadingImages &&
												!imagesError &&
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
										<Form.Label>Upload Images</Form.Label>
										<Form.Control
											type='file'
											multiple
											accept='image/*'
											onChange={handleFileChange}
										/>
									</Form.Group>
									{selectedFiles.length > 0 && (
										<div className='image-previews'>
											{renderImagePreviews()}
										</div>
									)}
								</Col>
							</Row>
							<Row className='mb-3'>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Name</Form.Label>
										<Form.Control
											type='text'
											placeholder='Enter pet name'
											name='petName'
											value={petDetails?.petName || ''}
											onChange={handlePetChange}
										/>
									</Form.Group>
								</Col>
								<Col xs={12} md={6}>
									<Form.Group>
										<Form.Label>Age</Form.Label>
										<Form.Control
											type='integer'
											placeholder="Enter pet's age"
											name='age'
											value={petDetails?.age || ''}
											onChange={handlePetChange}
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
											onChange={handlePetChange}
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
											onChange={handlePetChange}
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
											onChange={handlePetChange}
										/>
									</Form.Group>
								</Col>
							</Row>

							{/* {<!-- Descriptions Row -->} */}
							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group>
										<Form.Label>Short Description</Form.Label>
										<Form.Control
											as='textarea'
											rows={2}
											placeholder='Enter a short description'
											name='shortDescription'
											value={petDetails?.shortDescription || ''}
											onChange={handlePetChange}
										/>
									</Form.Group>
								</Col>
							</Row>

							<Row className='mb-3'>
								<Col xs={12}>
									<Form.Group>
										<Form.Label>Long Description</Form.Label>
										<Form.Control
											as='textarea'
											rows={3}
											placeholder='Enter a detailed description'
											name='longDescription'
											value={petDetails?.longDescription || ''}
											onChange={handlePetChange}
										/>
									</Form.Group>
								</Col>
							</Row>

							{/* { <!-- Characteristics -->} */}
							{/* {<!-- Common Characteristics Row -->} */}
							<Row className='mb-3'>
								<Col xs={12} md={4}>
									<Form.Group>
										<Form.Label>Size</Form.Label>
										<Form.Control
											type='text'
											placeholder="Enter pet's size"
											name='characteristics.common.size'
											value={petDetails?.characteristics?.common?.size || ''}
											onChange={handlePetChange}
										/>
									</Form.Group>
								</Col>
								<Col xs={12} md={4}>
									<Form.Group>
										<Form.Label>Temperament</Form.Label>
										<Form.Control
											type='text'
											placeholder="Enter pet's temperament"
											name='characteristics.common.temperament'
											value={
												petDetails?.characteristics?.common?.temperament || ''
											}
											onChange={handlePetChange}
										/>
									</Form.Group>
								</Col>
								<Col xs={12} md={4}>
									<Form.Group>
										<Form.Label>Vaccination Status</Form.Label>
										<Form.Control
											type='text'
											placeholder="Enter pet's vaccination status"
											name='characteristics.common.vaccination_status'
											value={
												petDetails?.characteristics?.common
													?.vaccination_status || ''
											}
											onChange={handlePetChange}
										/>
									</Form.Group>
								</Col>
							</Row>

							{/* {<!-- Specific Characteristics Row -->} */}
							<Row className='mb-3'>
								<Col xs={12} md={4}>
									<Form.Group>
										<Form.Label>Breed</Form.Label>
										<Form.Control
											type='text'
											placeholder="Enter pet's breed"
											name='characteristics.specific.breed'
											value={petDetails?.characteristics?.specific?.breed || ''}
											onChange={handlePetChange}
										/>
									</Form.Group>
								</Col>
								<Col xs={12} md={4}>
									<Form.Group>
										<Form.Label>Activity Level</Form.Label>
										<Form.Control
											type='text'
											placeholder="Enter pet's activity level"
											name='characteristics.specific.activity_level'
											value={
												petDetails?.characteristics?.specific?.activity_level ||
												''
											}
											onChange={handlePetChange}
										/>
									</Form.Group>
								</Col>
								<Col xs={12} md={4}>
									<Form.Group>
										<Form.Label>Intelligence Level</Form.Label>
										<Form.Control
											type='text'
											placeholder="Enter pet's intelligence level"
											name='characteristics.specific.intelligence_level'
											value={
												petDetails?.characteristics?.specific
													?.intelligence_level || ''
											}
											onChange={handlePetChange}
										/>
									</Form.Group>
								</Col>
							</Row>
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
