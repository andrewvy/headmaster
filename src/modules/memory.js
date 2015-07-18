var Q = require('q');
var _ = require('lodash');

// ------------------
// Memory
// Gives the Headmaster power of context
// ------------------

var Memory = function(Headmaster) {
	this.Headmaster = Headmaster;
}

Memory.prototype.getHistory = function(channel) {
	if (!channel) return

	var historyArray = _.toArray(channel._history);
	var filteredHistory = this.filterHistory(historyArray);

	return filteredHistory;
}

Memory.prototype.filterHistory = function(history) {
	// Slice out the last message that invoked Headmaster

	return history.slice(0, history.length-1);
}

Memory.prototype.recallLastMessage = function(channel, user) {
	if (!channel) return

	var history = this.getHistory(channel);
	var lastMessage = _.findLast(history, { user: user.id } );

	if (!lastMessage) return null
	return lastMessage;
}

module.exports = Memory;
