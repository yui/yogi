/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var nopt = require('nopt'),
    path = require('path'),
    cmds = require('./cmds'),
    known = {
        'set-hide': Boolean,
        'set-path': String,
        'set-repo': String,
        'set-github': String,
        color: Boolean,
        watch: Boolean,
        quiet: Boolean,
        local: Boolean,
        t: Number,
        yui: String,
        c: Number,
        x: Array,
        m: Array,
        cli: Boolean,
        coverage: Boolean,
        json: Boolean,
        'json-file': path,
        istanbul: Boolean,
        yeti: Boolean,
        hub: String,
        grid: Boolean,
        'wd-port': Number,
        'wd-host': String,
        b: Array,
        chrome: Number,
        phantom: Number,
        firefox: Number,
        rebuild: Boolean,
        all: Boolean,
        connected: Boolean,
        config: path,
        start: path,
        js: path,
        mix: Boolean,
        expand: Boolean,
        'show-merge': Boolean,
        name: String,
        group: String,
        port: Number,
        init: Boolean,
        path: String,
        test: Boolean,
        functional: Boolean,
        remove: Boolean,
        type: ['js', 'css', 'widget'],
        version: Boolean,
        help: Boolean,
        yes: Boolean,
        force: Boolean,
        coverdir: path,
        junit: Boolean,
        outfile: path,
        loglevel: [ 'silent', 'info', 'debug', 'warn' ],
        lint: [ 'defaults', 'strict', 'preferred' ],
        filter: [ 'raw', 'min', 'debug', 'coverage' ],
        ref: [String, Array],
        working: Boolean
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
exports.cmds = cmds;

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

    //defaults to true
    parsed.istanbul = (parsed.istanbul === undefined || parsed.istanbul) ? true : false;

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
