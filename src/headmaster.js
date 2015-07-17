'use strict';

// Dependencies
var Slack = require("slack-client");
var mongoose = require("mongoose");
var promfig = require("promfig");
var configurate = require("configurate");
var schedule = require('node-schedule');
var Github = require('github-api');
var Q = require('q');

// Modules
var Commands = require("./commands");
var GithubModule = require("./modules/github");
var NaturalLanguageModule = require("./modules/nlp");

var Headmaster = function() {
	var _this = this;

	var properties = {
		slack_token: "Please enter your Slack Bot API Token: ",
		slack_group: "Please enter the name of the slack group: ",
		github_username: "Please enter your GitHub username: ",
		github_api_token: "Please enter your GitHub Personal Access Token: ",
		github_organization_name: "Please enter in your main GitHub organization name: ",
		github_repo: "Please enter in your main GitHub repo name: ",
		wit_api_token: "Please enter in your Wit.ai API token: "
	};

	var edit = promfig.bind(null, properties);

	configurate({
		configFile: 'config.js',
		configDir: __dirname,
		edit: edit
	}, function (err, config, configPath) {
		if (err) {
			return;
		} else {
			_this.initialize(config, configPath);
		}

	});
}

Headmaster.prototype.initialize = function(config, configPath) {
	console.log("Loading configuration file found at: " + configPath);

	if (!config.slack_token) {
		console.error("No slack_token specified in options.");
	}

	this.config = config;
	this.mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || "mongodb://localhost/headmaster";
	this.slack_token = config.slack_token;
	this.channel = null;
	this.slack_group = config.slack_group;

	this._nextUserDMHandlers = []

	// Setup Commands
	this.commands = new Commands(this);

	// Connect to DB
	mongoose.connect(this.mongoUri);

	// Connect to Slack, setup listeners, and join channel
	this.slack = new Slack(this.slack_token, true, true);

	// Connect to GitHub, setup authorization
	this.github_client = new Github({
		token: config.github_api_token,
		auth: "oauth"
	});

	this.github_repo = this.github_client.getRepo(config.github_organization_name, config.github_repo);
	this.github_issues = this.github_client.getIssues(config.github_organization_name, config.github_repo);

	// Initialize Modules
	this.modules = {};
	this.startModules();

	this.startListeners();

	// Initialize CRON
	this.startCron();
}

Headmaster.prototype.startModules = function() {
	this.modules.github = new GithubModule(this);
	this.modules.nlp = new NaturalLanguageModule(this);
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

	this.channel = this.getChannel() || this.getGroup();

	if (this.channel) {
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

			if (_this.slack.channels[key].name == _this.slack_group) {
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

Headmaster.prototype.handleMessage = function(message) {
	// Any logic to handle when a message comes in
	var _this = this;

	var dmChannel = this.slack.getChannelGroupOrDMByID(message.channel);
	var user = this.slack.getUserByID(message.user);

	if (dmChannel && message.text) {
		// Cool, channel exists.. but only respond if it's a DM channel
		var text_array = message.text.split(' ');
		var text = text_array.slice(1,text_array.length).join(' ');

		if (dmChannel.is_im) {
			// Use NLP module to discover message's intent
			this.modules.nlp.getMessageIntent(text).then(function(intent) {
				_this.routeMessage(dmChannel, user, text, intent);
			}).fail(function() {
				_this.routeMessage(dmChannel, user, text);
			});
		} else if (message.text.split(" ")[0].toLowerCase() == "headmaster") {
			// Only use NLP when message starts with 'headmaster'
			this.modules.nlp.getMessageIntent(text).then(function(intent) {
				_this.routeMessage(dmChannel, user, text, intent);
			}).fail(function() {
				_this.routeMessage(dmChannel, user, text);
			});
		}
	}
}

Headmaster.prototype.routeMessage = function(dmChannel, user, message, intent) {
	// Checks if there's a handler for this user
	// If there's no current handler, pass it off to the right command handler

	var handler = this.checkUserHandlerExists(user, true);

	if (handler) {
		handler(dmChannel, user, message);
	} else {
		var triggerWord = intent || message.split(" ")[0].toLowerCase();
		if (!intent) dmChannel.send("NLP Module had low confidence, defaulting to dumb command match..");

		if (this.commands[triggerWord]) {
			this.commands[triggerWord](dmChannel, user, message);
		} else {
			this.commands.default(dmChannel, user, message);
		}
	}
}

Headmaster.prototype.setNextUserDMHandler = function(user, cb) {
	// Provides a callback on the next user's DM
	// for simple context aware applications

	var handler = {
		id: user.id,
		cb: cb
	}

	this._nextUserDMHandlers.push(handler);
}

Headmaster.prototype.checkUserHandlerExists = function(user, removeOnFind) {
	// Checks if there's already a nextUserDMHandler for a user
	// Removes the handler if removeOnFind is true

	var found = false;

	for (var i = 0; i < this._nextUserDMHandlers.length; i++) {
		if (this._nextUserDMHandlers[i].id == user.id) {
			found = this._nextUserDMHandlers[i].cb;

			if (removeOnFind) {
				this._nextUserDMHandlers.splice(this._nextUserDMHandlers.indexOf(found), 1);
			}

			break;
		}
	}

	return found;
}

Headmaster.prototype.getUsers = function(channel) {
	// Returns array of members of a channel

	var _this = this;

	var members = channel.members.map(function(user_id) {
		return _this.slack.getUserByID(user_id);
	});

	return members;
}

// -------------
// Cron
// -------------

Headmaster.prototype.startCron = function() {
	var _this = this;
	var blockingTickets = schedule.scheduleJob('0 8,12,16,20,24 0 0 0', function() {
		_this.modules.github.sendBlockingIssues(_this.channel);
	});
}

Headmaster.prototype.shutdown = function() {
	this.slack.disconnect();
}

module.exports = Headmaster;
