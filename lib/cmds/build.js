/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    path = require('path'),
    git = require('../git'),
    tasks = require('../cmds'),
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
                this.options.parsed.argv.original.unshift('--no-lint');
                this.options.parsed.argv.original.unshift('--walk');
            }
            if (!mod) {
                mod = {
                    name: 'gallery',
                    dir: process.cwd()
                };
                log.warn('guessing you want to use shifter --walk here');
                this.options.parsed.argv.original.unshift('--walk');
            }
        }
        this.dir = mod.dir;

        this.build();
    },
    end: function() {
        var self = this;
        if (this.options.parsed.test) {
            log.info('testing module now');
            self.options.callback = function() {
                log.info('build and test complete');
            };
            tasks.test.init(self.options);
        }
    },
    build: function() {
        if (this.ant) {
            this.antBuild(this.end.bind(this));
        } else {
            this.shifterBuild(this.end.bind(this));
        }
    },
    shifterBuild: function(callback) {
        log.info('running with shifter');
        var shifter = path.join(__dirname, '../../node_modules/shifter/bin/shifter'),
            self = this,
            args = this.options.parsed.argv.original,
            child;

        if (this.options.parsed.coverage === false) {
            args.push('--no-coverage');
        }
        
        log.debug(shifter + ' ' + args.join(' '));

        args.unshift(shifter);

        child = spawn(process.argv[0], args, {
            cwd: this.dir,
            stdio: 'inherit'
        });

        child.on('exit', function(code) {
            log.debug('shifter finished, clean up');
            self.clean();
            if (code) {
                log.error('yogi detected an error, exiting code ' + code);
                process.exit(1);
            }
            if (self.complete) {
                self.complete();
            }
            if (callback) {
                callback();
            }
        });
    },
    antBuild: function(callback) {
        log.info('starting ant build, use --loud if you want more noise');
        var self = this,
            child = spawn('ant', [ 'all', '-Dlint.skip=true', '-Dfile.encoding=utf8' ], {
                cwd: this.dir
            }), err, compErr;
            
        child.stdout.on('data', function (data) {
            data = data.toString().trim().split('\n');
            data.forEach(function(line) {
                if (line.indexOf('BUILD FAILED') > -1) {
                    line = log.color(line, 'red');
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
                    line = log.color(line, 'red');
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
            if (callback) {
                callback();
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
            '--ant to use ant instead of shifter',
            '--test execute tests after the build is complete',
            'Any other parameters will be passed down to shifter under the hood (e.g. --watch)'
        ];
    }
};

util.mix(exports, mods);
