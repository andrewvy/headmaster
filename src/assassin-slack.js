'use strict';

var Slack = require("slack-client");
var Commands = require("./commands");
var mongoose = require("mongoose");

var Assassin = function(options) {
	if (!options.slack_token) {
		console.error("No slack_token specified in options.");
	}

	this.mongo_uri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || options.mongo_uri || "mongodb://localhost/pingpong";
	this.slack_token = options.slack_token;

	this._nextUserDMHandlers = []

	// Setup Commands
	this.commands = new Commands(this);

	// Connect to DB
	// mongoose.connect(this.mongoUri);

	// Connect to Slack and setup listeners
	this.slack = new Slack(this.slack_token, true, true);
	this.startListeners();

	// Retrieve game-related data from DB
	this.players = this.getPlayers();

	// Initialize CRON
	this.startCron();

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
