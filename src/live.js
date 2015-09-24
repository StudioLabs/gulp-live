"use strict";

var hooks           = require("./hooks");
var asyncTasks      = require("./async-tasks");
var config          = require("./config");
var connectUtils    = require("./connect-utils");
var utils           = require("./utils");
var logger          = require("./logger");

var eachSeries      = require("async-each-series");
var _               = require("lodash");
var EE              = require("easy-extender");

/**
 * Required internal plugins.
 * Any of these can be overridden by deliberately
 * causing a name-clash.
 */
var defaultPlugins = {
	"logger":        logger,
	"socket":        require("./sockets"),
	"file:watcher":  require("./file-watcher"),
	"server":        require("./server"),
	"tunnel":        require("./tunnel"),
	"client:script": require("browser-sync-client"),
	"UI":            require("browser-sync-ui")
};

/**
 * @constructor
 */
var Live = function(emitter) {

	var live      = this;

	live.cwd      = process.cwd();
	live.active   = false;
	live.paused   = false;
	live.config   = config;
	live.utils    = utils;
	live.events   = live.emitter = emitter;

	live._userPlugins   = [];
	live._reloadQueue   = [];
	live._cleanupTasks  = [];
	live._browserReload = false;

	// Plugin management
	live.pluginManager = new EE(defaultPlugins, hooks);
};

/**
 * Call a user-options provided callback
 * @param name
 */
Live.prototype.callback = function(name) {

	var live  = this;
	var cb  = live.options.getIn(["callbacks", name]);

	if (_.isFunction(cb)) {
		cb.apply(live.publicInstance, _.toArray(arguments).slice(1));
	}
};

/**
 * @param {Map} options
 * @param {Function} cb
 * @returns {Live}
 */
Live.prototype.init = function(options, cb) {

	/**
	     * Safer access to `this`
	     * @type {Live}
	     */
	var live = this;

	/**
	     * Set user-provided callback, or assign a noop
	     * @type {Function}
	     */
	live.cb  = cb || utils.defaultCallback;

	/**
	     * Verify provided config.
	     * Some options are not compatible and will cause us to
	     * end the process.
	     */
	if (!utils.verifyConfig(options, live.cb)) {
		return;
	}

	/**
	     * Save a reference to the original options
	     * @type {Map}
	     * @private
	     */
	live._options = options;

	/**
	     * Set additional options that depend on what the
	     * user may of provided
	     * @type {Map}
	     */
	live.options  = require("./options").update(options);

	/**
	     * Kick off default plugins.
	     */
	live.pluginManager.init();

	/**
	     * Create a base logger & debugger.
	     */
	live.logger   = live.pluginManager.get("logger")(live.events, live);
	live.debugger = live.logger.clone({useLevelPrefixes: true});
	live.debug    = live.debugger.debug;

	/**
	     * Run each setup task in sequence
	     */
	eachSeries(
	asyncTasks,
	taskRunner(live),
	tasksComplete(live)
	);

	return this;
};

/**
 * Run 1 setup task.
 * Each task is a pure function.
 * They can return options or instance properties to set,
 * but they cannot set them directly.
 * @param {Live} live
 * @returns {Function}
 */
function taskRunner(live) {

	return function(item, cb) {

		live.debug("-> {yellow:Starting Step: " + item.step);

		/**
		         * Execute the current task.
		         */
		item.fn(live, executeTask);

		function executeTask(err, out) {

			/**
			             * Exit early if any task returned an error.
			             */
			if (err) {
				return cb(err);
			}

			/**
			             * Act on return values (such as options to be set,
			             * or instance properties to be set
			             */
			if (out) {
				handleOut(live, out);
			}

			live.debug("+  {green:Step Complete: " + item.step);

			cb();
		}
	};
}

/**
 * @param live
 * @param out
 */
function handleOut(live, out) {
	/**
	     * Set a single/many option.
	     */
	if (out.options) {
		setOptions(live, out.options);
	}

	/**
	     * Any options returned that require path access?
	     */
	if (out.optionsIn) {
		out.optionsIn.forEach(function(item) {
			live.setOptionIn(item.path, item.value);
		});
	}

	/**
	     * Any instance properties returned?
	     */
	if (out.instance) {
		Object.keys(out.instance).forEach(function(key) {
			live[key] = out.instance[key];
		});
	}
}

/**
 * Update the options Map
 * @param live
 * @param options
 */
function setOptions(live, options) {

	/**
	     * If multiple options were set, act on the immutable map
	     * in an efficient way
	     */
	if (Object.keys(options).length > 1) {
		live.setMany(function(item) {
			Object.keys(options).forEach(function(key) {
				item.set(key, options[key]);
				return item;
			});
		});
	} else {
		Object.keys(options).forEach(function(key) {
			live.setOption(key, options[key]);
		});
	}
}

/**
 * At this point, ALL async tasks have completed
 * @param {Live} live
 * @returns {Function}
 */
