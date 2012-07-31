/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    path = require('path'),
    config = require('../config'),
    spawn = require('child_process').spawn,
    predef = [
        "YUI", "window", "YUI_config", "YAHOO", "YAHOO_config", "Event",
        "opera", "exports", "document", "navigator", "console", "self", "require",
        "module", "process", "__dirname", "__filename"
    ];

var mods = {
    init: function(options) {
        this.strict = options.parsed.strict || config.get('strictLint');
        this.showIgnored = options.parsed.all;
        if (config.get('strictLint')) {
            log.warn('strict linting enabled by config');
        }

        var module = util.findModule(true);
        if (!module) {
            log.bail('not in a module directory, nothing to lint!');
        }
        this.module = module.name;
        this.dir = module.dir;
        this.root = path.join(__dirname, '../../node_modules/.bin');
        if (util.exists(path.join(this.dir, 'js'))) {
            this.jslint();
        }
    },
    args: [
        '--json',
        '--eqeq', 
        '--color',
        '--browser',
        '--undef', 
        '--newcap',
        '--white',
        '--nomen', 
        '--sloppy',
        '--regexp',
        '--continue',
        '--vars',
        '--plusplus',
        '--maxerr 500',
        '--predef "' + predef.join(',') + '"',
        '--'
    ],
    jslint: function() {
        log.info('running jslint');
        var cmd = path.join(this.root, 'jslint');
        var args = this.args;
        var files = fs.readdirSync(path.join(this.dir, 'js'));
        var metaFiles;
        var metaFilesDir = path.join(this.dir, 'meta');
        if (util.exists(metaFilesDir)) {
            metaFiles = fs.readdirSync(metaFilesDir);
        }
        var dir = this.dir;
        var self = this;
        var buffer = '';
        if (metaFiles) {
            metaFiles.forEach(function(file) {
                if (path.extname(file) === '.js' || path.extname(file) === '.json') {
                    args.push(path.join(dir, 'meta', file));
                }
            });
        }
        files.forEach(function(file) {
            if (path.extname(file) === '.js') {
                args.push(path.join(dir, 'js', file));
            }
        });
        
        if (this.strict) {
            args.splice(0, 2);
        }

        log.debug(cmd + ' ' + args.join(' '));
        var lint = spawn(cmd, args, {
            cwd: this.dir
        });
        lint.stdout.on('data', function(data) {
            buffer += data;
        });
        lint.on('exit', function(code) {
            if (self.strict) {
                var count = self.count(buffer);
                process.stdout.write(buffer);
                log.warn('lint found a total of ' + count + ' errors.');
                log.debug('lint exited with: ' + code);
                process.exit(code);
            } else {
                self.delint(buffer);
            }
        });
        
    },
    count: function(lines) {
        lines = lines.split('\n');
        var c = 0, self = this;
        lines.forEach(function(line) {
            if (self.isError(line)) {
                c++;
            }
        });
        return c;
    },
    rules: [
        "Unexpected 'else' after 'return'",
        "Unexpected 'in'. Compare with undefined"
    ],
    ignore: function(line) {
        var ignore = this.rules.some(function(rule) {
            return (line.indexOf(rule) > -1);
        });
        return ignore;
    },
    isError: function(line) {
        return (line.indexOf('#') === 1 || line.indexOf('#') === 0)
    },
    delint: function(lines) {
        lines = lines.split('\n');
        var json = [], self = this;

        lines.forEach(function(line) {
            if (line.length) {
                json.push(JSON.parse(line));
            }
        });
        log.log('');
        var errors = 0,
            ignored = 0;
        json.forEach(function(info) {
            var file = info[0].replace(self.dir, './'),
                lint = info[1];

            if (!lint.length) {
                file += ' is OK.'
            } else {
                var counter = 0;
                file += '\n';
                lint.forEach(function(l) {
                    if (!l) { return; };
                    errors++;
                    if (self.ignore(l.reason)) {
                        ignored++;
                        if (!self.showIgnored) {
                            return;
                        }
                    }
                    counter++;
                    file += (' #' + counter + ' ' + l.reason).yellow;
                    if (self.ignore(l.reason)) {
                        file += ' (ignored)'.grey;
                    } else {
                        file += ' ERROR'.red;
                    }
                    file += '\n   ' + (l.evidence && l.evidence.trim() || '') + (' // Line ' + l.line + ', Pos ' + l.character).grey
                    file += '\n';
                });
            }
            log.log(file + '\n');
        });
        
        log.info('lint - total: ' + errors + ', errors: ' + (errors - ignored) + ', ignored: ' + ignored);
        if (ignored && !self.showIgnored) {
            log.info('lint - add `--all` to see the ignored messages');
        }
        if (errors - ignored) {
            log.bail('lint contained errors');
        }
    },
    help: function() {
        return [
            'lint',
            'lint your files [--all to show warnings, --strict to throw on warnings]'
        ]
    }
};

util.mix(exports, mods);
