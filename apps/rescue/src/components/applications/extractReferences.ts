import type { ReferenceCheck } from '../../types/applications';
import type { ApplicationReference } from './applicationReviewTypes';

type ApplicationWithReferences = {
  id: string;
  references?: ApplicationReference[];
};

export const extractReferences = (
  application: ApplicationWithReferences,
  getData: (path: string) => unknown
): ReferenceCheck[] => {
  const allRefs: ReferenceCheck[] = [];
  const directReferences = application?.references || [];

  if (Array.isArray(directReferences) && directReferences.length > 0) {
    directReferences.forEach((ref: ApplicationReference, index: number) => {
      allRefs.push({
        id: ref.id || `ref-${index}`,
        applicationId: application.id,
        type: ref.relationship?.toLowerCase().includes('vet') ? 'veterinarian' : 'personal',
        contactName: ref.name ?? '',
        contactInfo: `${ref.phone} - ${ref.relationship}`,
        status: ref.status || 'pending',
        notes: ref.notes || '',
        completedAt: ref.contacted_at,
        completedBy: ref.contacted_by,
      });
    });
    return allRefs;
  }

  const clientRefs = (getData('references') ?? {}) as Record<string, unknown>;
  const personalRefs = Array.isArray(clientRefs['personal'])
    ? (clientRefs['personal'] as ApplicationReference[])
    : [];
  const vetRef = clientRefs['veterinarian'] as ApplicationReference | undefined;
  let referenceIndex = 0;

  if (vetRef && vetRef.name && vetRef.name !== 'To be determined') {
    allRefs.push({
      id: `ref-${referenceIndex}`,
      applicationId: application.id,
      type: 'veterinarian',
      contactName: vetRef.name,
      contactInfo: `${vetRef.phone || 'No phone'} - ${vetRef.clinicName || 'Veterinarian'}`,
      status: vetRef.status || 'pending',
      notes: vetRef.notes || '',
      completedAt: vetRef.contacted_at,
      completedBy: vetRef.contacted_by,
    });
    referenceIndex++;
  }

  personalRefs.forEach((ref: ApplicationReference) => {
    if (ref.name) {
      allRefs.push({
        id: `ref-${referenceIndex}`,
        applicationId: application.id,
        type: 'personal',
        contactName: ref.name,
        contactInfo: `${ref.phone || 'No phone'} - ${ref.relationship || 'Personal Reference'}`,
        status: ref.status || 'pending',
        notes: ref.notes || '',
        completedAt: ref.contacted_at,
        completedBy: ref.contacted_by,
      });
      referenceIndex++;
    }
  });

  return allRefs;
};
