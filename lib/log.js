var levels = {
    log: 1,
    silent: 1,
    info: 2,
    warn: 1,
    debug: 3
};

require('colors');


var mods = {
    level: function(type) {
        var args = require('./args').parse().parsed;
        var config = require('./config');
        var logLevel = args.loglevel || config.get('loglevel') || 'info';
        return (levels[type] <= levels[logLevel]);
    },
    log: function(str, cat) {
        if (this.level('log')) {
            if (cat) {
                console.log('yogi'.magenta, ('['.white + cat + ']'.white).white, str);
            } else {
                console.log(str);
            }
        }
    },
    info: function(str) {
        if (this.level('info')) {
            this.log(' ' + str, 'info'.white);
        }
    },
    warn: function(str) {
        if (this.level('warn')) {
            this.log(' ' + str, 'warn'.yellow);
        }
    },
    debug: function(str) {
        if (this.level('debug')) {
            this.log(str, 'debug'.yellow);
        }
    },
    error: function(str) {
        this.log(str, 'ERROR'.red);
    },
    bail: function(str) {
        this.log(str, 'bail'.red);
        process.exit(1);
    }
};

for (var mod in mods) {
    exports[mod] = mods[mod];
}
