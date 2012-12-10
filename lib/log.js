/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var color = require('ansi-color').set;
var hasColor = false;
var stdio;
try {
    stdio = require("stdio");
    hasColor = stdio.isStderrATTY();
} catch (ex) {
    hasColor = true;
}

exports.isTTY = hasColor;

exports.color = function (str, code) {
    if (!hasColor) {
        return str;
    }
    return color(str, code);
};

var mod,
levels = {
    log: 1,
    silent: 1,
    info: 2,
    warn: 1,
    debug: 3
},
prefix,
mods = {
    level: function(type) {
        var args = require('./args').parse().parsed,
            config = require('./config'),
            logLevel = args.loglevel || config.get('loglevel') || 'info';
        
        if (args.color === false) {
            hasColor = false;
        }
        prefix = exports.color('yogi', 'magenta');

        return (levels[type] <= levels[logLevel]);
    },
    log: function(str, cat) {
        if (this.level('log')) {
            if (cat) {
                console.log(prefix, exports.color('[', 'white') + cat + exports.color(']', 'white'), str);
            } else {
                console.log(str);
            }
        }
    },
    info: function(str) {
        if (this.level('info')) {
            this.log(' ' + str, exports.color('info', 'white'));
        }
    },
    warn: function(str) {
        if (this.level('warn')) {
            this.log(' ' + str, exports.color('warn', 'yellow'));
        }
    },
    debug: function(str) {
        if (this.level('debug')) {
            this.log(str, exports.color('debug', 'yellow'));
        }
    },
    error: function(str) {
        this.log(str, exports.color('ERROR', 'red'));
    },
    bail: function(str) {
        this.log(str, exports.color('bail', 'red'));
        process.exit(1);
    }
};

mods.good = exports.color("✔", 'green');
mods.bad = exports.color("✖", 'red');
mods.progress = exports.color("♢", 'yellow');

if (process.platform === 'win32') {
    mods.good = exports.color('OK', 'green');
    mods.bad = exports.color('X', 'red');
    mods.progress = exports.color('O', 'yellow');
}

for (mod in mods) {
    if (mods.hasOwnProperty(mod)) {
        exports[mod] = mods[mod];
    }
}
