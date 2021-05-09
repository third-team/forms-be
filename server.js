require('dotenv').config();
const { connectDB } = require('./mongoDBConnect');
const app = require('./app');

const PORT = process.env.PORT || 3000;

connectDB();

module.exports = app.listen(PORT, () => {
	console.log(`listening on 127.0.0.1:${PORT}...`);
});
