> Gulp plugin to run a webserver (with LiveReload)


## Install

```
npm install --save-dev gulp-devtools-live
```

## Usage

```js
module.exports = function($, gulp, config) {

    var live = require('gulp-devtools-live');

    //var handlebars = require('handlebars');

    var css  = require('./css')($, gulp, config);

    return {
        server: function() {
            process.env.PORT = 3000;
            process.env.ROOT = config.path.build.client;

            require(config.path.root + '/src/server');

            return live.open('http://localhost:' + process.env.PORT);
        },
        connect: function() {
            return live.connect({
                port:3000,
                open: true,
                root: config.path.build.client
            });
        },
        devtools: function() {
            return live.devtools({
                src: './src/client/',
                dest: config.path.build.client,
                port:8888,
                debug:true,
                verbose:true,
                resolve: {
                    '.js': {
                        resolver: 'browserify',
                        map: config.path.build.client + '/src'
                    },
                    '.scss': {
                        resolver: 'sass',
                        cmd: css.live.edit,
                        map: config.path.build.client + '/sass'
                    },

                    // '.ect': {
                    //     resolver: 'ect',
                    //     data: config
                    // }
                }
            });

        },
        watch: function() {

            config.isWatching = true;
            console.log('start watching :');
            console.log(config.path.src.js.files);
            console.log(config.path.src.sass.files);
            console.log(config.path.src.client);

            // gulp.watch(config.path.src.js.files).on('change', [live.edit]);
            // gulp.watch(config.path.src.sass.files).on('change', live.edit);
            // gulp.watch(config.path.src.client).on('change', live.edit);

            gulp.watch(config.path.src.js.files, ['reload:js']);
            gulp.watch(config.path.src.sass.files, ['reload:css']);
            gulp.watch(config.path.src.client, ['reload:index']);
        },
        reload: function() {
            return live.reload();
        }
    };
};


```
