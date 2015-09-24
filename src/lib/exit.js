"use strict";

/**
 * @param {Live} live
 * @returns {Function}
 */
module.exports = function(live) {

	function exit() {
		if (live.active) {
			live.events.emit("service:exit");
			live.cleanup();
		}

		process.exit();
	}

	process.on("SIGINT", exit);

	return exit;
};
