var Commands = function(Headmaster) {
	this.headmaster = Headmaster;
}

Commands.prototype.default = function(dmChannel, user, message) {
	dmChannel.send("Command not recognized, sorry!");
}

module.exports = Commands;
