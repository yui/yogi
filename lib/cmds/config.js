/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    config = require('../config'),
    mods = {
        init: function(options) {
            var args = options.parsed.argv.remain,
                cmd = args.shift();

            this.dev = options.parsed.devel;

            log.debug('config (' + cmd + ')');
            if (mods[cmd]) {
                mods[cmd](args);
            } else {
                this.defaults();
            }
        },
        defaults: function() {
            var opts = config._options,
                pad = function(str) {
                    var l = str.length,
                        i;
                    for (i = str.length; i <= len; i++) {
                        str += ' ';
                    }
                    return str;
                },
                len = 0;
            
            log.info('showing all possible config options');
            console.log('');
            console.log('   yogi config set <key> <value>');
            console.log('');
            console.log('available options:');
            Object.keys(opts).sort().forEach(function(k) {
                if (k.length > len) {
                    len = k.length;
                }
            });
            Object.keys(opts).sort().forEach(function(k) {
                console.log('\t', pad(k), '\t', opts[k]);
            });
            console.log('');

            if (this.dev) {
                opts = config._internal;
                console.log('developer options:');
                Object.keys(opts).sort().forEach(function(k) {
                    if (k.length > len) {
                        len = k.length;
                    }
                });
                Object.keys(config._internal).sort().forEach(function(k) {
                    console.log('\t', pad(k), '\t', opts[k]);
                });
                console.log('');
            }
        },
        get: function(args) {
            var key = args[0];
            log.debug('looking up ' + key);
            log.info(key + ' is currently set to:');
            log.log(config.get(key));
        },
        set: function(args) {
            var key = args[0],
                val = args[1];

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
        show: function() {
            this.list();
        },
        'delete': function(args) {
            var key = args[0];
            if (!key) {
                log.bail('must pass a key');
            }
            log.debug('deleting config for ' + key);
            config['delete'](key);
        },
        help: function() {
            return [
                'config',
                'set/get <value> works with the config',
                'pass nothing to list available options',
                '--devel include yogi developer options'
            ];
        }
    };

util.mix(exports, mods);
