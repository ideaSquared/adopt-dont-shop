import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RescueService from '../services/RescueService';
import { Rescue } from '../types/rescue';

interface AuthState {
	isRescue: boolean;
	userId: string;
	userPermissions: string[];
}

const useRescueProfile = (authState: AuthState) => {
	const [rescueProfile, setRescueProfile] = useState<Rescue | null>(null);
	const [alertInfo, setAlertInfo] = useState<{
		type: string;
		message: string;
	} | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const initFetch = async () => {
			try {
				const profileData = await RescueService.fetchRescueProfile();
				setRescueProfile(profileData);
			} catch (error: unknown) {
				if (
					error instanceof Error &&
					'response' in error &&
					(error as any).response.status === 401
				) {
					navigate('/logout');
				} else {
					setAlertInfo({
						type: 'danger',
						message: 'Failed to load rescue profile. Please try again later.',
					});
				}
			}
		};

		if (authState.isRescue) {
			initFetch();
		}
	}, [authState.isRescue, navigate]);

	return { rescueProfile, alertInfo };
};

export default useRescueProfile;
