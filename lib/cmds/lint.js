/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    path = require('path'),
    config = require('../config'),
    fs = require('fs'),
    spawn = require('child_process').spawn,
    linter = require('jslint/lib/linter'),
    lint = require('yui-lint'),
mods = {
    init: function(options) {
        var module = util.findModule(true);
        if (!module) {
            log.bail('not in a module directory, nothing to lint!');
        }
        this.options = options;
        this.module = module.name;
        this.dir = module.dir;
        this.root = path.join(__dirname, '../../node_modules/.bin');
        if (util.exists(path.join(this.dir, 'js'))) {
            this.jslint();
        }
    },
    jslint: function() {
        log.info('running jslint');
        var cmd = path.join(this.root, 'jslint'),
            files = fs.readdirSync(path.join(this.dir, 'js')),
            metaFiles, lintFiles = [],
            metaFilesDir = path.join(this.dir, 'meta'),
            dir = this.dir, results = [],
            self = this, stack = new util.Stack(),
            options = lint[this.options.parsed.lint];
        
        if (util.exists(metaFilesDir)) {
            metaFiles = fs.readdirSync(metaFilesDir);
        }
        if (metaFiles) {
            metaFiles.forEach(function(file) {
                if (path.extname(file) === '.js' || path.extname(file) === '.json') {
                    lintFiles.push(path.join(dir, 'meta', file));
                }
            });
        }
        files.forEach(function(file) {
            if (path.extname(file) === '.js') {
                lintFiles.push(path.join(dir, 'js', file));
            }
        });
        
        lintFiles.forEach(function(file) {
            self._lint(options, file, stack.add(function(res) {
                results.push({
                    file: file,
                    results: res
                });
            }));
        });

        stack.done(function() {
            log.info('lint complete');
            self.print(results);
        });
    
    },
    print: function(errors) {
        var count = 0;
        errors.forEach(function(item) {
            if (!item.results) {
                log.info(item.file + ' is OK');
            } else {
                log.log('');
                log.warn(item.file + ' contains ' + item.results.length + ' lint errors');
                count += item.results.length;
                var counter = 0;
                item.results.forEach(function(line) {
                    if (line) {
                        ++counter;
                        log.log('   #' + counter + ': ' + line.reason.yellow);
                        log.log('       ' + String(line.evidence).trim() + (' // line ' + line.line + ', pos ' + line.character).grey);
                    }
                });
                log.log('');
            }
        });
        if (count > 0) {
            log.warn('lint found a total of ' + count + ' errors.');
        } else {
            log.info('no lint errors detected, good for you!');
        }
    },
    _lint: function(options, file, callback) {
        log.debug('linting ' + file);
        fs.readFile(file, 'utf8', function(err, data) {
            var results = linter.lint(data, options);
            callback(results.errors.length ? results.errors : null);
        });
    },
    help: function() {
        return [
            'lint',
            'lint your files'
        ];
    }
};

util.mix(exports, mods);
