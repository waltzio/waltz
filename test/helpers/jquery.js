var deferred = require('JQDeferred')

module.exports = {
	Deferred: deferred,
	when: deferred.when,
	get: function() { return JSON.stringify({message: "message"}); }
}