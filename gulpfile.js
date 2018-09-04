const pkg = require('./package.json');
const gulp = require('gulp');
const notifier = require('node-notifier');
const exec = require('child_process').exec;
const combine = require('stream-combiner2');
const sequence = require('run-sequence');
const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const isDev = environment === 'development';
const isProd = environment === 'production';

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
    compress: isProd, // minify/compress css and js resources
    browserSync: {
        proxy: pkg.config.devUrl,
        // files: [
        //     `${pkg.config.public.scripts}/**/*.js`
        //     `${pkg.config.public.templates}/**/*.twig`,
        // ],
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
 * Write a versions file to the build folder
 */
const writeVersionFile = () => { return (
    combine.obj([
        $.rev.manifest(pkg.config.versions, {
            merge: true,
            base: pkg.config.public.assets,
        }),
        gulp.dest(pkg.config.public.assets)
    ])
)}

/**
 * Transform scripts with babel and browserify
 */
const browserify = () => (
    combine(
        $.bro({
            transform: [
                [ 'babelify', { global: true } ],
                'browserify-shim'
            ],
            paths: ['node_modules', pkg.config.public.scripts],
            error: error => handleError(error, false)
        })
    )
)

/**
 * Compress css with uglify
 */
const compressScripts = () => (
    combine(
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
        })
    )
)

/**
 * Delete files from various directories
 */
gulp.task('clean', () => (
    gulp.src([
        pkg.config.versions, // Remove versions file
        pkg.config.public.assets, // Remove whole built assets folder
    ], {read: false}).pipe($.clean())
));

/**
 * Handle project styles
 */
gulp.task('styles', () => (
    gulp.src(pkg.config.stylesMain.source)
    .pipe($.plumber({errorHandler: handleError}))
    .pipe($.sassVariables({
        $isDev: isDev
    }))
    .pipe($.sass({
        includePaths: ['node_modules']
    }))
    .pipe($.cached('styles'))
    .pipe($.autoprefixer({
        browsers: [
            '> 0.5% in AU',
            'last 3 years',
            'iOS >= 7',
            'ie >= 10'
        ]
    }))
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
    .pipe($.size({gzip: true, showFiles: true}))
    .pipe($.rename(pkg.config.stylesMain.destination))
    .pipe($.if(isProd, $.rev()))
    .pipe(gulp.dest(pkg.config.public.base))
    .pipe($.if(isProd, writeVersionFile()))
    .pipe($.browserSync.stream({match: '**/*.css'}))
));

/**
 * Main script task
 */
gulp.task('scripts:main', () => (
    gulp.src(pkg.config.scriptsMain.source)
    .pipe(browserify())
    .pipe($.if(config.compress, compressScripts()))
    .pipe($.size({gzip: true, showFiles: true}))
    .pipe($.rename(pkg.config.scriptsMain.destination))
    .pipe($.if(isProd, $.rev()))
    .pipe(gulp.dest(pkg.config.public.base))
    .pipe($.if(isProd, writeVersionFile()))
    .pipe($.browserSync.stream({match: '**/*.js'}))
));

/**
 * Scripts > Create additional javascript files.
 * These scripts are for loading on specific pages.
 */
gulp.task('scripts:singles', () => (
    gulp.src(pkg.config.scriptsSingles.source)
    .pipe($.plumber({errorHandler: handleError}))
    .pipe($.if(['*.js'],
        $.newer({dest: pkg.config.scriptsSingles.destination})
    ))
    .pipe(browserify())
    .pipe($.if(config.compress, compressScripts()))
    .pipe($.rename({dirname: pkg.config.scriptsSingles.destination}))
    .pipe($.size({gzip: true, showFiles: true}))
    .pipe($.if(isProd, $.rev()))
    .pipe(gulp.dest(pkg.config.public.base))
    .pipe($.if(isProd, writeVersionFile()))
));

/**
 * JS > Combines scripts into a single 'assets/js/plugins.js' package
 * Runs once at the beginning of the dev/prod process
 */
gulp.task('scripts:vendor', () => (
    gulp.src(pkg.config.scriptsVendor.source)
    .pipe($.plumber({errorHandler: handleError}))
    .pipe(browserify())
    .pipe($.if(config.compress, compressScripts()))
    .pipe($.concat(pkg.config.scriptsVendor.destination))
    .pipe($.size({gzip: true, showFiles: true}))
    .pipe($.if(isProd, $.rev()))
    .pipe(gulp.dest(pkg.config.public.base))
    .pipe($.if(isProd, writeVersionFile()))
    .pipe($.browserSync.stream({match: '**/*.js'}))
));

/**
 * Images > Compress images/vectors
 */
gulp.task('images', () => (
    gulp.src(pkg.config.images.source)
    .pipe($.newer({dest: `${pkg.config.public.base}/${pkg.config.images.destination}`}))
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
    .pipe($.cached('images'))
    .pipe($.rename({dirname: pkg.config.images.destination}))
    .pipe($.if(isProd, $.rev()))
    .pipe(gulp.dest(pkg.config.public.base))
    .pipe($.if(isProd, writeVersionFile()))
));

/**
 * SVG Icon > Combine a series of svgs into a single sprite in 'assets/icons.svg'
 */
gulp.task('icons', () => (
    gulp.src(pkg.config.icons.source)
    .pipe($.plumber({errorHandler: handleError}))
    .pipe($.svgmin())
    .pipe($.rename({prefix: 'icon-'}))
    .pipe($.svgstore())
    .pipe($.rename(pkg.config.icons.destination))
    .pipe($.if(isProd, $.rev()))
    .pipe(gulp.dest(pkg.config.public.base))
    .pipe($.if(isProd, writeVersionFile()))
    .pipe($.browserSync.stream({match: '**/*.svg'}))
));


// We run in sequence so build files can be deleted first and to avoid
// overwriting the versions file if everything tries to save at the same time.
gulp.task('build', callback => (
    sequence(
        'clean',
        'styles',
        'scripts:main',
        'scripts:singles',
        'scripts:vendor',
        'images',
        'icons',
        callback
    )
));

/**
 * This runs when running 'npm run start' or 'gulp'
 */
gulp.task('default', ['build'], () => {

    // Once the assets are built start watching files for changes
    $.browserSync.init(config.browserSync);
    gulp.watch(pkg.config.stylesMain.watch, ['styles']);
    gulp.watch(pkg.config.scriptsMain.watch, ['scripts:main']);
    gulp.watch(pkg.config.images.watch, ['images']).on('change', $.browserSync.reload);
    gulp.watch(pkg.config.templates.watch).on('change', $.browserSync.reload);
    gulp.watch(pkg.config.icons.watch, ['icons']).on('change', $.browserSync.reload);
});

/**
 * Generate and move critical css to the templates folder
 */
function createCriticalCSS(element, i, callback) {
    const criticalSrc = pkg.urls.critical + element.url;
    const criticalDest = `${pkg.config.public.templates}_critical/${element.template}_critical.css`;
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
        base: pkg.config.public.base,
        css: [
            `${pkg.config.public.base}/${pkg.config.stylesMain.destination}`,
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
gulp.task('critical-css', ['styles'], callback => {
    doSynchronousLoop(pkg.config.critical, createCriticalCSS, () => {
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
