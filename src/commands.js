var Commands = function(Headmaster) {
	this.Headmaster = Headmaster;
}

Commands.prototype.default = function(dmChannel, user, message) {
	dmChannel.send("Command not recognized, sorry!");
}

Commands.prototype.blockers = function(dmChannel, user, message) {
	this.Headmaster.sendBlockingIssues(dmChannel);
}

module.exports = Commands;
