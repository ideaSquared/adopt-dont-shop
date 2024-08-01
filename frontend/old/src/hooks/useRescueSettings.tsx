import { useState, ChangeEvent } from 'react';
import RescueService from '../services/RescueService';
import { Rescue } from '../types/rescue';

interface UseRescueSettingsProps {
  initialProfile: Rescue;
}

export const useRescueSettings = ({ initialProfile }: UseRescueSettingsProps) => {
  const [rescueProfile, setRescueProfile] = useState<Rescue>(initialProfile);
  const [alertInfo, setAlertInfo] = useState<{ type: string; message: string } | null>(null);

  const handleRescueInfoChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement> | string) => {
    if (typeof e === 'string') {
      setRescueProfile((prev) => ({
        ...prev,
        country: e,
      }));
    } else {
      const { name, value } = e.target;
      setRescueProfile((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const saveUpdates = async () => {
    try {
      await RescueService.updateRescueProfile(rescueProfile.rescue_id, rescueProfile);
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
      const verificationResult = await RescueService.submitReferenceNumberForVerification(
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

      // Refresh the profile to get updated verification status
      const profileData = await RescueService.fetchRescueProfile();
      setRescueProfile(profileData);
    } catch (error) {
      setAlertInfo({
        type: 'danger',
        message: 'Error submitting reference number for verification. Please try again later.',
      });
    }
  };

  return {
    rescueProfile,
    alertInfo,
    handleRescueInfoChange,
    saveUpdates,
    handleReferenceNumberSubmit,
  };
};
