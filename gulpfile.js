'use strict';

const del = require('del');
const fs = require('fs');
const gulp = require('gulp');
const glob = require('glob');
const exec = require('child_process').execSync;
const install = require('gulp-install');
const modules = require('./package.json').modules;

gulp.task('clean', () => {
  return del([
    process.env.TARGET_OUTPUT_DIR + '/target/usr/lib/node_modules',
  ], {
    force: true
  });
});

gulp.task('install-remote', ['clean'], () => {
  let cmd = 'npm install --global';
  for (let name in modules.remote) {
    let version = modules.remote[name];
    cmd += ` ${name}@${version}`;
  }
  exec(cmd);
});

gulp.task('install-local', ['clean'], () => {
  let files = modules.local.map((str) => {
    const meta = str.split(':');
    const pathname = meta[0];
    const depname = meta[1] || '';
    const checkPath = process.env.TARGET_OUTPUT_DIR + `/build/${depname}*`;
    console.log(checkPath);
    if (!depname || glob.sync(checkPath).length >= 1) {
      return pathname + '/package.json';
    } else {
      return false;
    }
  }).filter((pathname) => {
    return pathname !== false;
  });
  return gulp.src(files).pipe(install({npm: '--global'}));
});

gulp.task('default', ['install-remote', 'install-local'], () => {
  const prefix = process.env.TARGET_OUTPUT_DIR + '/target/usr/lib/node_modules';
  return del([
    `${prefix}/**/build/*.*`,
    `${prefix}/**/build/deps`,
    `${prefix}/**/build/Makefile`,
    `${prefix}/**/build/Release/*`,
    `${prefix}/**/build/Release/.deps`,
    `!${prefix}/**/build/Release/*.node`,
  ], {
    force: true
  });
});