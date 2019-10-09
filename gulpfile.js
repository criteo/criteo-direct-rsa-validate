var gulp = require('gulp');
var concat = require('gulp-concat');
var ts = require('gulp-typescript');
var uglify = require('gulp-uglify');
var rename = require("gulp-rename");
var through = require('through2');
var clean = require("gulp-clean");

gulp.task('build', function() {
    var tsProject = ts.createProject('./tsconfig.json');

    var typescript_error_count = 0;

    var tsResult = tsProject.src()
        .pipe(tsProject({
            reporter: ts.reporter.longReporter(),
            error: function () {
                typescript_error_count++;
                this.reporter.error.apply(this.reporter, arguments);
            },
            finish: function () {
                this.reporter.finish.apply(this.reporter, arguments);
            }
        }));

    return tsResult.js.pipe(gulp.dest('build/'))
        .pipe(through.obj(function (chunk, enc, cb) {
            if (typescript_error_count) {
                this.emit("error", "TypeScript compile errors (count:" + typescript_error_count + ")");
            }
            cb(null, chunk)
        }));
});

gulp.task('bundle', function () {
    return gulp.src("build/**/*.js")
        .pipe(concat("bundle.js"))
        .pipe(gulp.dest("bundle/"));
});

gulp.task('compress', function (cb) {
    return gulp.src('bundle/bundle.js')
        .pipe(uglify())
        .pipe(rename('bundle.min.js'))
        .pipe(gulp.dest('bundle/'));
});

gulp.task('clean_build', function () {
    return gulp.src('build/', {read: false})
        .pipe(clean());
});

gulp.task('clean_bundle', function () {
    return gulp.src('bundle/', {read: false})
        .pipe(clean());
});

gulp.task('default', gulp.series('clean_build', 'build', 'clean_bundle', 'bundle', 'compress', (done) => {done();}));
