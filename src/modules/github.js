var Q = require('q');

var Github = function(Headmaster) {
	this.Headmaster = Headmaster;
}

Github.prototype.getBlockingIssues = function() {
	var deferred = Q.defer();

	this.Headmaster.github_issues.list({
		labels: "blocker"
	}, function(err, data) {
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(data);
		}
	});

	return deferred.promise;
}

Github.prototype.getUnassignedVQAIssues = function() {
	var deferred = Q.defer();

	this.Headmaster.github_issues.list({
		milestone: "VQA: Moment View",
		assignee: "none",
	}, function(err, data) {
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(data);
		}
	});

	return deferred.promise;
}

Github.prototype.formatIssue = function(issue) {
	var assigned_to = "[" + issue['assignee']['login'] + "] ";
	var name = "*" + issue['title'] + "* ";
	var url = issue['html_url'];

	return assigned_to + name + url;
}

Github.prototype.sendBlockingIssues = function(channel) {
	var _this = this;
	this.getBlockingIssues()
		.then(function(data) {
			if (data.length == 0) {
				channel.send("Looks like there are currently no open GitHub issues labeled as 'blocker'.");
			} else {
				channel.send("Here are the current GitHub issues labeled as 'blocker'!");
				data.forEach(function(issue){
					channel.send(_this.formatIssue(issue));
				});
			}
		})
		.fail(function(err) {
			console.error(err);
		});
}

module.exports = Github;
