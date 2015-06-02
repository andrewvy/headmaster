'use strict';

var Slack = require("slack-client");
var mongoose = require("mongoose");

var Assassin = function(options) {
	if (!options.slack_token) {
		console.error("No slack_token specified in options.");
	}

	this.mongo_uri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || options.mongo_uri || "mongodb://localhost/pingpong";
	this.slack_token = options.slack_token;

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
		console.log(message);
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
	var username = this.slack.getUserByID(message.user).name;

	if (dmChannel) {
		dmChannel.send("Hello " + username + "!");
	}
}

Assassin.prototype.dispatchMessageHandler = function(text) {
}

Assassin.prototype.startCron = function() {
	// Start daily cron job to set daily targets
}

Assassin.prototype.getPlayers = function() {
	// Get currently active players from DB
}

module.exports = Assassin;
