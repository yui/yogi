var util = require('../util');
var nopt = require('nopt');
var log = require('../log');
var config = require('../config');

var mods = {
    init: function(options) {
        var args = options.parsed.argv.remain;
        var cmd = args.shift();
        log.debug('config (' + cmd + ')');
        if (mods[cmd]) {
            mods[cmd](args);
        }
    },
    get: function(args) {
        var key = args[0];
        log.debug('looking up ' + key);
        log.info(key + ' is currently set to:');
        log.log(config.get(key));
    },
    set: function(args) {
        var key = args[0];
        var val = args[1];
        if (!key) {
            log.bail('must pass a key');
        }
        log.debug('setting ' + key + ' to ' + val);
        config.set(key, val);
    },
    list: function() {
        log.debug('listing all config options');
        log.log(config.list());
    },
    delete: function(args) {
        var key = args[0];
        if (!key) {
            log.bail('must pass a key');
        }
        log.debug('deleting config for ' + key);
        config.delete(key);
    },
    help: function() {
        return [
            'log',
            'set/get <value> works with the config'
        ]
    }
};

util.mix(exports, mods);
