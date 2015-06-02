var Commands = function(Assassin) {
	this.assassin = Assassin;
}

Commands.prototype.join = function(dmChannel, user, message) {
	if (this.assassin.checkUserActive(user)) {
	} else {
		dmChannel.send("Do you really wish to join the Assassin's Guild?");
		this.assassin.setNextUserDMHandler(user, this.confirmJoin);
	}

}

Commands.prototype.confirmJoin = function(dmChannel, user, message) {
	var confirm = message.indexOf("yes") != -1;

	if (confirm) {
		dmChannel.send("Welcome!");
	} else {
		dmChannel.send("If you change your mind, you can always join at a later time.");
	}
}

Commands.prototype.default = function(dmChannel, user, message) {
	dmChannel.send("Sorry, I cannot give you that kind of information.");
}

module.exports = Commands;
