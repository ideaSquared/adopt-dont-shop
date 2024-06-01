import React from 'react';
import RescueProfileForm from '../../../components/forms/RescueProfileForm';
import RescueProfileHeader from './RescueProfileHeader';
import RescueService from '../../../services/RescueService';

const RescueSettings = ({
	rescueProfile,
	setRescueProfile,
	canEditRescueInfo,
}) => {
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
			// Optionally, fetch the updated profile here if not done automatically after update
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
			// Update local state based on verificationResult
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

			// Refresh the profile to get updated verification status
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
};

export default RescueSettings;
