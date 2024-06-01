import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AlertComponent from '../../../components/common/AlertComponent';
import { useAuth } from '../../../contexts/AuthContext';
import { useRescueRedirect } from '../../../hooks/useRescueRedirect';
import RescueProfileForm from '../../../components/forms/RescueProfileForm';
import RescueProfileHeader from './RescueProfileHeader';

import AdopterManagement from './AdopterManagement';
import PetManagement from './PetsManagement';
import StaffManagement from './StaffManagement';
import RescueService from '../../../services/RescueService';

import RescueNoPermissions from './RescueNoPermissions';
import Conversations from '../../user/Conversations';

const RescueProfile = () => {
	const [rescueProfile, setRescueProfile] = useState({
		id: '',
		staff: [],
		rescueName: '',
		rescueType: '',
		city: '',
		country: 'United Kingdom',
		referenceNumber: '',
		referenceNumberVerified: false,
	});

	const { authState } = useAuth();
	const userId = authState.userId;

	const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });
	const [activeSection, setActiveSection] = useState('profile');
	const [showSidebar, setShowSidebar] = useState(false);

	useRescueRedirect();

	useEffect(() => {
		const initFetch = async () => {
			try {
				const profileData = await RescueService.fetchRescueProfile();
				setRescueProfile(profileData);
			} catch (error) {
				setAlertInfo({
					type: 'danger',
					message: 'Failed to load rescue profile. Please try again later.',
				});
			}
		};

		if (authState.isRescue) {
			initFetch();
		}
	}, [authState.isRescue]);

	const handleRescueInfoChange = (e) => {
		const { name, value } = e.target;
		setRescueProfile((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const saveUpdates = async () => {
		try {
			await RescueService.updateRescueProfile(
				rescueProfile.rescue_id,
				rescueProfile
			);
			setAlertInfo({
				type: 'success',
				message: 'Rescue profile updated successfully.',
			});
		} catch (error) {
			setAlertInfo({
				type: 'danger',
				message: 'Failed to update rescue profile. Please try again later.',
			});
		}
	};

	const handleReferenceNumberSubmit = async () => {
		if (!rescueProfile.referenceNumber) {
			setAlertInfo({
				type: 'danger',
				message: 'Please enter a reference number to submit for verification.',
			});
			return;
		}

		try {
			const verificationResult =
				await RescueService.submitReferenceNumberForVerification(
					rescueProfile.rescue_id,
					rescueProfile.rescueType,
					rescueProfile.referenceNumber
				);
			if (verificationResult.referenceNumberVerified) {
				setAlertInfo({
					type: 'success',
					message: 'Reference number verified successfully.',
				});
			} else {
				setAlertInfo({
					type: 'danger',
					message: 'Failed to verify reference number.',
				});
			}

			const profileData = await RescueService.fetchRescueProfile();
			setRescueProfile(profileData);
		} catch (error) {
			setAlertInfo({
				type: 'danger',
				message:
					'Error submitting reference number for verification. Please try again later.',
			});
		}
	};

	const canViewRescueInfo =
		authState.userPermissions.includes('view_rescue_info');
	const canEditRescueInfo =
		authState.userPermissions.includes('edit_rescue_info');
	const canDeleteRescue = authState.userPermissions.includes('delete_rescue');
	const canViewStaff = authState.userPermissions.includes('view_staff');
	const canAddStaff = authState.userPermissions.includes('add_staff');
	const canEditStaff = authState.userPermissions.includes('edit_staff');
	const canVerifyStaff = authState.userPermissions.includes('verify_staff');
	const canDeleteStaff = authState.userPermissions.includes('delete_staff');
	const canViewPet = authState.userPermissions.includes('view_pet');
	const canAddPet = authState.userPermissions.includes('add_pet');
	const canEditPet = authState.userPermissions.includes('edit_pet');
	const canDeletePet = authState.userPermissions.includes('delete_pet');
	const canViewMessages = authState.userPermissions.includes('view_messages');
	const canCreateMessages =
		authState.userPermissions.includes('create_messages');

	const renderSection = () => {
		switch (activeSection) {
			case 'profile':
				if (canViewRescueInfo) {
					return (
						<>
							<RescueProfileHeader rescueProfile={rescueProfile} />
							<RescueProfileForm
								rescueProfile={rescueProfile}
								handleRescueInfoChange={handleRescueInfoChange}
								handleReferenceNumberSubmit={handleReferenceNumberSubmit}
								canEditRescueInfo={canEditRescueInfo}
								saveUpdates={saveUpdates}
							/>
						</>
					);
				} else {
					return <RescueNoPermissions rescueProfile={rescueProfile} />;
				}
			case 'pets':
				if (canViewPet) {
					return (
						<PetManagement
							rescueId={rescueProfile.rescue_id}
							canAddPet={canAddPet}
							canEditPet={canEditPet}
							canDeletePet={canDeletePet}
						/>
					);
				} else {
					return <RescueNoPermissions rescueProfile={rescueProfile} />;
				}
			case 'staff':
				if (canViewStaff) {
					return (
						<StaffManagement
							rescueProfile={rescueProfile}
							setRescueProfile={setRescueProfile}
							canAddStaff={canAddStaff}
							canEditStaff={canEditStaff}
							canVerifyStaff={canVerifyStaff}
							canDeleteStaff={canDeleteStaff}
							userId={userId}
						/>
					);
				} else {
					return <RescueNoPermissions rescueProfile={rescueProfile} />;
				}
			case 'messages':
				if (canViewMessages) {
					return (
						<Conversations
							userType='Rescue'
							canCreateMessages={canCreateMessages}
							canReadMessages={canViewMessages}
						/>
					);
				}
			case 'adopter':
				if (canViewMessages) {
					return <AdopterManagement rescueId={rescueProfile.rescue_id} />;
				}
			default:
				return <RescueNoPermissions rescueProfile={rescueProfile} />;
		}
	};

	return (
		<>
			<nav className='bg-dark text-white sticky-top flex-md-nowrap p-0 shadow d-md-none'>
				<div className='flex justify-between items-center p-3'>
					<span className='font-bold'>{rescueProfile.rescueName}</span>
					<button onClick={() => setShowSidebar(true)} className='text-white'>
						Menu
					</button>
				</div>
			</nav>

			<div className='container mx-auto my-4'>
				<div className='flex flex-col md:flex-row'>
					<div className='w-full md:w-1/4 lg:w-1/5 hidden md:block bg-light p-0 h-screen'>
						<nav className='flex flex-col space-y-2 p-4'>
							<button
								className={`p-2 text-left ${
									activeSection === 'profile' ? 'bg-gray-300' : ''
								}`}
								onClick={() => setActiveSection('profile')}
							>
								Rescue Profile
							</button>
							<button
								className={`p-2 text-left ${
									activeSection === 'pets' ? 'bg-gray-300' : ''
								}`}
								onClick={() => setActiveSection('pets')}
							>
								Pet Management
							</button>
							<button
								className={`p-2 text-left ${
									activeSection === 'staff' ? 'bg-gray-300' : ''
								}`}
								onClick={() => setActiveSection('staff')}
							>
								Staff Management
							</button>
							<button
								className={`p-2 text-left ${
									activeSection === 'adopter' ? 'bg-gray-300' : ''
								}`}
								onClick={() => setActiveSection('adopter')}
							>
								Adopter Management
							</button>
							<button
								className={`p-2 text-left ${
									activeSection === 'messages' ? 'bg-gray-300' : ''
								}`}
								onClick={() => setActiveSection('messages')}
							>
								Messages
							</button>
						</nav>
					</div>
					{showSidebar && (
						<div
							className='fixed inset-0 bg-black bg-opacity-50 z-10'
							onClick={() => setShowSidebar(false)}
						></div>
					)}
					{showSidebar && (
						<div className='fixed inset-y-0 left-0 bg-white w-64 z-20 p-4 overflow-y-auto'>
							<nav className='flex flex-col space-y-2'>
								<button
									className={`p-2 text-left ${
										activeSection === 'profile' ? 'bg-gray-300' : ''
									}`}
									onClick={() => {
										setActiveSection('profile');
										setShowSidebar(false);
									}}
								>
									Rescue Profile
								</button>
								<button
									className={`p-2 text-left ${
										activeSection === 'pets' ? 'bg-gray-300' : ''
									}`}
									onClick={() => {
										setActiveSection('pets');
										setShowSidebar(false);
									}}
								>
									Pet Management
								</button>
								<button
									className={`p-2 text-left ${
										activeSection === 'staff' ? 'bg-gray-300' : ''
									}`}
									onClick={() => {
										setActiveSection('staff');
										setShowSidebar(false);
									}}
								>
									Staff Management
								</button>
								<button
									className={`p-2 text-left ${
										activeSection === 'adopter' ? 'bg-gray-300' : ''
									}`}
									onClick={() => {
										setActiveSection('adopter');
										setShowSidebar(false);
									}}
								>
									Adopter Management
								</button>
								<button
									className={`p-2 text-left ${
										activeSection === 'messages' ? 'bg-gray-300' : ''
									}`}
									onClick={() => {
										setActiveSection('messages');
										setShowSidebar(false);
									}}
								>
									Messages
								</button>
							</nav>
						</div>
					)}
					<div className='w-full md:w-3/4 lg:w-4/5 p-4 bg-light'>
						{alertInfo.message && (
							<AlertComponent
								type={alertInfo.type}
								message={alertInfo.message}
								onClose={() => setAlertInfo({ type: '', message: '' })}
							/>
						)}
						<div className='bg-grey p-4 rounded-lg shadow-md'>
							{renderSection()}
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default RescueProfile;
