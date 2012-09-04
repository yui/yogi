/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var log = require('../log'),
    util = require('../util'),
    git = require('../git'),
    path = require('path'),
    fs = require('fs'),
    spawn = require('child_process').spawn, //comma
mods = {
    init: function(options) {
        if (options.parsed.argv.remain.length) {
            this.modules = options.parsed.argv.remain;
        }

        this.options = options;
        
        this.filter = options.parsed.filter;

        if (this.filter == 'coverage') {
            this.coverage = true;
        }

        var module = util.findModule(true),
            self = this;

        if (module && this.modules && this.modules.length) {
            this.modules.unshift(module.name);
            this.modules = util.dedupe(this.modules);
            module = null;
        }
        if (!module) {
            log.debug('not a module, is it yui?');
            if (util.isYUI()) {
                module = {
                    name: 'yui3',
                    dir: path.join(git.findRoot(), '../src')
                };
            } else {
                log.bail('not in a module directory');
            }
        }
        
        this.module = module;
        if (options.parsed.cli) {
            this.cli();
        } else {
            this.cli(function() {
                self.grover();
            });
        }
    },
    buildYUI: function(callback) {
        log.info('installing yui to create npm package');
        var yuibase = path.join(git.findRoot(), '../src/yui'),
            shifter = path.join(__dirname, '../../node_modules/.bin/shifter'),
            child,
            self = this;
        
        child = spawn(shifter, [
            '--config',
            'build-npm.json'
        ], {
            cwd: yuibase
        });

        child.stdout.on('data', function(data) {
            console.log(data.toString().trim());
        });

        child.on('exit', function() {
            log.info('yui install complete, continuing..');
            self.installNPM(callback);
        });
    },
    removeLocalYUITest: function(callback) {
        log.warn('removing localYUITest install');
        var npmbase = path.join(git.findRoot(), '../build-npm'),
            child,
            self = this;

        if (!util.exists(npmbase)) {
            log.error('yui needs to be built first!');
            return self.buildYUI(callback);
        }
        
        child = spawn('npm', [
            'remove',
            'yuitest',
            '-loglevel',
            'silent'
        ], {
            cwd: npmbase
        });

        child.stdout.on('data', function(data) {
            console.log(data.toString().trim());
        });

        child.on('exit', function() {
            log.info('npm removal complete, continuing..');
            self.cli(callback);
        });

    },
    cli: function(callback) {
        log.debug('checking for cli based tests');
        var gbase = path.join(git.findRoot(), '../'),
            yuitestBin = path.join(__dirname, '../../node_modules/.bin/yuitest'),
            YUITest, base, batch,
            self = this, yuitest,
            tests = [], files = [],
            testBase = path.join(this.module.dir, 'tests', 'cli'),
            env = process.env;

        env.NODE_PATH = path.join(__dirname, '../../node_modules');
        
        if (util.exists(path.join(gbase, 'node_modules/.bin/yuitest'))) {
            log.error('Found a local install of YUITest, removing..');
            return this.removeLocalYUITest(callback);
        }
        
        if (util.isYUI() && (this.module.name === 'yui3' || this.modules)) {
            base = path.join(git.findRoot(), '../src');
            batch = fs.readdirSync(base);
            batch.forEach(function(mod) {
                var testBase = path.join(base, mod, 'tests/cli');
                if (util.exists(testBase)) {
                    files = fs.readdirSync(testBase);
                    files.forEach(function(file, key) {
                        var ext = path.extname(file);
                        if (ext === '.js') {
                            tests.push(path.join(testBase, file));
                        }
                    });
                }
            });
            tests.sort();
            tests.push(path.join(gbase, 'src/common/tests/prep.js'));
        } else {
            if (util.exists(testBase)) {
                files = fs.readdirSync(testBase);
                files.forEach(function(file, key) {
                    var ext = path.extname(file);
                    if (ext === '.js') {
                        tests.push(path.join(testBase, file));
                    }
                });
            }
        }

        if (tests.length) {
            log.info('starting cli tests');
            log.debug('executing: ' + yuitestBin + ' ' + tests.join(' '));
            log.log('');
            yuitest = spawn(yuitestBin, tests, {
                env: env
            });
            yuitest.stdout.on('data', function (data) {
                process.stdout.write(data.toString());
            });

            yuitest.stderr.on('data', function (data) {
                data = data.toString().trim();
                log.error('yuitest: ' +  data);
            });

            yuitest.on('exit', function(code) {
                if (code) {
                    log.bail('yuitest returned a failure');
                }
                log.info('yuitest tests complete'.green);
                if (callback) {
                    callback();
                }
            });
        } else {
            log.debug('module does not have cli based tests');
            if (callback) {
                callback();
            }
        }
    },
    grover: function(callback) {
        log.info('starting grover tests');
        var groverBin = path.join(__dirname, '../../node_modules/.bin/grover'),
            tests = [], base, hasCoverage = [], parts = [], tmp,
            gbase = path.join(git.findRoot(), '../'),
            self = this, files, batch, grover,
            exclude = {},
            testPath = path.join(this.module.dir, 'tests', 'unit');

        if (!util.exists(groverBin)) {
            log.bail('grover is not installed :(');
        }

        if (this.options.parsed.x) {
            this.options.parsed.x.forEach(function(m) {
                exclude[m] = true;
            });
        }
        log.debug('scanning ' + testPath);
        log.debug('setting server root to: ' + gbase); 
        process.chdir(gbase);

        if (util.exists(testPath)) {
            files = fs.readdirSync(testPath);
            files.forEach(function(file) {
                if (path.extname(file) === '.html') {
                    if (self.coverage) {
                        if (file.indexOf('coverage') > -1) {
                            hasCoverage.push(file);
                        } else {
                            parts.push(file);
                        }
                    } else {
                        if (file.indexOf('coverage') === -1) {
                            tests.push(path.join(testPath, file));
                        }
                    }
                }
            });
            if (hasCoverage.length) {
                tmp = hasCoverage;
            } else {
                tmp = parts;
            }
            tmp.forEach(function(file) {
                tests.push(path.join(testPath, file));
            });
        } else {
            if (util.isYUI() && (this.module.name === 'yui3' || this.modules)) {
                base = path.join(git.findRoot(), '../src');
                if (!this.modules) {
                    this.modules = [];
                    batch = fs.readdirSync(base);
                    batch.forEach(function(mod) {
                        self.modules.push(mod);
                    });
                }
                this.modules.sort();

                log.info('using override modules: ' + this.modules.sort().join(', '));
                if (Object.keys(exclude).length) {
                    log.warn('excluding the following modules: ' + Object.keys(exclude).sort().join(', '));
                }
                this.modules.forEach(function(mod) {
                    if (exclude[mod]) {
                        return;
                    }
                    var p = path.join(base, mod, 'tests/unit'), files,
                        parts = [], hasCoverage = [], tmp = [];

                    if (util.exists(p)) {
                        files = fs.readdirSync(p);
                        files.forEach(function(file) {
                            if (path.extname(file) === '.html') {
                                if (self.coverage) {
                                    if (file.indexOf('coverage') > -1) {
                                        hasCoverage.push(file);
                                    } else {
                                        parts.push(file);
                                    }
                                } else {
                                    if (file.indexOf('coverage') === -1) {
                                        tests.push(path.join(p, file));
                                    }
                                }
                            }
                        });
                        if (hasCoverage.length) {
                            tmp = hasCoverage;
                        } else {
                            tmp = parts;
                        }
                        tmp.forEach(function(file) {
                            tests.push(path.join(p, file));
                        });
                    }
                });
            } else {
                if (this.module) {
                    log.bail('seems this module does not have tests, you should add some :)');
                } else {
                    log.bail('are you in a module directory?');
                }
            }
        }

        tests.forEach(function(val, key) {
            tests[key] = val.replace(gbase, '');
        });

        if (this.coverage) {
            log.info('turning on coverage support in grover');
            tests.unshift('?filter=coverage');
            tests.unshift('--suffix');
            tests.unshift('--coverage');
            tests.unshift('70');
            tests.unshift('--coverage-warn');
        } else {
            tests.unshift('?filter=' + this.filter);
            tests.unshift('--suffix');
        }
        
        tests.unshift('--server');
        
        if (this.options.parsed.t) {
            tests.unshift(this.options.parsed.t);
            tests.unshift('--timeout');
        }
        if (this.options.parsed.c) {
            tests.unshift(this.options.parsed.c);
            tests.unshift('--concurrent');
        }
        log.debug('executing testing in:\n' + tests.join('\n'));
        grover = spawn(groverBin, tests, {
            cwd: gbase
        });
        
        grover.stdout.on('data', function (data) {
            log.log(data.toString().trim());
        });

        grover.stderr.on('data', function (data) {
            data = data.toString().trim();
            if (data.indexOf('Failed to parse') === -1) {
                log.error('grover: ' +  data);
            }
        });

        grover.on('exit', function(code) {
            if (code) {
                log.bail('grover returned a failure');
            }
            log.info('grover tests complete'.green);
            if (callback) {
                callback();
            }
        });

    },
    help: function() {
        return [
            'test',
            'grover tells you what is wrong',
            'run from inside a module to test it',
            'pass extra modules to test them too.',
            'from ./src to test all',
            '--coverage to generate a coverage report',
            '--cli to run only cli tests',
            '--filter (min|raw|debug) pass filter to test files'
        ];
    }
};

util.mix(exports, mods);
