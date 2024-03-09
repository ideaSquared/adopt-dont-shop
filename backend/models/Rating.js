import mongoose from 'mongoose';

const ratingSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
	targetId: {
		type: Schema.Types.ObjectId,
		required: true,
		refPath: 'onModel',
	},
	targetType: { type: String, required: true, enum: ['pet', 'user'] },
	ratingSource: { type: String, required: true, enum: ['rescue', 'user'] },
	ratingType: { type: String, required: true, default: 'like' },
	onModel: {
		type: String,
		required: true,
		enum: ['Pet', 'User'],
	},
});

export default mongoose.model('Rating', ratingSchema);
