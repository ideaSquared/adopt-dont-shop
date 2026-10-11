type ApplicationSummary = { id: string; petId: string; status: string };

const CLOSED_STATUSES = new Set(['withdrawn', 'rejected']);

/**
 * The adopter's in-flight application for `petId`, if any. The applications
 * list is not filtered by pet server-side, so match on petId here — an active
 * application for a different pet must not block applying to this one.
 */
export const findActiveApplicationForPet = <T extends ApplicationSummary>(
  applications: readonly T[],
  petId: string
): T | undefined => applications.find(a => a.petId === petId && !CLOSED_STATUSES.has(a.status));
