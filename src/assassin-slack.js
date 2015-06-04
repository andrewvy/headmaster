'use strict';

var Slack = require("slack-client");
var Commands = require("./commands");
var mongoose = require("mongoose");
var promfig = require("promfig");
var configurate = require("configurate");

var Assassin = function() {
	var _this = this;

	var configFile = "config.js";

	var properties = {
		slack_token: "Please enter your Slack Bot API Token: ",
		slack_channel: "Please enter the name of the slack channel: "
	};

	var edit = promfig.bind(null, properties);

	configurate({
		configFile: configFile,
		edit: edit
	}, function (err, config, configPath) {
		console.log(configPath);
		if (!config.slack_token) {
			console.error("No slack_token specified in options.");
		}

		_this.mongo_uri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || "mongodb://localhost/assassin-slack";
		_this.slack_token = config.slack_token;
		_this.slack_channel = config.slack_channel || "assassin-game";

		_this._nextUserDMHandlers = []

		// Setup Commands
		_this.commands = new Commands(_this);

		// Connect to DB
		// mongoose.connect(this.mongoUri);

		// Connect to Slack, setup listeners, and join channel
		_this.slack = new Slack(_this.slack_token, true, true);
		_this.startListeners();

		// Initialize CRON
		_this.startCron();
	});
}

Assassin.prototype.startListeners = function() {
	var _this = this;

	this.slack.on("open", function() {
		_this.handleOpen();
	});

	this.slack.on("message", function(message) {
		_this.handleMessage(message);
	});

	this.slack.login();
}

Assassin.prototype.handleOpen = function() {
	// Any logic to handle when first connecting to slack
	// Joins the assassin-game slack channel

	if (this.checkForChannel()) {
		// this.getPlayers()
	} else {
		console.error("Please create and invite the bot to the slack channel: #" + this.slack_channel);
		this.shutdown();
	}
}

Assassin.prototype.checkForChannel = function() {
	var _this = this;
	var is_member_channels = [];
	var has_channel = false;

	Object.keys(this.slack.channels).forEach(function(key) {
		if (_this.slack.channels[key].is_member == true) {
			is_member_channels.push(_this.slack.channels[key]);

			if (_this.slack.channels[key].name == _this.slack_channel) {
				has_channel = true;
			}
		}
	});

	return has_channel;
}

Assassin.prototype.shutdown = function() {
	this.slack.disconnect();
}

Assassin.prototype.handleMessage = function(message) {

	// Any logic to handle when a message comes in

	var dmChannel = this.slack.getDMByID(message.channel);
	var user = this.slack.getUserByID(message.user);

	if (dmChannel) {
		this.routeMessage(dmChannel, user, message.text);
	}
}

Assassin.prototype.routeMessage = function(dmChannel, user, message) {
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

Assassin.prototype.startCron = function() {
	// Start daily cron job to set daily targets
}

Assassin.prototype.getPlayers = function() {
	// Get currently active players from DB

	this.players = [];
}

Assassin.prototype.setNextUserDMHandler = function(user, cb) {
	var handler = {
		id: user.id,
		cb: cb
	}

	this._nextUserDMHandlers.push(handler);
}

Assassin.prototype.checkUserActive = function(user) {
	// Checks if the user is an active player or not.

	return false;
}

Assassin.prototype.checkUserHandlerExists = function(user, removeOnFound) {
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

module.exports = Assassin;
