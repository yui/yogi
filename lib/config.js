/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var path = require('path'),
    util = require('./util'),
    fs = require('fs'),
    exists = fs.existsSync || path.existsSync,
    osenv = require('osenv'),
    log = require('./log'),
    temp = osenv.tmpdir(),
    home = osenv.home(),
    configFile = '.yogi.json',
    defaultConfig = {
        username: '',
        token: '',
        apiHost: 'yuilibrary.com'
    };

var mods = {
    config: defaultConfig,
    load: function() {
        if (this.options.config) {
            log.debug('Loading config file from: ' + this.options.config);
            if (exists(this.options.config)) {
                try {
                    var config = JSON.parse(fs.readFileSync(this.options.config, 'utf8'));
                    this.config = config;
                } catch (e) {
                    log.bail(e);
                }
            } else {
                log.debug('writing default config file');
                this.save();
            }
        } else {
            this.findConfig();
        }
    },
    findConfig: function() {
        log.debug('Locating ' + configFile + ' file');
        var self = this;
        util.find(process.cwd(), configFile, function(err, file) {
            if (file) {
                self.options.config = file;
                self.load();
            } else {
                self.options.config = path.join(home, configFile);
                self.load();
            }
        });
    },
    init: function(options, cb) {
        this.options = options.parsed;
        log.debug('initializing config');
        this.load();
    },
    list: function() {
        return this.config;
    },
    save: function() {
        log.debug('saving config');
        if (this.options.config) {
            try {
                fs.writeFileSync(this.options.config, JSON.stringify(this.config, null, 4), 'utf8');
            } catch (e) {
                log.bail(e);
            }
        }
    },
    set: function(key, value) {
        log.info('setting config ' + key + ' to value: ' + value);
        this.config[key] = value;
        this.save();
        return this.config[key];
    },
    get: function(key) {
        var c = this.config[key];
        if (!(key in this.config)) {
            if (key in defaultConfig) {
                c = defaultConfig[key];
            }
        }
        return c;
    },
    delete: function(key) {
        if (this.config[key]) {
            delete this.config[key];
            this.save();
        } else {
            log.debug('key ' + key + ' is not in config');
        }
    }
};

util.mix(exports, mods);
