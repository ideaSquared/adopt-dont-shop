import StaffMember from '../../models/StaffMember';
import User, { UserStatus, UserType } from '../../models/User';
import Rescue from '../../models/Rescue';
import { hashPassword } from '../../utils/password';
import { ukFaker } from '../lib/faker-rng';
import { bulkInsert } from '../lib/bulk-insert';

const DEFAULT_STAFF_COUNT = 60;
const DEMO_PASSWORD = 'DevPassword123!';

const targetCount = (): number => {
  const raw = process.env.DEMO_STAFF_COUNT;
  if (raw === undefined) {
    return DEFAULT_STAFF_COUNT;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_STAFF_COUNT;
};

export async function seedDemoStaff(): Promise<void> {
  const target = targetCount();
  if (target === 0) {
    return;
  }

  const rescues = await Rescue.findAll({ paranoid: false, attributes: ['rescueId'] });
  if (rescues.length === 0) {
    // eslint-disable-next-line no-console
    console.log('⚠️  No rescues to attach staff to — skipping demo staff');
    return;
  }

  const existingStaffCount = await StaffMember.count({ paranoid: false });
  const toCreate = Math.max(0, target - existingStaffCount);
  if (toCreate === 0) {
    return;
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // First create user rows for the new staff, then create staff_member rows
  // linking them round-robin to the available rescues. addedBy / verifiedBy
  // reference real-but-arbitrary user_ids — pick the first existing user.
  const firstUser = await User.findOne({ paranoid: false, attributes: ['userId'] });
  if (!firstUser) {
    // eslint-disable-next-line no-console
    console.log('⚠️  No users in DB — skipping demo staff');
    return;
  }
  const addedBy = firstUser.userId;

  const staffUserRows = Array.from({ length: toCreate }, () => {
    const firstName = ukFaker.person.firstName();
    const lastName = ukFaker.person.lastName();
    const slug = ukFaker.string.alphanumeric({ length: 6, casing: 'lower' });
    const created = ukFaker.date.past({ years: 2 });
    return {
      userId: ukFaker.string.uuid(),
      firstName,
      lastName,
      email: `${firstName}.${lastName}+${slug}@staff.demo.test`.toLowerCase(),
      password: passwordHash,
      phoneNumber: ukFaker.phone.number({ style: 'national' }),
      userType: UserType.RESCUE_STAFF,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      country: 'GB',
      city: ukFaker.location.city(),
      timezone: 'Europe/London',
      language: 'en',
      termsAcceptedAt: created,
      privacyPolicyAcceptedAt: created,
      loginAttempts: 0,
      createdAt: created,
      updatedAt: created,
    };
  });

  await bulkInsert(User, staffUserRows);

  const staffRows = staffUserRows.map((u, idx) => {
    const rescue = rescues[idx % rescues.length];
    const addedAt = ukFaker.date.between({ from: u.createdAt, to: new Date() });
    const verified = ukFaker.datatype.boolean({ probability: 0.85 });
    return {
      staffMemberId: ukFaker.string.uuid(),
      rescueId: rescue.rescueId,
      userId: u.userId,
      title: ukFaker.helpers.arrayElement([
        'Volunteer',
        'Foster Coordinator',
        'Adoption Counsellor',
        'Veterinary Technician',
        'Operations Lead',
        'Trustee',
      ]),
      isVerified: verified,
      verifiedBy: verified ? addedBy : undefined,
      verifiedAt: verified ? ukFaker.date.between({ from: addedAt, to: new Date() }) : undefined,
      addedBy,
      addedAt,
      createdAt: addedAt,
      updatedAt: addedAt,
    };
  });

  await bulkInsert(StaffMember, staffRows);

  // eslint-disable-next-line no-console
  console.log(
    `✅ Inserted ${staffRows.length} faker-generated rescue staff (target ${target}) across ${rescues.length} rescues`
  );
}
