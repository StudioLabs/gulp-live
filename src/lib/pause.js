"use strict";

/**
 * @param {Live} live
 * @returns {Function}
 */
module.exports = function(live) {

	return function() {
		live.paused = true;
	};
};
