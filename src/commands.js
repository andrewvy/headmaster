var Commands = function(Headmaster) {
	this.Headmaster = Headmaster;
}

Commands.prototype.default = function(channel, user, message) {
	channel.send("Command not recognized, sorry!");
}

// ------
// Memory
// ------

Commands.prototype.last_message = function(channel, user, message, entities) {
	var message = this.Headmaster.modules.memory.recallLastMessage(channel, user);
	if (message) {
		channel.send(message.text);
	} else {
		channel.send("I couldn't remember the last thing said.");
	}
}

// ------
// Ansible
// ------

Commands.prototype.get_box = function(channel, user, message, entities) {
	if (!entities) return

	var _this = this;
	var instances = entities.server_instance;

	if (instances.length) {
		channel.send("Getting current information on boxes.. :loading:");

		instances.forEach(function(instance) {
			_this.Headmaster.modules.ansible.getBranchFromBox(channel, user, instance.value);
		});
	} else {
		channel.send(":cry: Sorry, I couldn't understand your message for server instances to look up.")
	}
}

// ------
// GitHub
// ------

Commands.prototype.get_blockers = function(channel, user, message) {
	this.Headmaster.modules.github.sendBlockingIssues(channel);
}

Commands.prototype.get_issues = function(channel, user, message, entities) {
	if (!entities) return

	var labels = entities.github_labels;
	var label_values = [];

	if (labels.length) {
		labels.forEach(function(label) {
			label_values.push(label.value);
		})

		this.Headmaster.modules.github.sendIssuesWithLabels(channel, label_values);
	} else {
		return
	}
}

Commands.prototype.create_issue = function(channel, user, message, entities) {
	if (!entities) return
	if (!entities.title[0]) return

	this.Headmaster.modules.github.createTicket(channel, entities.title[0].value)
}

Commands.prototype.blockers = Commands.prototype.get_blockers;

module.exports = Commands;
