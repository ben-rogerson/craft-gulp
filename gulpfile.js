const pkg = require('./package.json');
const gulp = require('gulp');
const print = require('gulp-print').default;
const notifier = require('node-notifier');
const exec = require('child_process').exec;

// load all plugins in 'devDependencies' into the variable $
const $ = require('gulp-load-plugins')({
    pattern: ['*'],
    scope: ['devDependencies']
});

const config = {
    compress: false,
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

// Handle errors

const beep = () => {
    var os = require('os');
    var file = './config/error.wav';
    if (os.platform() === 'linux') {
      exec('aplay ' + file);
    } else {
      exec('afplay ' + file);
    }
};

function handleError(err) {
    beep();
    const errorMessage = (typeof err.message !== 'undefined') ? err.message.toString() : null
    notifier.notify({
        'title': 'Error',
        'message': errorMessage.split('\n')[0]
    });
    const errorStack = (typeof err.stack !== 'undefined') ? err.stack.toString() : err
    console.log($.color(errorStack, 'RED'));
    // this.emit('end');
};

// Clean various files/directories
gulp.task('clean', () => {
    const filesFolders = [
        `${pkg.paths.temp.base}`, // Remove whole temp folder
        `${pkg.paths.built.css}`, // Remove whole built css folder
        `${pkg.paths.built.js}`, // Remove whole built js folder
        `${pkg.paths.built.img}`, // Remove whole built img folder
        `${pkg.paths.built.static}` // Remove whole built static folder
    ];
    return gulp.src(filesFolders, {read: false}).pipe($.clean());
});

// Task to import and prefix css
gulp.task('prefixing css', () => {
    return gulp.src(pkg.paths.src.scss + pkg.vars.scssName)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.sass({
            includePaths: [pkg.paths.scss, 'node_modules']
        }))
        .pipe($.cached("sass_compile"))
        .pipe($.autoprefixer({
            browsers: [
                '> 0.5% in AU',
                'last 3 years',
                'iOS >= 7',
                'ie >= 10'
            ]
        }))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.temp.css));
});

// Task to compile css
gulp.task('combining css', ['prefixing css'], () => {
    return gulp.src(pkg.globs.distCss)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.newer({dest: pkg.paths.built.css + pkg.vars.siteCssName}))
        .pipe(print())
        .pipe($.concat(pkg.vars.siteCssName))
        .pipe(
            $.if((config.compress),
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
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.built.css))
        .pipe($.browserSync.stream({match: '**/*.css'}));
});

// babel js task - transpile our js into the build directory
gulp.task('transpiling js', () => {
    return gulp.src(pkg.globs.babelJs)
        .pipe($.bro({
            transform: [
                [ 'babelify', { global: true } ]
            ],
            paths: ['./node_modules', pkg.paths.src.js],
            error: error => handleError(error)
        }))
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.temp.js));
});

// js task - minimize any distribution js into the public js folder
gulp.task('moving js to build', ['transpiling js'], () => {
    return gulp.src(pkg.globs.distJs)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.if(['*.js', '!*.min.js'],
            $.newer({dest: pkg.paths.built.js, ext: '.min.js'}),
            $.newer({dest: pkg.paths.built.js})
        ))
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
        .pipe($.if(['*.js', '!*.min.js'],
            $.rename({suffix: '.min'})
        ))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.built.js))
        .pipe($.browserSync.stream({match: '**/*.js'}));
});


// Inline js into _inlinejs  within templates + Maybe minimize
gulp.task('inlining js', () => {
    return gulp.src(pkg.globs.inlineJs)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.if(['*.js', '!*.min.js'],
            $.newer({dest: `${pkg.paths.built.js}_inlinejs`, ext: '.min.js'}),
            $.newer({dest: `${pkg.paths.built.js}_inlinejs`})
        ))
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
        .pipe($.if(['*.js', '!*.min.js'],
            $.rename({suffix: '.min'})
        ))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(`${pkg.paths.templates}_inlinejs`));
});

// js task that moves all built js to public
gulp.task('combining js', ['moving js to build', 'inlining js'], () => {
    return gulp.src(pkg.globs.globalJs)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.if((['*.js', '!*.min.js'] && config.compress),
            $.uglify(),
        ))
        .pipe($.concat('plugins.min.js'))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.built.js))
        .pipe($.browserSync.stream({match: '**/*.js'}));
});

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

gulp.task('building svg icon', () => {
    return gulp.src(
        `${pkg.paths.src.icons}*.svg`,
            {base: `${pkg.paths.src.icons}`}
        )
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.svgmin())
        .pipe($.svgstore())
        .pipe(gulp.dest(pkg.paths.built.assets))
        .pipe($.browserSync.stream({match: '**/*.svg'}));
});

const defaultTasks = [
    'combining js',
    'combining css',
    'building svg icon',
    'compressing images',
];

// Default task
gulp.task('default', defaultTasks, () => {
    $.browserSync.init(config.browserSync);
    gulp.watch(`${pkg.paths.src.scss}**/*.scss`, ['combining css']);
    gulp.watch(`${pkg.paths.src.js}**/*.js`, ['moving js to build']);
    gulp.watch(`${pkg.paths.src.img}**/*`, ['compressing images']).on('change', $.browserSync.reload);
    gulp.watch(`${pkg.paths.src.icons}*.svg`, ['building svg icon']).on('change', $.browserSync.reload);
});


/**
 *Extra goodies
 */

function processCriticalCSS(element, i, callback) {
    const criticalSrc = pkg.urls.critical + element.url;
    const criticalDest = pkg.paths.templates + '_critical/' + element.template + '_critical.min.css';

    let criticalWidth = 1200;
    let criticalHeight = 1200;
    if (element.template.indexOf('amp_') !== -1) {
        criticalWidth = 600;
        criticalHeight = 19200;
    }
    $.fancyLog('-> Generating critical CSS: ' + $.chalk.cyan(criticalSrc) + ' -> ' + $.chalk.magenta(criticalDest));
    $.critical.generate({
        src: criticalSrc,
        dest: criticalDest,
        inline: false,
        ignore: [],
        base: pkg.paths.built.base,
        css: [
            pkg.paths.built.css + pkg.vars.siteCssName,
        ],
        minify: true,
        width: criticalWidth,
        height: criticalHeight
    }, (err, output) => {
        callback();
    });
}

//critical css task
gulp.task('criticalcss', ['css'], (callback) => {
    doSynchronousLoop(pkg.globs.critical, processCriticalCSS, () => {
        // all done
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
