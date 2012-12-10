/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    path = require('path'),
    git = require('../git'),
    spawn = require('win-spawn'),
    rimraf = require('rimraf'),
mods = {
    init: function(options) {
        this.loud = options.parsed.loud;
        this.quiet = options.parsed.quiet;
        this.ant = options.parsed.ant;
        this.options = options;
        var module = util.getPackage(true),
            mod;
        this.module = module;

        mod = util.findModule(true);
        if (!mod) {
            if (util.isYUI()) {
                mod = {
                    dir: path.join(git.findRoot(), '../src')
                };
                this.ant = false;
                this.options.parsed.argv.original.unshift('--walk');
            }
            if (!mod) {
                log.bail('yogi does not know what to do here..');
            }
        }
        this.dir = mod.dir;

        this.build();
    },
    build: function() {
        if (this.ant) {
            this.antBuild();
        } else {
            this.shifterBuild();
        }
    },
    shifterBuild: function() {
        log.info('running with shifter');
        var shifter = path.join(__dirname, '../../node_modules/.bin/shifter'),
            self = this,
            args = this.options.parsed.argv.original,
            child;
        
        log.debug(shifter + ' ' + args.join(' '));

        child = spawn(shifter, args, {
                cwd: this.dir
            });

        child.stdout.on('data', function (data) {
            process.stdout.write(data.toString());
        });

        child.stderr.on('data', function (data) {
            process.stdout.write(data.toString());
        });

        child.on('exit', function(code) {
            log.debug('shifter finished, clean up');
            self.clean();
            if (code) {
                log.error('yogi detected an error, exiting code ' + code);
                process.exit(1);
            }
        });
    },
    antBuild: function() {
        log.info('starting ant build, use --loud if you want more noise');
        var self = this,
            child = spawn('ant', [ 'all', '-Dlint.skip=true', '-Dfile.encoding=utf8' ], {
                cwd: this.dir
            }), err, compErr;
            
        child.stdout.on('data', function (data) {
            data = data.toString().trim().split('\n');
            data.forEach(function(line) {
                if (line.indexOf('BUILD FAILED') > -1) {
                    line = line.red;
                }
                if (line.indexOf('[yuicompressor]') > -1) {
                    if (line.indexOf('WARNING') > -1) {
                        if (!self.quiet) {
                            compErr = true;
                        }
                    }
                } else {
                    compErr = null;
                }
                var fn = log.debug;
                if (self.loud || line.indexOf('BUILD') > -1 || line.indexOf('Total time') > -1) {
                    fn = log.info;
                }
                if (compErr) {
                    fn = log.warn;
                }
                fn.call(log, line);
            });
        });

        child.stderr.on('data', function (data) {
            data = data.toString().trim().split('\n');
            data.forEach(function(line) {
                if (line.indexOf('BUILD FAILED') > -1) {
                    line = line.red;
                }
                if (line.indexOf('WARNING') > -1) {
                    if (!self.quiet) {
                        log.warn(line);
                    }
                } else {
                    log.error(line);
                    err = true;
                }
            });
        });

        child.on('exit', function() {
            log.debug('ant finished, clean up');
            self.clean();
            if (err) {
                log.error('yogi detected an error, exiting code 1');
                process.exit(1);
            }
        });
        
    },
    clean: function() {
        log.debug('cleaning up');
        var buildTmp = path.join(this.dir, 'build_tmp');
        rimraf.sync(buildTmp);

        buildTmp = path.join(this.dir, 'build_rollup_tmp');
        rimraf.sync(buildTmp);
        log.info('build complete');
    },
    help: function() {
        return [
            'build',
            'builds your module, duh!',
            '--loud for more info',
            '--ant to use ant instead of shifter'
        ];
    }
};

util.mix(exports, mods);
