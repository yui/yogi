var util = require('./util');
var nopt = require('nopt');
var log = require('./log');
var path = require('path');
var cmds = require('./cmds');

var known = {
    config: path,
    version: Boolean,
    help: Boolean,
    loglevel: [ 'silent', 'info', 'debug', 'warn' ]
};

var shorts = {
    "v" : ["--version"],
    "h" : ["--help"],
    "lvl": ["--loglevel"],
    "s": ["--loglevel", "silent"],
    "silent": ["--loglevel", "silent"],
    "debug": ["--loglevel", "debug"]
};

exports.known = known;
exports.shorts = shorts;

exports.parse = function(args) {
    args = args || process.argv;
    var main = args[2] || 'help';
    var off = 3;
    if (main && main.indexOf('-') === 0) {
        off = 2;
        main = 'help';
    }
    var parsed = nopt(known, shorts, args, off);

    if (parsed.version) {
        main = 'version';
    }

    var cmd = cmds[main];
    if (!cmd) {
        var found = [];
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
