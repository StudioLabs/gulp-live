gulp-connect [![Build Status](http://img.shields.io/travis/AveVlad/gulp-connect.svg?style=flat)](https://travis-ci.org/AveVlad/gulp-connect) [![](http://img.shields.io/npm/dm/gulp-connect.svg?style=flat)](https://www.npmjs.org/package/gulp-connect) [![](http://img.shields.io/npm/v/gulp-connect.svg?style=flat)](https://www.npmjs.org/package/gulp-connect)
==============

> Gulp plugin to run a webserver (with LiveReload)


## Install

```
npm install --save-dev gulp-live
```

## Usage

```js
module.exports = function($, gulp, paths) {

    var live = require('gulp-live');

    var handlebars = require('handlebars');

    var css  = require('./css')($, gulp, paths);

    return {
        live: function() {

            return live.start({
                src: './',
                dest: paths.build.dest,
                port:8888,
                debug:true,
                verbose:true,
                server: {
                    port:7777,
                    root: paths.build.dest
                },
                resolve: {
                    '.js': {
                        resolver: 'browserify',
                        map: paths.build.dest + '/src'
                    },
                    '.scss': {
                        resolver: 'sass',
                        cmd: css.live.edit,
                        map: paths.build.dest + '/sass'
                    },
                    '.hbs': {
                        resolver: 'handlebars',
                        module: handlebars,
                        map: paths.build.dest + '/src'
                    }
                }
            });
        },
        watch: function() {
            console.log('start watching :');
            console.log(paths.src.js);
            console.log(paths.src.scss);

            gulp.watch(paths.src.js).on('change', live.edited);
            gulp.watch(paths.src.scss).on('change', live.edited);
        }
    };
};

```