function tasksComplete(live) {

	return function(err) {

		if (err) {
			live.logger.setOnce("useLevelPrefixes", true).error(err.message);
		}

		/**
		         * Set active flag
		         */
		live.active = true;

		/**
		         * @deprecated
		         */
		live.events.emit("init", live);

		/**
		         * This is no-longer needed as the Callback now only resolves
		         * when everything (including slow things, like the tunnel) is ready.
		         * It's here purely for backwards compatibility.
		         * @deprecated
		         */
		live.events.emit("service:running", {
			options: live.options,
			baseDir: live.options.getIn(["server", "baseDir"]),
			type:    live.options.get("mode"),
			port:    live.options.get("port"),
			url:     live.options.getIn(["urls", "local"]),
			urls:    live.options.get("urls").toJS(),
			tunnel:  live.options.getIn(["urls", "tunnel"])
		});

		/**
		         * Call any option-provided callbacks
		         */
		live.callback("ready", null, live);

		/**
		         * Finally, call the user-provided callback given as last arg
		         */
		live.cb(null, live);
	};
}

/**
 * @param module
 * @param opts
 * @param cb
 */
Live.prototype.registerPlugin = function(module, opts, cb) {

	var live = this;

	live.pluginManager.registerPlugin(module, opts, cb);

	if (module["plugin:name"]) {
		live._userPlugins.push(module);
	}
};

/**
 * Get a plugin by name
 * @param name
 */
Live.prototype.getUserPlugin = function(name) {

	var live = this;

	var items = live.getUserPlugins(function(item) {
		return item["plugin:name"] === name;
	});

	if (items && items.length) {
		return items[0];
	}

	return false;
};

/**
 * @param {Function} [filter]
 */
Live.prototype.getUserPlugins = function(filter) {

	var live = this;

	filter = filter || function() {
		return true;
	};

	/**
	     * Transform Plugins option
	     */
	live.userPlugins = live._userPlugins.filter(filter).map(function(plugin) {
		return {
			name: plugin["plugin:name"],
			active: plugin._enabled,
			opts: live.pluginManager.pluginOptions[plugin["plugin:name"]]
		};
	});

	return live.userPlugins;
};

/**
 * Get middleware
 * @returns {*}
 */
Live.prototype.getMiddleware = function(type) {

	var types = {
		"connector": connectUtils.socketConnector(this.options),
		"socket-js": require("./snippet").utils.getSocketScript()
	};

	if (type in types) {
		return function(req, res) {
			res.setHeader("Content-Type", "text/javascript");
			res.end(types[type]);
		};
	}
};

/**
 * Shortcut for pushing a file-serving middleware
 * onto the stack
 * @param {String} path
 * @param {{type: string, content: string}} props
 */
Live.prototype.serveFile = function(path, props) {

	var live = this;

	if (live.app) {
		live.app.use(path, function(req, res) {
			res.setHeader("Content-Type", props.type);
			res.end(props.content);
		});
	}
};

/**
 * Add middlewares on the fly
 * @param route
 * @param handle
 * @param opts
 */
Live.prototype.addMiddleware = function(route, handle, opts) {

	var live   = this;

	if (!live.app) {
		return;
	}

	var mode = live.options.get("mode");

	opts = opts || {};

	if (!opts.id) {
		opts.id = "live-mw-" + Math.random();
	}

	if (route === "*") {
		route = "";
	}

	if (opts.override) {
		return live.app.stack.unshift({id: opts.id, route: route, handle: handle});
	}

	if (mode === "proxy") {
		return live.app.use(route, handle, opts);
	}

	return live.app.stack.push({
		id: opts.id,
		route: route,
		handle: handle
	}); // function + route;
};

/**
 * Remove middlewares on the fly
 * @param {String} id
 * @returns {Server}
 */
Live.prototype.removeMiddleware = function(id) {

	var live = this;

	if (!live.app) {
		return;
	}

	live.app.stack = live.app.stack.filter(function(item) {
		if (!item.id) {
			return true;
		}

		return item.id !== id;
	});

	return live.app;
};

/**
 * Middleware for socket connection (external usage)
 * @param opts
 * @returns {*}
 */
Live.prototype.getSocketConnector = function(opts) {

	var live = this;

	return function(req, res) {
		res.setHeader("Content-Type", "text/javascript");
		res.end(live.getExternalSocketConnector(opts));
	};
};

/**
 * Socket connector as a string
 * @param {Object} opts
 * @returns {*}
 */
Live.prototype.getExternalSocketConnector = function(opts) {

	var live = this;

	return connectUtils.socketConnector(
        live.options.withMutations(function(item) {
	item.set("socket", item.get("socket").merge(opts));
	if (!live.options.getIn(["proxy", "ws"])) {
		item.set("mode", "snippet");
	}
        })
    );
};

/**
 * Socket io as string (for embedding)
 * @returns {*}
 */
Live.prototype.getSocketIoScript = function() {

	return require("./snippet").utils.getSocketScript();
};

/**
 * Callback helper
 * @param name
 */
Live.prototype.getOption = function(name) {

	this.debug("Getting option: {magenta:%s", name);
	return this.options.get(name);
};

/**
 * Callback helper
 * @param path
 */
Live.prototype.getOptionIn = function(path) {

	this.debug("Getting option via path: {magenta:%s", path);
	return this.options.getIn(path);
};

