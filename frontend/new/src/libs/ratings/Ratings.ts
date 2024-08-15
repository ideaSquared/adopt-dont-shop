export type RatingType = 'LIKE' | 'LOVE' | 'DISLIKE';

export interface Rating {
	pet_id: string;
	user_id: string;
	type: RatingType;
	timestamp: Date;
}
