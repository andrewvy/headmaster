var Q = require('q');

var Github = function(Headmaster) {
	this.Headmaster = Headmaster;
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

Github.prototype.sendIssuesWithLabels = function(channel, labels) {
	var _this = this;
	var labels = labels.join(',');

	this.getIssuesWithLabel(labels)
		.then(function(data) {
			if (data.length == 0) {
				channel.send("Looks like there are currently no open GitHub issues with the labels: " + labels);
			} else {
				channel.send("Here are the current GitHub issues labeled as: " + labels);
				data.forEach(function(issue){
					channel.send(_this.formatIssue(issue));
				});
			}
		})
		.fail(function(err) {
			console.error(err);
		});
}

// --------------------
// GitHub API Methods
// --------------------

Github.prototype.getBlockingIssues = function() {
	var deferred = Q.defer();

	this.Headmaster.github_client.issues.repoIssues({
		labels: "blocker",
		repo: this.Headmaster.config.github_repo,
		user: this.Headmaster.config.github_organization_name
	}, function(err, data) {
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(data);
		}
	});

	return deferred.promise;
}

Github.prototype.getIssuesWithLabel = function(labels) {
	var deferred = Q.defer();

	this.Headmaster.github_issues.list({
		labels: labels
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

module.exports = Github;
