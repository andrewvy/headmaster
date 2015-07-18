var querystring = require('querystring');
var http = require('http');
var Q = require('q');
var _ = require('lodash');

var Ansible = function(Headmaster) {
	this.Headmaster = Headmaster;
	this.api_url = this.Headmaster.config.ansible_url;
	this.api_username = this.Headmaster.config.ansible_username;
	this.api_password = this.Headmaster.config.ansible_password;

	this.param_defaults = {
		format: 'json'
	};
}

Ansible.prototype.buildApi = function(endpoint, opts) {
	var params = this.buildParams(opts);
	var query = querystring.stringify(params);
	return endpoint + '?' + query;
}

Ansible.prototype.buildParams = function(params) {
	return _.defaults(params, this.param_defaults);
}

Ansible.prototype.makeRequest = function(endpoint, params) {
	var deferred = Q.defer();

	var options = {
		auth: this.api_username + ":" + this.api_password,
		host: this.api_url,
		path: this.buildApi(endpoint, params)
	};

	http.get(options, function(res) {
		res.setEncoding('utf8');

		var body = '';
		res.on('data', function(d) {
			body += d;
		});

		res.on('end', function() {
			try {
				var parsed = JSON.parse(body);
			} catch (err) {
				return deferred.reject(err);
			}

			if (parsed) deferred.resolve(parsed);
		});
	}).on('error', function(err) {
		deferred.reject(err);
	});

	return deferred.promise;
}

Ansible.prototype.getBranchFromBox = function(channel, user, instance) {
	var instance_prefix = "Staging "
	var instance_name = _.capitalize(_.camelCase(instance));

	if (instance_name == "Staging") {
		var instance_full = "Deploy " + instance_name;
	} else {
		var instance_full = instance_prefix + instance_name;
	}

	this.makeRequest('/api/v1/jobs/', { name: instance_full }).done(function(data) {
		var job = _.last(data['results']);
		if (job) {
			try {
				var params = JSON.parse(job['extra_vars']);
			} catch (err) {
				return channel.send(":cry: Error parsing _" + instance_full + "_ for the branch name.");
			}

			if (job['finished']) {
				channel.send("The current branch on _" + instance_full + "_ is: " + "`" + params.branch + "`");
			} else {
				channel.send("_" + instance_full + "_ is currently being deployed with branch: " + "`" + params.branch + "`");
			}
		} else {
			channel.send(":cry: I couldn't find the last job for: " + instance_name);
		}
	}).fail(function(error) {
		channel.send(":cry: I couldn't find the last job for: " + instance_name);
	});
}

module.exports = Ansible;
