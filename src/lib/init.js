"use strict";

var _         = require("lodash");
var merge     = require("../cli/cli-options").merge;

/**
 * @param {Live} live
 * @param {String} [name] - instance name
 * @param {Object} pjson
 * @returns {Function}
 */
module.exports = function(live, name, pjson) {

	return function() {

		/**
		         * Handle new + old signatures for init.
		         */
		var args = require("./args")(_.toArray(arguments));

		/**
		         * If the current instance is already running, just return an error
		         */
		if (live.active) {
			return args.cb(new Error("Instance: " + name + " is already running!"));
		}

		args.config.version = pjson.version;

		return live.init(merge(args.config), args.cb);
	};
};
