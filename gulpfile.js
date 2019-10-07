var gulp = require('gulp');
var concat = require('gulp-concat');
var ts = require('gulp-typescript');
var through = require('through2');

gulp.task('tsc', function() {
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

    return tsResult.js.pipe(gulp.dest('build'))
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