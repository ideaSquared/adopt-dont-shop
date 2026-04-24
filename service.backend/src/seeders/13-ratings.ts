import Rating, { RatingCategory, RatingType } from '../models/Rating';

const ratingData = [
  {
    rating_id: '52846a26-7de2-406f-a826-6ebcac14ccaf',
    reviewer_id: 'fc369713-6925-4f02-a5c6-cb84b3652116', // Emily Davis (adopted Whiskers)
    reviewee_id: '3d7065c5-82a3-4bba-a84e-78229365badd',
    rescue_id: '550e8400-e29b-41d4-a716-446655440003',
    rating_type: RatingType.RESCUE,
    category: RatingCategory.OVERALL,
    score: 5,
    review_text:
      'The entire adoption process was wonderful! The rescue staff was knowledgeable, caring, and made sure Whiskers and I were a perfect match. They provided excellent support during the transition period.',
    is_verified: true,
    helpful_count: 12,
    reported_count: 0,
    created_at: new Date('2024-02-22T14:30:00Z'),
    updated_at: new Date('2024-02-22T14:30:00Z'),
  },
  {
    rating_id: '27b6dc7a-cc4a-418c-ad7f-ac1a75f4884b',
    reviewer_id: '3d7065c5-82a3-4bba-a84e-78229365badd',
    reviewee_id: 'fc369713-6925-4f02-a5c6-cb84b3652116',
    rescue_id: '550e8400-e29b-41d4-a716-446655440003',
    rating_type: RatingType.USER,
    category: RatingCategory.OVERALL,
    score: 5,
    review_text:
      'Emily was an exceptional adopter. Her experience with senior cats and dedication to providing the best care made her the perfect match for Whiskers. Highly recommend her as an adopter.',
    is_verified: true,
    helpful_count: 5,
    reported_count: 0,
    created_at: new Date('2024-02-22T15:00:00Z'),
    updated_at: new Date('2024-02-22T15:00:00Z'),
  },
  {
    rating_id: 'c5dba26d-bf16-42eb-ae98-de43f2950e95',
    reviewer_id: 'c8973ffc-6e31-44fb-a3e4-fa3d9e8edb30', // Michael Brown (interested in Rocky)
    reviewee_id: 'c283bd85-11ce-4494-add0-b06896d38e2d',
    rescue_id: '550e8400-e29b-41d4-a716-446655440002',
    rating_type: RatingType.RESCUE,
    category: RatingCategory.COMMUNICATION,
    score: 5,
    review_text:
      'Even though my application is still in process, I want to commend Happy Tails Rescue for their thorough and caring approach. They really know their dogs and are committed to finding the right matches.',
    is_verified: false,
    helpful_count: 8,
    reported_count: 0,
    created_at: new Date('2024-02-21T10:15:00Z'),
    updated_at: new Date('2024-02-21T10:15:00Z'),
  },
  {
    rating_id: '508e38a4-14b1-47b0-aebe-575fc4b8ba7d',
    reviewer_id: '98915d9e-69ed-46b2-a897-57d8469ff360', // John Smith (interested in Buddy)
    reviewee_id: '378118eb-9e97-4940-adeb-0a53b252b057',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    rating_type: RatingType.RESCUE,
    category: RatingCategory.PROCESS,
    score: 4,
    review_text:
      'The communication has been great so far. Sarah is very responsive and knowledgeable about the dogs. The application process is thorough but fair. Looking forward to hopefully adopting Buddy!',
    is_verified: false,
    helpful_count: 6,
    reported_count: 0,
    created_at: new Date('2024-02-20T11:30:00Z'),
    updated_at: new Date('2024-02-20T11:30:00Z'),
  },
  {
    rating_id: 'cc97df57-2829-4b76-a035-7d8ee0ba5513',
    reviewer_id: '0cbbd913-c94c-4254-a028-81b76df89c9f', // Admin review of a rescue
    reviewee_id: '3d7065c5-82a3-4bba-a84e-78229365badd',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    rating_type: RatingType.RESCUE,
    category: RatingCategory.CARE,
    score: 5,
    review_text:
      'Paws Rescue Austin consistently provides excellent care for their animals and maintains high standards for adoptions. They are a model rescue organization.',
    is_verified: true,
    helpful_count: 15,
    reported_count: 0,
    created_at: new Date('2024-02-10T09:00:00Z'),
    updated_at: new Date('2024-02-10T09:00:00Z'),
  },
];

export async function seedRatings() {
  for (const rating of ratingData) {
    await Rating.findOrCreate({
      paranoid: false,
      where: { rating_id: rating.rating_id },
      defaults: rating,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${ratingData.length} ratings and reviews`);
}
