// ======================
// Setting this to true will remove sourcemaps, breakpoint display etc but your assets will be production ready.
const doProductionBuild = false;
//========================
const pkg = require('./package.json');
const gulp = require('gulp');
const notifier = require('node-notifier');
const exec = require('child_process').exec;
const stream = require('stream-combiner2');
const sequence = require('run-sequence');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const environment =
	doProductionBuild || process.env.NODE_ENV === 'production'
		? 'production'
		: 'development';
const isDev = environment === 'development';
const isProd = environment === 'production';
const os = require('os');
const buffer = require('vinyl-buffer');
const revDel = require('rev-del');
const uglify = require('gulp-uglify-es').default;

// load all plugins in 'devDependencies' into the variable $
const $ = require('gulp-load-plugins')({
	pattern: ['*'],
	scope: ['devDependencies'],
});

// Show environment
console.log($.color(
	`===================================

Environment is set to '${environment}'

===================================
`, (isDev ? 'YELLOW' : 'GREEN')));

/**
 * Play a wav file
 */
const playSound = filePath => {
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
const writeVersionFile = () => (
	stream.obj([
		$.rename(path =>
			path.dirname = path.dirname.replace(pkg.config.public.base, '')
		),
		$.rev.manifest(pkg.config.manifest.destination, {
			merge: true,
			base: pkg.config.public.build
		}),
		revDel({
			oldManifest: pkg.config.manifest.destination,
			dest: pkg.config.public.base,
		}),
		gulp.dest(pkg.config.public.build)
	])
);

/**
 * Delete build files
 */
gulp.task('clean', () => (
	gulp.src([
		pkg.config.public.build, // Remove whole build folder
	], { read: false }).pipe($.clean())
));

/**
 * Handle stylesheets
 */
gulp.task('styles:base', () => {
	const plugins = [
		autoprefixer({
			browsers: [
				'> 0.5% in AU',
				'last 3 years',
				'iOS >= 7',
				'ie >= 10'
			]
		})
	];
	if (isProd) plugins.push(
		cssnano({
			safe: true,
			autoprefixer: false,
			discardComments: {
				removeAll: true
			},
			discardDuplicates: true,
			discardEmpty: true,
			minifyFontValues: false,
			minifySelectors: true
		})
	);
	return gulp.src(pkg.config.styles.source)
		.pipe($.plumber({ errorHandler: handleError }))
		.pipe($.if(isDev, $.sourcemaps.init({ loadMaps: true })))
		.pipe($.sassVariables({ $isDev: isDev }))
		.pipe($.sass({ includePaths: ['node_modules'] }))
		.pipe($.cached('styles'))
		.pipe($.postcss(plugins))
		.pipe($.size({ gzip: true, showFiles: true }))
		.pipe($.rename({ dirname: pkg.config.styles.destination }))
		.pipe($.if(isProd, $.rev()))
		.pipe($.if(isDev, $.sourcemaps.write('.')))
		.pipe(gulp.dest('.'))
		.pipe($.if(isProd, writeVersionFile()))
		.pipe($.browserSync.stream({ match: '**/*.css' }))
});

/**
 * Handle revisioned assets in built stylesheets
 */
gulp.task('styles:revision', () => (
	gulp.src(`${pkg.config.styles.destination}/*.css`)
		.pipe($.revRewrite({
			manifest: gulp.src(pkg.config.manifest.destination),
			prefix: '/',
		}))
		.pipe(gulp.dest(pkg.config.styles.destination))
));

gulp.task('styles', callback => (
	sequence(
		'styles:base',
		'styles:revision',
		callback
	)
));

/**
 * Handle javascript
 */
gulp.task('scripts:main', () => (
	gulp.src(pkg.config.scripts.source)
		.pipe((
			stream(
				$.bro({
					transform: [
						['browserify-shim', { global: true }],
						['babelify', { global: true }],
					],
					debug: isDev,
					paths: ['node_modules', pkg.config.scripts.destination],
					error: error => handleError(error, false)
				})
			)
		))
		.pipe(buffer())
		.pipe($.if(isDev, $.sourcemaps.init({ loadMaps: true })))
		.pipe($.size({ gzip: true, showFiles: true }))
		.pipe($.rename({ dirname: pkg.config.scripts.destination }))
		.pipe($.if(isProd, $.rev()))
		.pipe($.if(isDev, $.sourcemaps.write('.')))
		.pipe(gulp.dest('.'))
		.pipe($.if(isProd, writeVersionFile()))
		.pipe($.browserSync.stream({ match: '**/*.js' }))
));

gulp.task('scripts:uglify', () => (
	gulp.src(`${pkg.config.scripts.destination}/*.js`)
		.pipe($.if(isProd, uglify({
			compress: {
				unused: true,
				sequences: true,
				dead_code: true,
				booleans: true,
				drop_debugger: true,
				conditionals: true,
				if_return: false,
				evaluate: true,
				drop_console: false,
				keep_fnames: true,
				warnings: false
			},
			mangle: true,
			output: {
				comments: false
			},
			nameCache: null,
			toplevel: false,
			ie8: false,
			warnings: false,
		})))
		.pipe(gulp.dest(`${pkg.config.scripts.destination}`))
));

gulp.task('scripts', callback => (
	sequence(
		'scripts:main',
		'scripts:uglify',
		callback
	)
));

/**
 * Handle image/vector compression
 */
gulp.task('images', () => (
	gulp.src(pkg.config.images.source)
		.pipe($.newer({ dest: `${pkg.config.public.base}/${pkg.config.images.destination}` }))
		.pipe($.imagemin([
			$.imagemin.gifsicle({ interlaced: true }),
			$.imagemin.jpegtran({ progressive: true }),
			$.imagemin.optipng({ optimizationLevel: 7 }),
			$.imagemin.svgo({
				plugins: [
					{ removeViewBox: false },
					{ cleanupIDs: false }
				]
			})
		]))
		.pipe($.cached('images'))
		.pipe($.rename({ dirname: pkg.config.images.destination }))
		.pipe($.if(isProd, $.rev()))
		.pipe(gulp.dest('.'))
		.pipe($.if(isProd, writeVersionFile()))
));

/**
 * Handle SVG icon sprite
 */
gulp.task('icons', () => (
	gulp.src(pkg.config.icons.source)
		.pipe($.plumber({ errorHandler: handleError }))
		.pipe($.svgmin({
			plugins: [
				{ convertColors: { currentColor: true } },
				{ removeDimensions: false },
				{ removeViewBox: false }
			]
		}))
		.pipe($.rename({ prefix: 'icon-' }))
		.pipe($.svgstore())
		.pipe($.rename(pkg.config.icons.destination))
		.pipe($.if(isProd, $.rev()))
		.pipe(gulp.dest('.'))
		.pipe($.if(isProd, writeVersionFile()))
		.pipe($.browserSync.stream({ match: '**/*.svg' }))
));

/**
 * Handle favicons
 */
gulp.task('favicons', () => (
	gulp.src(pkg.config.favicons.source)
		.pipe($.size({ gzip: true, showFiles: true }))
		.pipe($.rename({ dirname: pkg.config.favicons.destination }))
		.pipe($.if(isProd, $.rev()))
		.pipe(gulp.dest('.'))
		.pipe($.if(isProd, writeVersionFile()))
));

/**
 * Handle fonts
 */
gulp.task('fonts', () => (
	gulp.src(pkg.config.fonts.source)
		.pipe(gulp.dest(pkg.config.fonts.destination))
));

// We run in sequence so build files can be deleted first and to avoid
// overwriting the versions file if everything tries to save at the same time.
gulp.task('build', callback => (
	sequence(
		'clean',
		'styles',
		'scripts',
		'images',
		'icons',
		'favicons',
		'fonts',
		callback
	)
));

/**
 * This runs when running 'npm run start' or 'gulp'
 */
gulp.task('default', ['build'], () => {

	// Once the assets are built start watching files for changes
	$.browserSync.init({
		proxy: pkg.config.devUrl,
		ghostMode: { scroll: false },
		notify: false,
		open: false,
		https: true,
	});
	isProd && gulp.watch(pkg.config.styles.watch, ['styles']).on('change', $.browserSync.reload);
	isDev && gulp.watch(pkg.config.styles.watch, ['styles']);
	gulp.watch(pkg.config.scripts.watch, ['scripts']);
	gulp.watch(pkg.config.images.watch, ['images']).on('change', $.browserSync.reload);
	gulp.watch(pkg.config.templates.watch).on('change', $.browserSync.reload).on('error', error => handleError(error, false));
	gulp.watch(pkg.config.icons.watch, ['icons']).on('change', $.browserSync.reload);
	gulp.watch(pkg.config.favicons.watch, ['favicons']).on('change', $.browserSync.reload);
	gulp.watch(pkg.config.fonts.watch, ['fonts']).on('change', $.browserSync.reload);
});
