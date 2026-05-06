import Application, {
  ApplicationOutcome,
  ApplicationPriority,
  ApplicationStage,
  ApplicationStatus,
} from '../../models/Application';
import Pet from '../../models/Pet';
import User, { UserType } from '../../models/User';
import { ukFaker } from '../lib/faker-rng';
import { bulkInsert } from '../lib/bulk-insert';

const DEFAULT_APPLICATION_COUNT = 1500;

// Skewed status — most submitted/under-review, fewer approved/rejected.
const STATUS_BAG: ApplicationStatus[] = (() => {
  const bag: ApplicationStatus[] = [];
  for (let i = 0; i < 60; i++) {
    bag.push(ApplicationStatus.SUBMITTED);
  }
  for (let i = 0; i < 20; i++) {
    bag.push(ApplicationStatus.APPROVED);
  }
  for (let i = 0; i < 12; i++) {
    bag.push(ApplicationStatus.REJECTED);
  }
  for (let i = 0; i < 8; i++) {
    bag.push(ApplicationStatus.WITHDRAWN);
  }
  return bag;
})();

const stageFor = (status: ApplicationStatus): ApplicationStage => {
  switch (status) {
    case ApplicationStatus.APPROVED:
    case ApplicationStatus.REJECTED:
      return ApplicationStage.RESOLVED;
    case ApplicationStatus.WITHDRAWN:
      return ApplicationStage.WITHDRAWN;
    default:
      return ukFaker.helpers.arrayElement([
        ApplicationStage.PENDING,
        ApplicationStage.REVIEWING,
        ApplicationStage.VISITING,
        ApplicationStage.DECIDING,
      ]);
  }
};

const outcomeFor = (status: ApplicationStatus): ApplicationOutcome | null => {
  switch (status) {
    case ApplicationStatus.APPROVED:
      return ApplicationOutcome.APPROVED;
    case ApplicationStatus.REJECTED:
      return ApplicationOutcome.REJECTED;
    case ApplicationStatus.WITHDRAWN:
      return ApplicationOutcome.WITHDRAWN;
    default:
      return null;
  }
};

const targetCount = (): number => {
  const raw = process.env.DEMO_APPLICATION_COUNT;
  if (raw === undefined) {
    return DEFAULT_APPLICATION_COUNT;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_APPLICATION_COUNT;
};

export async function seedDemoApplications(): Promise<void> {
  const target = targetCount();
  if (target === 0) {
    return;
  }

  const adopters = await User.findAll({
    paranoid: false,
    where: { userType: UserType.ADOPTER },
    attributes: ['userId'],
  });
  const pets = await Pet.findAll({
    paranoid: false,
    attributes: ['petId', 'rescueId'],
  });

  if (adopters.length === 0 || pets.length === 0) {
    // eslint-disable-next-line no-console
    console.log('⚠️  Need adopters and pets before applications — skipping');
    return;
  }

  const existing = await Application.count({ paranoid: false });
  const toCreate = Math.max(0, target - existing);
  if (toCreate === 0) {
    return;
  }

  const rows = Array.from({ length: toCreate }, () => {
    const status = ukFaker.helpers.arrayElement(STATUS_BAG);
    const stage = stageFor(status);
    const finalOutcome = outcomeFor(status);
    const submitted = ukFaker.date.past({ years: 1 });
    const isResolved = stage === ApplicationStage.RESOLVED || stage === ApplicationStage.WITHDRAWN;
    const resolvedAt = isResolved
      ? ukFaker.date.between({ from: submitted, to: new Date() })
      : null;
    const pet = ukFaker.helpers.arrayElement(pets);

    return {
      applicationId: ukFaker.string.uuid(),
      userId: ukFaker.helpers.arrayElement(adopters).userId,
      petId: pet.petId,
      rescueId: pet.rescueId,
      status,
      priority: ukFaker.helpers.arrayElement([
        ApplicationPriority.LOW,
        ApplicationPriority.NORMAL,
        ApplicationPriority.NORMAL,
        ApplicationPriority.NORMAL,
        ApplicationPriority.HIGH,
      ]),
      stage,
      finalOutcome,
      reviewStartedAt:
        stage !== ApplicationStage.PENDING
          ? ukFaker.date.between({ from: submitted, to: resolvedAt ?? new Date() })
          : null,
      resolvedAt,
      withdrawalReason:
        finalOutcome === ApplicationOutcome.WITHDRAWN ? 'Personal circumstances changed' : null,
      rejectionReason:
        finalOutcome === ApplicationOutcome.REJECTED
          ? ukFaker.helpers.arrayElement([
              'Living situation not suitable',
              'Insufficient experience for this pet',
              'Reference check inconclusive',
            ])
          : null,
      documents: [],
      submittedAt: submitted,
      score: ukFaker.number.int({ min: 50, max: 100 }),
      tags: ukFaker.helpers.arrayElements(['priority-review', 'first-time', 'returning'], {
        min: 0,
        max: 2,
      }),
      createdAt: submitted,
      updatedAt: resolvedAt ?? submitted,
    };
  });

  await bulkInsert(Application, rows);

  // eslint-disable-next-line no-console
  console.log(`✅ Inserted ${rows.length} faker-generated applications (target ${target})`);
}
