"use strict";

/**
 * @param {Live} live
 * @returns {Function}
 */
module.exports = function(live) {

	return function(msg, timeout) {

		if (msg) {
			live.events.emit("browser:notify", {
				message: msg,
				timeout: timeout || 2000
			});
		}
	};
};
