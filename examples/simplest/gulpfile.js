var gulp = require('gulp'),
  live = require('../../index');

gulp.task('live', function() {
	live.server();
});

gulp.task('default', ['live']);
