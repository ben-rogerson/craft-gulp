// package vars
const pkg = require("./package.json");

// gulp
const gulp = require("gulp");

// print name of files
const print = require('gulp-print').default;

const notifier = require('node-notifier');

// load all plugins in "devDependencies" into the variable $
const $ = require("gulp-load-plugins")({
    pattern: ["*"],
    scope: ["devDependencies"]
});

const config = {
    compress: true,
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

// handle errors
function handleError(err) {

    const errorMessage = (typeof err.message !== 'undefined') ? err.message.toString() : null
    const errorStack = (typeof err.stack !== 'undefined') ? err.stack.toString() : err

    notifier.notify({
        'title': 'Gulp Error',
        'message': errorMessage
    });

    // If "--quiet parameter is preset, don't display errors"
    var i = process.argv.indexOf("--quiet");
    if(i==-1) console.log($.color(errorStack, 'RED'));

    this.emit('end');
};

// Clean various files/directories
gulp.task('clean', () => {
    $.fancyLog("-> Removing build/built files");
    const filesFolders = [
        `${pkg.paths.temp.base}`, // Remove whole temp folder
        `${pkg.paths.built.css}`, // Remove whole built css folder
        `${pkg.paths.built.js}`, // Remove whole built js folder
        `${pkg.paths.built.img}`, // Remove whole built img folder
        `${pkg.paths.built.static}` // Remove whole built static folder
    ];
    return gulp.src(filesFolders, {read: false}).pipe($.clean());
});

// scss - build the scss to the build folder, including the required paths, and writing out a sourcemap
gulp.task('scss', () => {
    $.fancyLog("-> Compiling SCSS");
    return gulp.src(pkg.paths.src.scss + pkg.vars.scssName)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.sass({
                includePaths: [pkg.paths.scss, 'node_modules']
            }).on("error", $.sass.logError))
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

// css task - combine & minimize any disribution CSS into the public css folder
gulp.task("css", ["scss"], () => {
    $.fancyLog("-> Building CSS");
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

// babel js task - transpile our Javascript into the build directory
gulp.task("js-babel", () => {
    $.fancyLog("-> Transpiling Javascript via Babel");
        return gulp.src(pkg.globs.babelJs)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.newer({dest: pkg.paths.temp.js}))
        .pipe($.babel())
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.temp.js));
});

// js task - minimize any distribution Javascript into the public js folder, and add our banner to it
gulp.task("js-built", ["js-babel"], () => {
    $.fancyLog("-> Building built JS");
    return gulp.src(pkg.globs.distJs)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.if(["*.js", "!*.min.js"],
            $.newer({dest: pkg.paths.built.js, ext: ".min.js"}),
            $.newer({dest: pkg.paths.built.js})
        ))
        .pipe($.if((["*.js", "!*.min.js"] && config.compress),
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
        .pipe($.if(["*.js", "!*.min.js"],
            $.rename({suffix: ".min"})
        ))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.built.js))
        .pipe($.browserSync.stream({match: '**/*.js'}));
});


// inline js task - minimize the inline Javascript into _inlinejs in the templates path
gulp.task("js-inline", () => {
    $.fancyLog("-> Copying inline JS");
    return gulp.src(pkg.globs.inlineJs)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.if(["*.js", "!*.min.js"],
            $.newer({dest: pkg.paths.built.js + "_inlinejs", ext: ".min.js"}),
            $.newer({dest: pkg.paths.built.js + "_inlinejs"})
        ))
        .pipe($.if((["*.js", "!*.min.js"] && config.compress),
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
        .pipe($.if(["*.js", "!*.min.js"],
            $.rename({suffix: ".min"})
        ))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(`${pkg.paths.templates}_inlinejs`));
});

// js task that moves all built js to public
gulp.task("scripts", ["js-built", "js-inline"], () => {
    $.fancyLog("-> Building js");
    return gulp.src(pkg.globs.globalJs)
        .pipe($.plumber({errorHandler: handleError}))
        .pipe($.if((["*.js", "!*.min.js"] && config.compress),
            $.uglify(),
        ))
        .pipe($.concat('plugins.min.js'))
        .pipe($.size({gzip: true, showFiles: true}))
        .pipe(gulp.dest(pkg.paths.built.js))
        .pipe($.browserSync.stream({match: '**/*.js'}));
});

gulp.task('imagemin', () => {
    $.fancyLog("-> Minifying images");
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
        .pipe($.cached("image_min"))
        .pipe(gulp.dest(pkg.paths.built.img));
});

gulp.task('icons', () => {
    return gulp.src(
        `${pkg.paths.src.icons}*.svg`, {base: `${pkg.paths.src.icons}`})
    .pipe($.svgmin())
    .pipe($.svgstore())
    .pipe(gulp.dest(pkg.paths.built.assets))
    .pipe($.browserSync.stream({match: '**/*.svg'}));
});


const defaultTasks = [
    'scripts',
    'css',
    'icons',
    'imagemin',
];

// Default task
gulp.task('default', defaultTasks, () => {
    $.browserSync.init(config.browserSync);
    gulp.watch(`${pkg.paths.src.scss}**/*.scss`, ['css']);
    gulp.watch(`${pkg.paths.src.js}**/*.js`, ['js-built']);
    gulp.watch(`${pkg.paths.src.img}**/*`, ['imagemin']).on('change', $.browserSync.reload);
    gulp.watch(`${pkg.paths.src.icons}*.svg`, ['icons']).on('change', $.browserSync.reload);
});


/**
 *Extra goodies
 */

function processCriticalCSS(element, i, callback) {
    const criticalSrc = pkg.urls.critical + element.url;
    const criticalDest = pkg.paths.templates + "_critical/" + element.template + "_critical.min.css";

    let criticalWidth = 1200;
    let criticalHeight = 1200;
    if (element.template.indexOf("amp_") !== -1) {
        criticalWidth = 600;
        criticalHeight = 19200;
    }
    $.fancyLog("-> Generating critical CSS: " + $.chalk.cyan(criticalSrc) + " -> " + $.chalk.magenta(criticalDest));
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
gulp.task("criticalcss", ["css"], (callback) => {
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
