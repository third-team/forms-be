const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
	},
	password: {
		type: String,
		required: true,
	},
});

userSchema.pre('save', async function (next) {
	if (!this.isModified('password')) {
		return next();
	}
	this.password = await bcrypt.hash(
		this.password,
		+process.env.BCRYPT_SALT_ROUNDS
	);

	return next();
});

userSchema.methods.comparePassword = function (plainText, cb) {
	return bcrypt.compare(plainText, this.password, cb);
};

userSchema.methods.comparePassword = function (plainText) {
	return new Promise((resolve, reject) => {
		bcrypt.compare(plainText, this.password, (err, same) => {
			if (err) {
				reject(err);
			}

			resolve(same);
		});
	});
};

module.exports = mongoose.model('User', userSchema);
