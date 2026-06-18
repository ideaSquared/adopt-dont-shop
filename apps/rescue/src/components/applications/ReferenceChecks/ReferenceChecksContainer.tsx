import React, { useEffect } from 'react';
import type { ReferenceCheck } from '../../../types/applications';
import { useReferenceChecks } from './useReferenceChecks';
import { ReferenceChecks } from './ReferenceChecks';

type ReferenceChecksContainerProps = {
  references: ReferenceCheck[];
  referencesError?: string | null;
  applicationId: string;
  onReferenceUpdate: (referenceId: string, status: string, notes?: string) => void;
};

export const ReferenceChecksContainer: React.FC<ReferenceChecksContainerProps> = ({
  references,
  referencesError,
  applicationId,
  onReferenceUpdate,
}) => {
  const {
    referenceUpdates,
    handleReferenceUpdate,
    toggleReferenceForm,
    updateReferenceField,
    resetReferenceUpdates,
  } = useReferenceChecks({ onReferenceUpdate });

  useEffect(() => {
    resetReferenceUpdates();
  }, [applicationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ReferenceChecks
      references={references}
      referencesError={referencesError}
      referenceUpdates={referenceUpdates}
      onToggleForm={toggleReferenceForm}
      onUpdateField={updateReferenceField}
      onUpdateReference={handleReferenceUpdate}
    />
  );
};
