var Live = require("devtools-live");

var live = new Live();

function LiveServer() {

}

LiveServer.prototype.connect = function(options) {
	live.connect(options);
};

LiveServer.prototype.devtools = function(options) {
	return live.devtools(options);
};

LiveServer.prototype.watch = function(options) {
	live.watch(options);
};

LiveServer.prototype.start = function(options) {
	live.start(options);
};

LiveServer.prototype.open = function(url, name) {
	live.open(url, name);
};

LiveServer.prototype.reload = function() {
	if (live.ws !== undefined) {
		live.ws.broadcast({action:'reload'});
	}
};

LiveServer.prototype.edit = function() {
	var files = Array.prototype.slice.call(arguments);
	if (files[files.length - 1] === 'function') done = files.pop();
	done = typeof done === 'function' ? done : function() {};
	files.forEach(function(file) {
		live.onFileChange(file.path);
		done();
	});
};

var server = new LiveServer();

module.exports = server;
