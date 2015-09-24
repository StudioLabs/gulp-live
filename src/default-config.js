"use strict";
/**
 * @module Live.options
 */
module.exports = {

	/**
	     * Can be either "info", "debug", "warn", or "silent"
	     * @property logLevel
	     * @type String
	     * @default info
	     */
	logLevel: "info",

	/**
	     * Change the console logging prefix. Useful if you're creating your
	     * own project based on Browsersync
	     * @property logPrefix
	     * @type String
	     * @default BS
	     * @since 1.5.1
	     */
	logPrefix: "Live",

	/**
	     * @property logConnections
	     * @type Boolean
	     * @default false
	     */
	logConnections: false,

	/**
	     * @property logFileChanges
	     * @type Boolean
	     * @default true
	     */
	logFileChanges: true,

	/**
	     * Decide which URL to open automatically when Browsersync starts. Defaults to "local" if none set.
	     * Can be true, `local`, `external`, `ui`, `ui-external`, `tunnel` or `false`
	     * @property open
	     * @type Boolean|String
	     * @default true
	     */
	open: "local",

	/**
	     * @property browser
	     * @type String|Array
	     * @default default
	     */
	browser: "default",

	/**
	     * Reload each browser when Browsersync is restarted.
	     * @property reloadOnRestart
	     * @type Boolean
	     * @default false
	     */
	reloadOnRestart: false,

	/**
	     * The small pop-over notifications in the browser are not always needed/wanted.
	     * @property notify
	     * @type Boolean
	     * @default true
	     */
	notify: true,

	/**
	     * User provided plugins
	     * @property plugins
	     * @type Array
	     * @default []
	     * @since 2.6.0
	     */
	plugins: []
};
