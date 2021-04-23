const mongoose = require('mongoose');

module.exports = function () {
	mongoose.connect(
		process.env.MONGODB_CONNECTION_URL,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
		(err) => {
			if (err) {
				console.log('Error occured while connecting to mongodb:', err.message);
				console.log('MongoDB is not connected!');
				throw new Error('MongoDB is not connected!');
			} else {
				console.log('MongoDB connected...');
			}
		}
	);
};