/**
 * @returns {Live.options}
 */
Live.prototype.getOptions = function() {
	return this.options;
};

/**
 * @returns {Live.options}
 */
Live.prototype.getLogger = logger.getLogger;

/**
 * @param {String} name
 * @param {*} value
 * @returns {Live.options|*}
 */
Live.prototype.setOption = function(name, value, opts) {

	var live = this;

	opts = opts || {};

	live.debug("Setting Option: {cyan:%s} - {magenta:%s", name, value.toString());

	live.options = live.options.set(name, value);

	if (!opts.silent) {
		live.events.emit("options:set", {path: name, value: value, options: live.options});
	}

	return this.options;
};

/**
 * @param path
 * @param value
 * @param opts
 * @returns {Map|*|Live.options}
 */
Live.prototype.setOptionIn = function(path, value, opts) {

	var live = this;

	opts = opts || {};

	live.debug("Setting Option: {cyan:%s} - {magenta:%s", path.join("."), value.toString());
	live.options = live.options.setIn(path, value);
	if (!opts.silent) {
		live.events.emit("options:set", {path: path, value: value, options: live.options});
	}

	return live.options;
};

/**
 * Set multiple options with mutations
 * @param fn
 * @param opts
 * @returns {Map|*}
 */
Live.prototype.setMany = function(fn, opts) {

	var live = this;

	opts = opts || {};

	live.debug("Setting multiple Options");
	live.options = live.options.withMutations(fn);
	if (!opts.silent) {
		live.events.emit("options:set", {options: live.options.toJS()});
	}

	return this.options;
};

/**
 * Remove a rewrite rule by id
 */
Live.prototype.removeRewriteRule = function(id) {
	var live = this;

	live.setRewriteRules(live.rewriteRules.filter(fn));

	function fn(item) {
		if (item.id) {
			return item.id !== id;
		}

		return true;
	}
};

/**
 * Add a new rewrite rule to the stack
 * @param {Object} rule
 */
Live.prototype.addRewriteRule = function(rule) {
	var live = this;

	live.setRewriteRules(live.rewriteRules.concat(rule));
};

/**
 * Completely replace all rules
 * @param {Array} rules
 */
Live.prototype.setRewriteRules = function(rules) {
	var live = this;

	live.rewriteRules = rules;

	if (live.options.get("mode") === "server") {
		live.snippetMw.opts.rules = rules;
	}

	if (live.options.get("mode") === "proxy") {
		live.proxy.config.rules = rules;
	}
};

/**
 * Handle Browser Reloads
 */
Live.prototype.doBrowserReload = function() {

	var live = this;

	if (live._browserReload) {
		return;
	}

	live._browserReload = setTimeout(function() {
		live.io.sockets.emit("browser:reload");
		clearTimeout(live._browserReload);
		live._browserReload = false;
	}, live.options.get("reloadDelay"));
};

/**
 * Handle a queue of reloads
 * @param {Object} data
 */
Live.prototype.doFileReload = function(data) {

	var live = this;

	live._reloadQueue = live._reloadQueue || [];
	live._reloadQueue.push(data);

	if (live._reloadTimer) {
		return;
	}

	var willReload = utils.willCauseReload(
	live._reloadQueue.map(function(item) { return item.path; }),
	live.options.get("injectFileTypes").toJS()
	);

	live._reloadTimer = setTimeout(function() {

		if (willReload) {
			if (!live._reloadDebounced) {
				live._reloadDebounced = setTimeout(function() {
					live._reloadDebounced = false;
				}, live.options.get("reloadDebounce"));
				live.io.sockets.emit("browser:reload");
			}
		} else {
			live._reloadQueue.forEach(function(item) {
				live.io.sockets.emit("file:reload", item);
			});
		}

		clearTimeout(live._reloadTimer);

		live._reloadTimer = undefined;
		live._reloadQueue = [];

	}, live.options.get("reloadDelay"));
};

/**
 * @param fn
 */
Live.prototype.registerCleanupTask = function(fn) {

	this._cleanupTasks.push(fn);
};

/**
 * Instance Cleanup
 */
Live.prototype.cleanup = function(cb) {

	var live = this;
	if (!live.active) {
		return;
	}

	// Close any servers
	if (live.server) {
		live.debug("Closing server...");
		live.server.close();
	}

	// Remove all event listeners
	if (live.events) {
		live.debug("Removing event listeners...");
		live.events.removeAllListeners();
	}

	// Run any additional clean up tasks
	live._cleanupTasks.forEach(function(fn) {
		if (_.isFunction(fn)) {
			fn(live);
		}
	});

	// Reset the flag
	live.debug("Setting {magenta:active: false");
	live.active = false;
	live.paused = false;

	live.pluginManager.plugins        = {};
	live.pluginManager.pluginOptions  = {};
	live.pluginManager.defaultPlugins = defaultPlugins;

	live._userPlugins                = [];
	live.userPlugins                 = [];
	live._reloadTimer                = undefined;
	live._reloadQueue                = [];
	live._cleanupTasks               = [];

	if (_.isFunction(cb)) {
		cb(null, live);
	}
};

module.exports = Live;
