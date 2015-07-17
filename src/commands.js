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

Commands.prototype.get_issues = function(dmChannel, user, message, entities) {
	if (!entities) return

	var labels = entities.github_labels;
	var label_values = [];

	if (labels.length) {
		labels.forEach(function(label) {
			label_values.push(label.value);
		})

		this.Headmaster.modules.github.sendIssuesWithLabels(dmChannel, label_values);
	} else {
		return
	}
}

Commands.prototype.blockers = Commands.prototype.get_blockers;

module.exports = Commands;
