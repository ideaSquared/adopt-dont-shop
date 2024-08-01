// src/types/ratingsTable.d.ts

import { Rating } from './rating';

export interface RatingsTableProps {
	filteredRatings: Rating[];
	onCreateConversation: (petId: string, userId: string) => void;
}
