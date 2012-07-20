var util = require('./util');
var nopt = require('nopt');
var log = require('./log');
var path = require('path');
var cmds = require('./cmds');

var known = {
    config: path,
    version: Boolean,
    help: Boolean,
    loglevel: [ 'silent', 'info', 'debug' ]
};

var shorts = {
    "v" : ["--version"],
    "h" : ["--help"],
    "lvl": ["--loglevel"],
    "s": ["--loglevel", "silent"],
    "debug": ["--loglevel", "debug"]
};

exports.parse = function() {
    var main = process.argv[2] || 'help';
    var off = 3;
    if (main && main.indexOf('-') === 0) {
        off = 2;
        main = 'help';
    }
    var parsed = nopt(known, shorts, process.argv, off);

    if (parsed.version) {
        main = 'version';
    }

    return {
        main: main,
        cmd: cmds[main],
        parsed: parsed
    };
};
