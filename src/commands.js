var Commands = function(Headmaster) {
	this.headmaster = Headmaster;
}

Commands.prototype.default = function(dmChannel, user, message) {
	dmChannel.send("Sorry, I cannot give you that kind of information.");
}

module.exports = Commands;
