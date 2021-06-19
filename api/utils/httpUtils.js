const queryString = require('querystring');

function getQuery(url) {
	const queryStartIndex = url.indexOf('?');
	if (queryStartIndex === -1) return {};
	return queryString.decode(url.substr(queryStartIndex + 1));
}

function respondWith500(ctx) {
	ctx.status = 500;
	ctx.body = { message: 'Internal server error!' };
}

module.exports = {
	getQuery,
	respondWith500,
};
