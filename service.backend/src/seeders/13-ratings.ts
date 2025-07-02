import Rating from '../models/Rating';

const ratingData = [
  {
    rating_id: 'rating_001',
    reviewer_id: 'user_adopter_002', // Emily Davis (adopted Whiskers)
    reviewee_id: 'user_rescue_admin_001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440003',
    rating_type: 'rescue',
    category: 'overall',
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
    rating_id: 'rating_002',
    reviewer_id: 'user_rescue_admin_001',
    reviewee_id: 'user_adopter_002',
    rescue_id: '550e8400-e29b-41d4-a716-446655440003',
    rating_type: 'user',
    category: 'overall',
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
    rating_id: 'rating_003',
    reviewer_id: 'user_adopter_003', // Michael Brown (interested in Rocky)
    reviewee_id: 'user_rescue_admin_002',
    rescue_id: '550e8400-e29b-41d4-a716-446655440002',
    rating_type: 'rescue',
    category: 'communication',
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
    rating_id: 'rating_004',
    reviewer_id: 'user_adopter_001', // John Smith (interested in Buddy)
    reviewee_id: 'user_rescue_staff_001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    rating_type: 'rescue',
    category: 'process',
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
    rating_id: 'rating_005',
    reviewer_id: 'user_admin_001', // Admin review of a rescue
    reviewee_id: 'user_rescue_admin_001',
    rescue_id: '550e8400-e29b-41d4-a716-446655440001',
    rating_type: 'rescue',
    category: 'care',
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
      where: { rating_id: rating.rating_id },
      defaults: rating,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${ratingData.length} ratings and reviews`);
}
