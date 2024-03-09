// User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
	firstName: String,
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	resetToken: String,
	resetTokenExpiration: Date,
	isAdmin: { type: Boolean, default: false },
});

export default mongoose.model('User', userSchema);
