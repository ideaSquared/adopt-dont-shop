import React from 'react';
import { Rescue } from '../../types/rescue';
import RescueProfileForm from '../../components/forms/RescueProfileForm';
import SettingsHeader from './SettingsHeader';
import { useRescueSettings } from '../../hooks/useRescueSettings';

interface SettingsProps {
  rescueProfile: Rescue | null;
}

const Settings: React.FC<SettingsProps> = ({ rescueProfile }) => {
  if (!rescueProfile) {
    return <p>Rescue profile not available.</p>;
  }

  const { rescueProfile: profile, alertInfo, handleRescueInfoChange, saveUpdates, handleReferenceNumberSubmit } =
    useRescueSettings({ initialProfile: rescueProfile });

  return (
    <div>
      <h2 className="text-xl mb-4">Settings</h2>
      {alertInfo && (
        <div className={`alert alert-${alertInfo.type}`}>
          {alertInfo.message}
        </div>
      )}
      <SettingsHeader rescueProfile={profile} />
      <RescueProfileForm
        rescueProfile={profile}
        handleRescueInfoChange={handleRescueInfoChange}
        handleReferenceNumberSubmit={handleReferenceNumberSubmit}
        canEditRescueInfo={true} // Assume the user has permission to edit; adjust as necessary
        saveUpdates={saveUpdates}
      />
    </div>
  );
};

export default Settings;
