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
        
        this.coverage = options.parsed.coverage;

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
                    name: 'yui',
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
            this.test(function() {
                self.cli();
            });
        }
    },
    cli: function() {
        log.debug('checking for cli based tests');
        var gbase = path.join(git.findRoot(), '../'),
            yuitestBin = path.join(gbase, 'node_modules/.bin/yuitest'),
            self = this, yuitest,
            testPath = path.join(this.module.dir, 'tests', 'cli', 'run.js');
        
        if (!util.exists(testPath)) {
            log.debug('no cli tests found, bailing');
            process.exit(0);
        }

        if (!util.exists(yuitestBin)) {
            log.bail('Could not locate yuitest in: ' + yuitestBin);
        }
        
        if (util.exists(testPath)) {
            log.info('starting cli tests');
            log.debug('executing: ' + yuitestBin + ' ' + testPath);
            log.log('');
            yuitest = spawn(yuitestBin, [testPath], {
                cwd: gbase
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
            });
        } else {
            log.debug('module does not have cli based tests');
        }
    },
    test: function(cb) {
        log.info('starting grover tests');
        var groverBin = path.join(__dirname, '../../node_modules/.bin/grover'),
            tests = [], base, hasCoverage = [], parts = [], tmp,
            gbase = path.join(git.findRoot(), '../'),
            self = this, files, batch, grover,
            testPath = path.join(this.module.dir, 'tests', 'unit');

        if (!util.exists(groverBin)) {
            log.bail('grover is not installed :(');
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
            if (util.isYUI() && (this.module.name === 'yui' || this.modules)) {
                base = path.join(git.findRoot(), '../src');
                if (!this.modules) {
                    this.modules = [];
                    batch = fs.readdirSync(base);
                    batch.forEach(function(mod) {
                        self.modules.push(mod);
                    });
                }
                this.modules.sort();
                log.info('using override modules: ' + this.modules.join(', '));
                this.modules.forEach(function(mod) {
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
        }
        tests.unshift('--server');
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
            cb();
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
            '--cli to run only cli tests'
        ];
    }
};

util.mix(exports, mods);
