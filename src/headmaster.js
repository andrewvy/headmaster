'use strict';

var Slack = require("slack-client");
var Commands = require("./commands");
var mongoose = require("mongoose");
var promfig = require("promfig");
var configurate = require("configurate");
var schedule = require('node-schedule');
var Github = require('github-api');
var Q = require('q');

var Headmaster = function() {
	var _this = this;

	var properties = {
		slack_token: "Please enter your Slack Bot API Token: ",
		slack_group: "Please enter the name of the slack group: ",
		github_username: "Please enter your GitHub username: ",
		github_api_token: "Please enter your GitHub Personal Access Token: ",
		github_organization_name: "Please enter in your main GitHub organization name: ",
		github_repo: "Please enter in your main GitHub repo name: "
	};

	var edit = promfig.bind(null, properties);

	configurate({
		configFile: 'config.js',
		configDir: __dirname,
		edit: edit
	}, function (err, config, configPath) {

		console.log("Loading configuration file found at: " + configPath);

		if (!config.slack_token) {
			console.error("No slack_token specified in options.");
		}

		_this.mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || "mongodb://localhost/headmaster";
		_this.slack_token = config.slack_token;
		_this.channel = null;
		_this.slack_group = config.slack_group;

		_this._nextUserDMHandlers = []

		// Setup Commands
		_this.commands = new Commands(_this);

		// Connect to DB
		mongoose.connect(_this.mongoUri);

		// Connect to Slack, setup listeners, and join channel
		_this.slack = new Slack(_this.slack_token, true, true);

		// Connect to GitHub, setup authorization
		_this.github = new Github({
			token: config.github_api_token,
			auth: "oauth"
		});

		_this.github_repo = _this.github.getRepo(config.github_organization_name, config.github_repo);
		_this.github_issues = _this.github.getIssues(config.github_organization_name, config.github_repo);

		_this.startListeners();

		// Initialize CRON
		_this.startCron();
	});
}

Headmaster.prototype.startListeners = function() {
	var _this = this;

	this.slack.on("open", function() {
		_this.handleOpen();
	});

	this.slack.on("message", function(message) {
		_this.handleMessage(message);
	});

	this.slack.login();
}

Headmaster.prototype.handleOpen = function() {
	var _this = this;

	// Any logic to handle when first connecting to slack

	this.channel = this.getGroup();

	if (this.channel) {
		this.sendBlockingIssues();
	} else {
		console.error("Please create and invite the bot to the slack channel: #" + this.slack_group);
		this.shutdown();
	}
}

Headmaster.prototype.getChannel = function() {
	var _this = this;
	var is_member_channels = [];
	var channel = null;

	Object.keys(this.slack.channels).forEach(function(key) {
		if (_this.slack.channels[key].is_member == true) {
			is_member_channels.push(_this.slack.channels[key]);

			if (_this.slack.channels[key].name == _this.slack_channel) {
				channel = _this.slack.channels[key];
			}
		}
	});

	return channel;
}

Headmaster.prototype.getGroup = function() {
	var _this = this;
	var is_member_groups = [];
	var group = null;

	Object.keys(this.slack.groups).forEach(function(key) {
		if (_this.slack.groups[key].name == _this.slack_group) {
			group = _this.slack.groups[key];
		}
	});

	return group;
}

Headmaster.prototype.shutdown = function() {
	this.slack.disconnect();
}

Headmaster.prototype.handleMessage = function(message) {

	// Any logic to handle when a message comes in

	var dmChannel = this.slack.getDMByID(message.channel);
	var user = this.slack.getUserByID(message.user);

	if (dmChannel) {
		this.routeMessage(dmChannel, user, message.text);
	}
}

Headmaster.prototype.routeMessage = function(dmChannel, user, message) {
	// Checks if there's a handler for this user
	// If there's no current handler, pass it off to the right command handler

	var handler = this.checkUserHandlerExists(user, true);

	if (handler) {
		handler(dmChannel, user, message);
	} else {
		var triggerWord = message.split(" ")[0].toLowerCase();

		if (this.commands[triggerWord]) {
			this.commands[triggerWord](dmChannel, user, message);
		} else {
			this.commands.default(dmChannel, user, message);
		}
	}
}


Headmaster.prototype.getPlayers = function() {
	this.players = [];
}

Headmaster.prototype.setNextUserDMHandler = function(user, cb) {
	var handler = {
		id: user.id,
		cb: cb
	}

	this._nextUserDMHandlers.push(handler);
}

Headmaster.prototype.checkUserActive = function(user) {
	// Checks if the user is an active player or not.

	return false;
}

Headmaster.prototype.checkUserHandlerExists = function(user, removeOnFound) {
	// Checks if there's already a nextUserDMHandler for a user
	// Removes the handler if removeOnFound is true

	var found = false;

	for (var i = 0; i < this._nextUserDMHandlers.length; i++) {
		if (this._nextUserDMHandlers[i].id == user.id) {
			found = this._nextUserDMHandlers[i].cb;

			if (removeOnFound) {
				this._nextUserDMHandlers.splice(this._nextUserDMHandlers.indexOf(found), 1);
			}

			break;
		}
	}

	return found;
}

Headmaster.prototype.getUsers = function(channel) {
	var _this = this;

	var members = channel.members.map(function(user_id) {
		return _this.slack.getUserByID(user_id);
	});

	return members;
}

Headmaster.prototype.getBlockingIssues = function() {
	var deferred = Q.defer();

	this.github_issues.list({
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

Headmaster.prototype.formatIssue = function(issue) {
	var name = "*" + issue['title'] + "* ";
	var assigned_to = "[" + issue['assignee']['login'] + "] ";
	var url = issue['html_url'];

	return name + assigned_to + url;
}

Headmaster.prototype.sendBlockingIssues = function() {
	var _this = this;
	this.getBlockingIssues()
		.then(function(data) {
			_this.channel.send("Hey guys! Here are the current GitHub issues labeled as 'blocker'!");
			data.forEach(function(issue){
				_this.channel.send(_this.formatIssue(issue));
			});
		})
		.fail(function(err) {
			console.error(err);
		});
}

Headmaster.prototype.startCron = function() {
	var _this = this;
	var blockingTickets = schedule.scheduleJob('0 8,12,16,20,24 0 0 0', function() {
		_this.sendBlockingIssues();
	});
}

module.exports = Headmaster;
