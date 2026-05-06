import { Rating, RatingCategory, RatingType } from '../../models/Rating';
import Rescue from '../../models/Rescue';
import User, { UserType } from '../../models/User';
import { ukFaker } from '../lib/faker-rng';
import { bulkInsert } from '../lib/bulk-insert';

const DEFAULT_RATING_COUNT = 400;

const targetCount = (): number => {
  const raw = process.env.DEMO_RATING_COUNT;
  if (raw === undefined) {
    return DEFAULT_RATING_COUNT;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_RATING_COUNT;
};

// Real review distributions are bimodal — mostly 4-5 stars, a long tail of
// 1-3 star reviews from disappointed adopters.
const SCORE_BAG = [5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 2, 1];

export async function seedDemoRatings(): Promise<void> {
  const target = targetCount();
  if (target === 0) {
    return;
  }

  const adopters = await User.findAll({
    paranoid: false,
    where: { userType: UserType.ADOPTER },
    attributes: ['userId'],
  });
  const rescues = await Rescue.findAll({ paranoid: false, attributes: ['rescueId'] });

  if (adopters.length === 0 || rescues.length === 0) {
    // eslint-disable-next-line no-console
    console.log('⚠️  Need adopters + rescues for ratings — skipping');
    return;
  }

  const existing = await Rating.count();
  const toCreate = Math.max(0, target - existing);
  if (toCreate === 0) {
    return;
  }

  const rows = Array.from({ length: toCreate }, () => {
    const score = ukFaker.helpers.arrayElement(SCORE_BAG);
    const created = ukFaker.date.past({ years: 1 });
    return {
      rating_id: ukFaker.string.uuid(),
      reviewer_id: ukFaker.helpers.arrayElement(adopters).userId,
      rescue_id: ukFaker.helpers.arrayElement(rescues).rescueId,
      rating_type: RatingType.RESCUE,
      category: ukFaker.helpers.arrayElement([
        RatingCategory.OVERALL,
        RatingCategory.COMMUNICATION,
        RatingCategory.PROCESS,
        RatingCategory.CARE,
      ]),
      score,
      title:
        score >= 4
          ? ukFaker.helpers.arrayElement([
              'Wonderful experience',
              'Highly recommend',
              'Amazing rescue',
              'Could not be happier',
            ])
          : ukFaker.helpers.arrayElement([
              'Mixed feelings',
              'Slow to respond',
              'Process was difficult',
            ]),
      review_text: ukFaker.lorem.paragraph({ min: 2, max: 4 }),
      helpful_count: ukFaker.number.int({ min: 0, max: 30 }),
      reported_count: 0,
      is_verified: ukFaker.datatype.boolean({ probability: 0.6 }),
      is_anonymous: ukFaker.datatype.boolean({ probability: 0.15 }),
      is_featured: false,
      is_moderated: false,
      created_at: created,
      updated_at: created,
    };
  });

  await bulkInsert(Rating, rows);

  // eslint-disable-next-line no-console
  console.log(`✅ Inserted ${rows.length} faker-generated ratings (target ${target})`);
}
