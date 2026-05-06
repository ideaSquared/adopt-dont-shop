import {
  SEEDED_PASSWORD,
  getAdminUsers,
  getAdopterUsers,
  getAllDevUsers,
  getDevUsersByType,
  getRescueUsers,
  seededDevUsers,
} from './seededUsers';

describe('seeded dev users data', () => {
  it('exposes a non-empty seeded user list with the canonical dev password', () => {
    expect(seededDevUsers.length).toBeGreaterThan(0);
    expect(SEEDED_PASSWORD).toBe('DevPassword123!');
  });

  it('every seeded user has the fields DevPanel renders', () => {
    for (const user of seededDevUsers) {
      expect(user.userId).toMatch(/^user_/);
      expect(user.email).toMatch(/.+@.+/);
      expect(user.firstName.length).toBeGreaterThan(0);
      expect(user.lastName.length).toBeGreaterThan(0);
      expect(user.userType.length).toBeGreaterThan(0);
    }
  });

  it('partitions users by role with no overlap between admin/rescue/adopter buckets', () => {
    const adminEmails = new Set(getAdminUsers().map((u) => u.email));
    const rescueEmails = new Set(getRescueUsers().map((u) => u.email));
    const adopterEmails = new Set(getAdopterUsers().map((u) => u.email));

    for (const email of rescueEmails) {
      expect(adminEmails.has(email)).toBe(false);
    }
    for (const email of adopterEmails) {
      expect(adminEmails.has(email)).toBe(false);
      expect(rescueEmails.has(email)).toBe(false);
    }

    expect(adminEmails.size + rescueEmails.size + adopterEmails.size).toBe(getAllDevUsers().length);
  });

  it('getDevUsersByType filters strictly by the supplied user types', () => {
    const onlyAdopters = getDevUsersByType(['adopter']);
    expect(onlyAdopters.length).toBeGreaterThan(0);
    for (const user of onlyAdopters) {
      expect(user.userType).toBe('adopter');
    }

    const empty = getDevUsersByType(['nonexistent_role']);
    expect(empty).toEqual([]);
  });
});
