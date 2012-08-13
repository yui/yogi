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
    predef = [
        "YUI", "window", "YUI_config", "YAHOO", "YAHOO_config", "Event",
        "opera", "exports", "document", "navigator", "console", "self", "require",
        "module", "process", "__dirname", "__filename"
    ],
mods = {
    init: function(options) {
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
        //'--vars',
        '--plusplus',
        '--maxerr 500',
        '--predef "' + predef.join(',') + '"',
        '--'
    ],
    jslint: function() {
        log.info('running jslint');
        var cmd = path.join(this.root, 'jslint'),
            args = this.args,
            files = fs.readdirSync(path.join(this.dir, 'js')),
            metaFiles,
            metaFilesDir = path.join(this.dir, 'meta'),
            dir = this.dir,
            self = this,
            lint,
            buffer = '';

        if (util.exists(metaFilesDir)) {
            metaFiles = fs.readdirSync(metaFilesDir);
        }
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
        
        log.debug(cmd + ' ' + args.join(' '));
        lint = spawn(cmd, args, {
            cwd: this.dir
        });
        lint.stdout.on('data', function(data) {
            buffer += data;
        });
        lint.on('exit', function(code) {
            var count = self.count(buffer);
            process.stdout.write(buffer);
            if (count) {
                log.warn('lint found a total of ' + count + ' errors.');
            } else {
                log.info('lint passed!');
            }
            log.debug('lint exited with: ' + code);
            process.exit(code);
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
    isError: function(line) {
        return (line.indexOf('#') === 1 || line.indexOf('#') === 0);
    },
    help: function() {
        return [
            'lint',
            'lint your files'
        ];
    }
};

util.mix(exports, mods);
