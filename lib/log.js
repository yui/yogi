var util = require('./util');
var config = require('./config');

var levels = {
    log: 1,
    silent: 1,
    info: 2,
    warn: 1,
    debug: 3
};

require('colors');

var args = require('./args').parse().parsed;

var mods = {
    level: function(type) {
        var logLevel = args.loglevel || config.get('loglevel') || 'info';
        return (levels[type] <= levels[logLevel]);
    },
    log: function(str, cat) {
        if (this.level('log')) {
            if (cat) {
                console.log('yogi'.magenta, ('[' + cat + ']').white, str);
            } else {
                console.log(str);
            }
        }
    },
    info: function(str) {
        if (this.level('info')) {
            this.log(' ' + str, 'info');
        }
    },
    warn: function(str) {
        if (this.level('warn')) {
            this.log(' ' + str, 'warn'.yellow);
        }
    },
    debug: function(str) {
        if (this.level('debug')) {
            this.log(str, 'debug');
        }
    },
    bail: function(str) {
        this.log(str, 'bail'.red);
        process.exit(1);
    }
};

util.mix(exports, mods);
