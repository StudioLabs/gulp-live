var path = require("path");
var es = require("event-stream");
var http = require("http");
var Live = require("live-edit");
var util = require("gulp-util");

function LiveServer(options) {
	this.live = new Live(options);
	return this.live;
}

LiveServer.prototype.start = function(line) {
	this.live.start();
};

LiveServer.prototype.changed = function(filepath) {
	this.live.onFileChange(filepath, this.root);
};

var server = null;

module.exports = {
	start: function(options) {
		server = new LiveServer(options);
		return server;
	},
	changed: function() {
		return es.map(function(file, callback) {
			util.log(util.colors.blue('file changed : ' + file.path));
			server.onFileChange(file.path);
			return callback(null, file);
		});
	},
	close: function() {
		return server.close();
	}
};

// ---
// generated by coffee-script 1.9.2
