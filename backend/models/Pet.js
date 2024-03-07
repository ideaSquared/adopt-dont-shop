const mongoose = require('mongoose');

const petSchema = new Schema({
	petName: { type: String, required: true },
	ownerId: { type: Schema.Types.ObjectId, required: true, ref: 'Rescue' },
	shortDescription: { type: String, required: true },
	longDescription: { type: String, required: true },
	age: { type: Number, required: true },
	gender: { type: String, required: true },
	status: { type: String, required: true },
	images: [{ type: String }],
	characteristics: {
		common: {
			vaccination_status: { type: String, required: true },
			temperament: { type: String, required: true },
			size: { type: String, required: true },
		},
		specific: {
			breed: { type: String, required: true },
			activity_level: { type: String, required: true },
			intelligence_level: { type: String, required: true },
		},
	},
	archived: { type: Boolean, required: true, default: false },
});

module.exports = mongoose.model('Pet', petSchema);
