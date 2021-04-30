const mongoose = require('mongoose');

function connectDB() {
	mongoose.connect(
		process.env.NODE_ENV === 'development'
			? process.env.MONGODB_TESTING_CONNECTION_URL
			: process.env.MONGODB_CONNECTION_URL,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
		(err) => {
			if (err) {
				console.log('Error occured while connecting to mongodb:', err.message);
				console.log('MongoDB is not connected!');
				throw new Error('MongoDB is not connected!');
			}
			console.log('MongoDB connected!');
			mongoose.connection.on('disconnected', () => {
				console.log('MongoDB disconnected!');
			});
		}
	);
}

function disconnectDB() {
	return mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
