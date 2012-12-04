/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var nopt = require('nopt'),
    path = require('path'),
    cmds = require('./cmds'),
    known = {
        watch: Boolean,
        quiet: Boolean,
        t: Number,
        c: Number,
        x: Array,
        m: Array,
        cli: Boolean,
        coverage: Boolean,
        json: [String],
        istanbul: Boolean,
        yeti: Boolean,
        hub: String,
        connected: Boolean,
        config: path,
        start: path,
        js: path,
        mix: Boolean,
        expand: Boolean,
        'show-merge': Boolean,
        name: String,
        init: Boolean,
        path: String,
        test: Boolean,
        remove: Boolean,
        type: ['js', 'css', 'widget'],
        version: Boolean,
        help: Boolean,
        yes: Boolean,
        force: Boolean,
        loglevel: [ 'silent', 'info', 'debug', 'warn' ],
        lint: [ 'defaults', 'strict', 'preferred' ],
        filter: [ 'raw', 'min', 'debug', 'coverage' ]
    },
    shorts = {
        'y' : ['--yes'],
        'v' : ['--version'],
        'h' : ['--help'],
        'lvl': ['--loglevel'],
        's': ['--loglevel', 'silent'],
        'silent': ['--loglevel', 'silent'],
        'debug': ['--loglevel', 'debug']
    };

exports.known = known;
exports.shorts = shorts;

exports.parse = function(args) {
    args = args || process.argv;
    var main = args[2] || 'help',
        off = 3, parsed, cmd, found;

    if (main && main.indexOf('-') === 0) {
        off = 2;
        main = 'help';
    }
    parsed = nopt(known, shorts, args, off);

    if (parsed.version) {
        main = 'version';
    }

    if (parsed.help) {
        if (main !== 'help') {
            parsed.argv.remain[0] = main;
            main = 'help';
        }
    }

    if (parsed.coverage) {
        parsed.filter = 'coverage';
    }
    if (!parsed.filter) {
        parsed.filter = 'raw';
    }

    //default to false
    parsed.yes = (parsed.yes === undefined || parsed.yes === false) ? false : true;

    //Read as a String because it's a Boolean option in some situations and a Path in others
    if (parsed.json) {
        if (parsed.json === "true") {
            parsed.json = true;
        }
        else if (parsed.json === "false") {
            parsed.json = false;
        }
        else {
            parsed.json = path.normalize(path.resolve(parsed.json));
        }
    }

    if (!parsed.type) {
        parsed.type = 'js';
    }

    parsed.lint = parsed.lint || 'preferred';

    cmd = cmds[main];
    if (!cmd) {
        found = [];
        Object.keys(cmds).forEach(function(c) {
            if (c.indexOf(main) === 0) {
                found.push(c);
            }
        });
        if (found.length > 1) {
            cmd = found;
        } else {
            cmd = cmds[found[0]];
        }
    }

    return {
        main: main,
        cmd: cmd,
        parsed: parsed
    };
};
