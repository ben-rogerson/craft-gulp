const pkg = require('./package.json');
const gulp = require('gulp');
const notifier = require('node-notifier');
const exec = require('child_process').exec;
const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const isDev = environment === 'development';

// load all plugins in 'devDependencies' into the variable $
const $ = require('gulp-load-plugins')({
    pattern: ['*'],
    scope: ['devDependencies']
});

/**
 * Define the config for your project
 * More options can be configured in `package.json`
 */
const config = {
    compress: false, // minify/compress css and js resources
    browserSync: {
        proxy: pkg.paths.urls.dev,
        files: [
            `${pkg.paths.templates}/**/[^_]*.twig`,
            `${pkg.paths.built.js}/**/[^_]*.js`
        ],
        ghostMode: { scroll: false },
        notify: false,
        open: false,
        https: true,
    },
}

/**
 * Play a wav file
 */
const playSound = filePath => {
    var os = require('os');
    if (!os.platform() === 'linux') {
      exec('aplay ' + filePath);
    } else {
      exec('afplay ' + filePath);
    }
};

/**
 * Handle error messages with the native notifier
 */
function handleError(err, emitEnd = true) {
    playSound('./config/error.wav');
    const errorMessage = (typeof err.message !== 'undefined') ? err.message.toString() : null
    notifier.notify({
        'title': 'Error',
        'message': errorMessage.split('\n')[0]
    });
    const errorStack = (typeof err.stack !== 'undefined') ? err.stack.toString() : err
    console.log($.color(errorStack, 'RED'));
    if (emitEnd) this.emit('end');
};

/**
 * Delete files from various directories
 */
gulp.task('clean', () => {
    const filesFolders = [
        `${pkg.paths.built.css}`, // Remove whole built css folder
        `${pkg.paths.built.js}`, // Remove whole built js folder
        `${pkg.paths.built.img}`, // Remove whole built img folder
        `${pkg.paths.built.static}` // Remove whole built static folder
    ];
    return gulp.src(filesFolders, {read: false}).pipe($.clean());
});

/**
 * CSS > Autoprefix and minify
 */
gulp.task('compiling css', () => {
    return gulp.src(`${pkg.paths.src.scss}*.scss`)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.sassVariables({
            $isDev: isDev
        }))
        .pipe($.sass({
            includePaths: [pkg.paths.scss, 'node_modules']
        }))
        .pipe($.autoprefixer({
            browsers: [
                '> 0.5% in AU',
                'last 3 years',
                'iOS >= 7',
                'ie >= 10'
            ]
        }))
        .pipe($.cached('sass_compile'))
        .pipe(
            $.if(config.compress,
            $.cssnano({
                safe: true,
                autoprefixer: false,
                discardComments: {
                    removeAll: true
                },
                discardDuplicates: true,
                discardEmpty: true,
                minifyFontValues: false,
                minifySelectors: true
            }),
        ))
        .pipe($.concat(pkg.vars.cssExportName))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.built.css))
        .pipe($.browserSync.stream({match: '**/*.css'}));
});

/**
 * JS > Browserify, babelify and uglify the js into 'assets/js/app.js'
 */
gulp.task('compiling js', () => {
    return gulp.src(pkg.globs.babelJs)
        .pipe($.bro({
            transform: [
                [ 'babelify', { global: true } ]
            ],
            paths: ['./node_modules', pkg.paths.src.js],
            error: error => handleError(error, false)
        }))
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.if((['*.js', '!*.min.js'] && config.compress),
            $.uglify({
                compress: {
                    unused: true,
                    dead_code: true, // big one--strip code that will never execute
                    warnings: false, // good for prod apps so users can't peek behind curtain
                    drop_debugger: true,
                    conditionals: true,
                    evaluate: true,
                    drop_console: true, // strips console statements
                    sequences: true,
                    booleans: true,
                },
                output: {
                    comments: false
                }
            }),
        ))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.built.js))
        .pipe($.browserSync.stream({match: '**/*.js'}));
});

/**
 * JS > Move scripts intended for inlining into 'templates/_inlinejs'
 * Runs once when you start the dev/prod process
 */
