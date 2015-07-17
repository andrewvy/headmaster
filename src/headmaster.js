'use strict';

var Slack = require("slack-client");
var Commands = require("./commands");
var mongoose = require("mongoose");
var promfig = require("promfig");
var configurate = require("configurate");
var schedule = require('node-schedule');

var Headmaster = function() {
	var _this = this;

	var configFile = __dirname + "/config.js";

	var properties = {
		slack_token: "Please enter your Slack Bot API Token: ",
		slack_channel: "Please enter the name of the slack channel: "
	};

	var edit = promfig.bind(null, properties);

	configurate({
		configFile: configFile,
		edit: edit
	}, function (err, config, configPath) {

		console.log("Loading configuration file found at: " + configPath);

		if (!config.slack_token) {
			console.error("No slack_token specified in options.");
		}

		_this.mongo_uri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || "mongodb://localhost/headmaster";
		_this.slack_token = config.slack_token;
		_this.channel = null;

		_this._nextUserDMHandlers = []

		// Setup Commands
		_this.commands = new Commands(_this);

		// Connect to DB
		mongoose.connect(_this.mongoUri);

		// Connect to Slack, setup listeners, and join channel
		_this.slack = new Slack(_this.slack_token, true, true);
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

	this.channel = this.getChannel();

	if (this.channel) {
		this.channel.send("I am the headmaster.");
	} else {
		console.error("Please create and invite the bot to the slack channel: #" + this.slack_channel);
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

Headmaster.prototype.startCron = function() {
	var blockingTickets = schedule.scheduleJob('0 8,12,16,20,24 0 0 0', function() {

	});
}

module.exports = Headmaster;
