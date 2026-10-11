import { findActiveApplicationForPet } from './active-application';

describe('findActiveApplicationForPet', () => {
  const PET = 'pet-1';

  it('returns the in-flight application for the pet being applied to', () => {
    const apps = [
      { id: 'a1', petId: PET, status: 'submitted' },
      { id: 'a2', petId: 'pet-2', status: 'submitted' },
    ];
    expect(findActiveApplicationForPet(apps, PET)?.id).toBe('a1');
  });

  it("ignores the adopter's active applications for other pets", () => {
    const apps = [{ id: 'a2', petId: 'pet-2', status: 'approved' }];
    expect(findActiveApplicationForPet(apps, PET)).toBeUndefined();
  });

  it('lets the adopter re-apply after a withdrawn or rejected application', () => {
    const apps = [
      { id: 'a1', petId: PET, status: 'withdrawn' },
      { id: 'a3', petId: PET, status: 'rejected' },
    ];
    expect(findActiveApplicationForPet(apps, PET)).toBeUndefined();
  });
});