gulp.task('creating inline js', () => {
    return gulp.src(pkg.globs.inlineJs)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.if(['*.js', '!*.min.js'],
            $.newer({dest: `${pkg.paths.built.js}_inlinejs`})
        ))
        .pipe($.if((['*.js', '!*.min.js'] && config.compress),
            $.uglify({
                compress: {
                    unused: true,
                    dead_code: true, // big one - strip code that will never execute
                    warnings: false, // good for prod apps so users can't peek behind curtain
                    drop_debugger: true,
                    conditionals: true,
                    evaluate: true,
                    drop_console: true, // strips console statements
                    sequences: true,
                    booleans: true,
                },
                output: {
                    comments: false
                }
            }),
        ))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(`${pkg.paths.templates}_inlinejs`));
});

/**
 * JS > Combines scripts into a single 'assets/js/plugins.js' package
 * Runs once at the beginning of the dev/prod process
 */
gulp.task('combining global js', () => {
    return gulp.src(pkg.globs.globalJs)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.if((['*.js', '!*.min.js'] && config.compress),
            $.uglify({
                output: {
                    comments: false
                }
            }),
        ))
        .pipe($.concat(pkg.vars.jsPluginsExportName))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.built.js))
        .pipe($.browserSync.stream({match: '**/*.js'}));
});

/**
 * Images > Compresses any images/vectors added in 'src/img'
 */
gulp.task('compressing images', () => {
    return gulp.src(`${pkg.paths.src.img}**/*.{png,jpg,jpeg,gif,svg}`)
        .pipe($.newer({dest: pkg.paths.built.img}))
        .pipe($.imagemin([
            $.imagemin.gifsicle({interlaced: true}),
            $.imagemin.jpegtran({progressive: true}),
            $.imagemin.optipng({optimizationLevel: 7}),
            $.imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ]))
        .pipe($.cached('image_min'))
        .pipe(gulp.dest(pkg.paths.built.img));
});

/**
 * SVG Icon > Combine a series of svgs into a single sprite in 'assets/icons.svg'
 */
gulp.task('building svg icon', () => {
    return gulp.src(
        `${pkg.paths.src.icons}*.svg`,
            {base: `${pkg.paths.src.icons}`}
        )
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.svgmin())
        .pipe($.rename({prefix: 'icon-'}))
        .pipe($.svgstore())
        .pipe(gulp.dest(pkg.paths.built.assets))
        .pipe($.browserSync.stream({match: '**/*.svg'}));
});

const defaultTasks = [
    'combining global js',
    'creating inline js',
    'compiling js',
    'compiling css',
    'building svg icon',
    'compressing images',
];

/**
 * This runs when you 'npm run dev' or 'gulp'
 */
gulp.task('default', defaultTasks, () => {

    // Once the default tasks are run we start a series of dev file watchers
    $.browserSync.init(config.browserSync);
    gulp.watch(`${pkg.paths.src.scss}**/*.scss`, ['compiling css']);
    gulp.watch(`${pkg.paths.src.js}**/*.js`, ['compiling js']);
    gulp.watch(`${pkg.paths.src.img}**/*`, ['compressing images']).on('change', $.browserSync.reload);
    gulp.watch(`${pkg.paths.templates}*.twig`).on('change', $.browserSync.reload);
    gulp.watch(`${pkg.paths.src.icons}*.svg`, ['building svg icon']).on('change', $.browserSync.reload);
});


/**
 * Generate and move critical css to the templates folder
 */
function createCriticalCSS(element, i, callback) {
    const criticalSrc = pkg.urls.critical + element.url;
    const criticalDest = `${pkg.paths.templates}_critical/${element.template}_critical.css`;

    let criticalWidth = 1200;
    let criticalHeight = 1200;
    if (element.template.indexOf('amp_') !== -1) {
        criticalWidth = 600;
        criticalHeight = 19200;
    }
    $.critical.generate({
        src: criticalSrc,
        dest: criticalDest,
        inline: false,
        ignore: [],
        base: pkg.paths.built.base,
        css: [
            pkg.paths.built.css + pkg.vars.cssExportName,
        ],
        minify: true,
        width: criticalWidth,
        height: criticalHeight
    }, (err, output) => {
        callback();
    });
}

/**
 * Create critical css with a headless browser
 */
gulp.task('critical-css', ['compiling css'], callback => {
    doSynchronousLoop(pkg.globs.critical, createCriticalCSS, () => {
        callback();
    });
});

// Process data in an array synchronously, moving onto the n+1 item only after the nth item callback
function doSynchronousLoop(data, processData, done) {
    if (data.length > 0) {
        const loop = (data, i, processData, done) => {
            processData(data[i], i, () => {
                if (++i < data.length) {
                    loop(data, i, processData, done);
                } else {
                    done();
                }
            });
        };
        loop(data, 0, processData, done);
    } else {
        done();
    }
}
