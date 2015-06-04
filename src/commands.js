var Commands = function(Assassin) {
	this.assassin = Assassin;
}

Commands.prototype.default = function(dmChannel, user, message) {
	dmChannel.send("Sorry, I cannot give you that kind of information.");
}

module.exports = Commands;
