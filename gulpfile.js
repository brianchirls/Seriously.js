
var gulp = require('gulp'),
	rjs = require('gulp-requirejs'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	gzip = require('gulp-gzip'),
	rimraf = require('gulp-rimraf'),
	gutil = require('gulp-util'),
	argv = require('yargs').argv;	

 
gulp.task('default', function () {
    return gulp.src('app/tmp', {read: false})
        .pipe(clean());
});



gulp.task('build', ['buildCombine']);


gulp.task('test', function() {
	// TODO: broken test with window.clearTimeout
	var qunit = require('node-qunit-phantomjs');
    qunit('./test/index.html');
});



gulp.task('jshint', function() {

	var jshint = require('gulp-jshint');

	return gulp.src(['./seriously.js', './effects/**.js'])
	.pipe(jshint())
	.pipe(jshint.reporter('default'))

});


gulp.task('clean', function() {
	gulp.src(['./build/**.js','./build/**.js.gz'], { read: false })
	.pipe(rimraf());
});


gulp.task('buildCombine', function() {

	var effects = getListOfEffects();
	var files = (effects.include.length ? effects.include : ['./effects/*.js'])
				.concat(effects.exclude);

	var isCustom = effects.include.length || effects.exclude.length;

	gulp.src(['./seriously.js'].concat(files))

	// concat all files and minify
	.pipe(concat('seriously.min' + (isCustom ? '.custom' : '') + '.js'))
	.pipe(uglify())
	.pipe(gulp.dest('./build/'))

	// gzip 
	.pipe(gzip())
    .pipe(gulp.dest('./build/'));

 });




function getListOfEffects() {

	var fs = require('fs');

	var onFileChecked = function(err, stat) {

		if(err == null) {
		    gutil.log(gutil.colors.green(this));
		} 
		else {
		    gutil.log('Missing:', gutil.colors.red(this));
		}
	}

	var effects, 
		include = [],
		exclude = [];

	if(argv.inc) {
		include = argv.inc.split(' ').map(function(itm) {
			var filepath = './effects/seriously.' + itm + '.js';
			fs.stat(filepath, onFileChecked.bind(filepath));
			return filepath;
		});
	}

	if(argv.exc) {
		exclude = argv.exc.split(' ').map(function(itm) {
			var filepath = './effects/seriously.' + itm + '.js';
			return filepath;
		});
	}


	return {
		include : include,
		exclude : exclude
	};

}
