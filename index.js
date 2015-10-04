var es = require("event-stream");
var http = require("http");
var Live = require("live-edit");
var util = require("gulp-util");

function LiveServer() {
	this.live = new Live();
}

LiveServer.prototype.server = function(options) {
	this.live.server(options);
};

LiveServer.prototype.devtools = function(options) {
	this.live.devtools(options);
};

LiveServer.prototype.watch = function(options) {
	this.live.watch(options);
};

LiveServer.prototype.start = function(options) {
	this.live.start(options);
};

LiveServer.prototype.reload = function() {
	if (this.live.ws !== undefined) {
		this.live.ws.broadcast({action:'reload'});
	}
};

LiveServer.prototype.edit = function() {
	var files = Array.prototype.slice.call(arguments);
	if (files[files.length - 1] === 'function') done = files.pop();
	done = typeof done === 'function' ? done : function() {};
	files.forEach(function(file) {
		this.live.onFileChange(file.path);
		done();
	}, this);
};

var server = new LiveServer();

module.exports = server;

