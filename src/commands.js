var Commands = function(Headmaster) {
	this.Headmaster = Headmaster;
}

Commands.prototype.default = function(dmChannel, user, message) {
	dmChannel.send("Command not recognized, sorry!");
}

// ------
// GitHub
// ------

Commands.prototype.get_blockers = function(dmChannel, user, message) {
	this.Headmaster.modules.github.sendBlockingIssues(dmChannel);
}

Commands.prototype.blockers = Commands.prototype.get_blockers;

module.exports = Commands;
