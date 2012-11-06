/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    path = require('path'),
    fs = require('fs'),
    linter = require('jshint').JSHINT,
    lint = require('yui-lint'),
mods = {
    init: function(options) {
        var module = util.findModule(true, true);
        if (!module) {
            log.bail('not in a module directory, nothing to lint!');
        }
        this.options = options;
        this.module = module.name;
        this.dir = module.dir;
        this.root = path.join(__dirname, '../../node_modules/.bin');
        log.debug('linting: ' + this.dir);
        if (util.exists(path.join(this.dir, 'js'))) {
            this.jslint();
        }
    },
    jslint: function() {
        log.info('running jslint on source files');
        var files = fs.readdirSync(path.join(this.dir, 'js')),
            metaFiles, lintFiles = [],
            metaFilesDir = path.join(this.dir, 'meta'),
            dir = this.dir,
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
                var out = {
                    file: file,
                    results: res
                };
                return out;
            }));
        });

        stack.done(function() {
            log.info('lint complete');
            self.print(stack.results);
        });

    },
    fileSort: function(a, b) {
        if (!a.file || !b.file) {
            return 0;
        }
        var an = a.file.toLowerCase(),
            bn = b.file.toLowerCase(),
            ret = 0;

        if (an < bn) {
            ret = -1;
        }
        if (an > bn) {
            ret =  1;
        }
        return ret;
    },
    print: function(errors) {
        var count = 0;
        errors.sort(this.fileSort);
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
            if (this.options.fail) {
                log.bail('exiting with lint errors');
            }
        } else {
            log.info('no lint errors detected, good for you!');
            if (this.options.callback) {
                this.options.callback();
            }
        }
    },
    _lint: function(options, file, callback) {
        log.debug('linting ' + file);
        fs.readFile(file, 'utf8', function(err, data) {
            if (path.dirname(file).indexOf('meta') > -1 && path.extname(file) === '.js') {
                log.info('tweaking meta test js file for lint');
                data = '(\n' + data + ')();';
            }
            linter(data, options);
            callback(linter.errors.length ? linter.errors : null);
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
