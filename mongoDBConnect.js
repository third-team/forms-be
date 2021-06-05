const mongoose = require('mongoose');

function connectDB() {
	let connectionString = '';

	if (process.env.NODE_ENV === 'development') {
		if (process.env.testing) {
			connectionString = process.env.MONGODB_LOCAL_TESTING_CONNECTION_URL;
		} else {
			connectionString = process.env.MONGODB_LOCAL_CONNECTION_URL;
		}
	} else {
		// eslint-disable-next-line no-lonely-if
		if (process.env.testing) {
			connectionString = process.env.MONGODB_TESTING_CONNECTION_URL;
		} else {
			connectionString = process.env.MONGODB_CONNECTION_URL;
		}
	}

	console.log('connecting to: ', connectionString);

	// process.env.NODE_ENV === 'development'
	// 		? /*process.env.MONGODB_TESTING_CONNECTION_URL*/
	// 		  process.env.testing === 'true'
	// 			? process.env.MONGODB_LOCAL_TESTING_CONNECTION_URL
	// 			: process.env.MONGODB_LOCAL_CONNECTION_URL
	// 		: process.env.MONGODB_CONNECTION_URL

	return mongoose
		.connect(connectionString, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})
		.then(() => {
			console.log('MongoDB connected!');
			mongoose.connection.on('disconnected', () => {
				console.log('MongoDB disconnected!');
			});
		})
		.catch((err) => {
			console.log('error:', err);
			if (err) {
				console.log('Error occured while connecting to mongodb:', err.message);
				console.log('MongoDB is not connected!');
				throw new Error('MongoDB is not connected!');
			}
		});
}

function disconnectDB() {
	return mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
