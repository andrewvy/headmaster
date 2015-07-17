var Commands = function(Headmaster) {
	this.Headmaster = Headmaster;
}

Commands.prototype.default = function(dmChannel, user, message) {
	dmChannel.send("Command not recognized, sorry!");
}

// ------
// GitHub
// ------

Commands.prototype.blockers = function(dmChannel, user, message) {
	this.Headmaster.modules.github.sendBlockingIssues(dmChannel);
}

module.exports = Commands;
