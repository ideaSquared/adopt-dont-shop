// User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	resetToken: String,
	resetTokenExpiration: Date,
	isAdmin: { type: Boolean, default: false },
});

module.exports = mongoose.model('User', userSchema);
