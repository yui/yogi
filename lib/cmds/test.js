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
        var module = util.findModule(true);
        if (module && this.modules.length) {
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
        this.test();
    },
    test: function() {
        log.info('starting grover tests');
        var groverBin = path.join(__dirname, '../../node_modules/.bin/grover'),
            tests = [], base,
            self = this, files, batch, grover,
            testPath = path.join(this.module.dir, 'tests', 'unit');

        if (!util.exists(groverBin)) {
            log.bail('grover is not installed :(');
        }
        log.debug('scanning ' + testPath);

        if (util.exists(testPath)) {
            files = fs.readdirSync(testPath);
            files.forEach(function(file) {
                if (path.extname(file) === '.html') {
                    tests.push(path.join(testPath, file));
                }
            });
        } else {
            if (util.isYUI() && (this.module.name === 'yui' || this.modules)) {
                if (this.modules) {
                    log.info('using override modules: ' + this.modules.join(', '));
                    base = path.join(git.findRoot(), '../src');
                    this.modules.forEach(function(mod) {
                        var p = path.join(base, mod, 'tests/unit'), files;
                        if (util.exists(p)) {
                            files = fs.readdirSync(p);
                            files.forEach(function(file) {
                                if (path.extname(file) === '.html') {
                                    tests.push(path.join(p, file));
                                }
                            });
                        }
                    });
                } else {
                    log.info('we are in YUI but not in a module, batching');
                    batch = path.join(git.findRoot(), '../src/common/node/batch.js');
                    tests = ['-i', batch];
                }
            } else {
                if (this.module) {
                    log.bail('seems this module does not have tests, you should add some :)');
                } else {
                    log.bail('are you in a module directory?');
                }
            }
        }
        log.debug('executing testing in:\n' + tests.join('\n'));
        grover = spawn(groverBin, tests, {
            cwd: this.module.dir
        });
        
        grover.stdout.on('data', function (data) {
            log.log(data.toString().trim());
        });

        grover.stderr.on('data', function (data) {
            log.error('grover: ' +  data.toString().trim());
        });

        grover.on('exit', function(code) {
            if (code) {
                log.bail('grover returned a failure');
            }
            log.info('grover tests complete'.green);
        });

    },
    help: function() {
        return [
            'test',
            'grover tells you what is wrong: run from inside a module to test it, pass extra modules to test them too. From ./src to test all'
        ];
    }
};

util.mix(exports, mods);
