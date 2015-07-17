var Q = require('q');
var Wit = require('node-wit');

var NaturalLanguage = function(Headmaster) {
	this.Headmaster = Headmaster;
	this.api_token = Headmaster.config.wit_api_token;
}

NaturalLanguage.prototype.getMessageIntent = function(message) {
	var deferred = Q.defer();

	Wit.captureTextIntent(
		this.api_token,
		message,
		function(err, res) {
			if (err) deferred.reject(err);
			if (res.outcomes.length == 0) deferred.reject();
			if (res.outcomes[0].confidence < 0.5) deferred.reject();

			var bestIntent = res.outcomes[0].intent;
			deferred.resolve(bestIntent);
		}
	);

	return deferred.promise;
}


module.exports = NaturalLanguage;
