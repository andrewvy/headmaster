var Q = require('q');
var _ = require('lodash');

// ------------------
// Memory
// Gives the Headmaster power of context
// ------------------

var Memory = function(Headmaster) {
	this.Headmaster = Headmaster;
}

Memory.prototype.recallLastMessage = function(channel, user) {
	var historyArray = _.toArray(channel._history);
	historyArray = historyArray.slice(0, historyArray.length-1);
	var lastMessage = _.findLast(historyArray, { user: user.id } );

	if (!lastMessage) return null

	return lastMessage;
}

module.exports = Memory;
