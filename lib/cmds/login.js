/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var log = require('../log'),
    config = require('../config'),
    util = require('../util'),
    api = require('../api'),
mods = {
    init: function(options) {
        this.options = options.parsed;
        log.debug('login init');
        this.username = config.get('username');
        this.token = config.get('token');

        this.process();
    },
    process: function() {
        if (this.options.username && this.options.password) {
            this.login(this.options.username, this.options.password);
        } else {
            var self = this, dUname;

            if (this.options.username) {
                log.debug('bypassing name, asking for password');
                util.prompt('password for ' + this.options.username + ': ', function(passwd) {
                    self.options.password= passwd;
                    log.debug('got password of: ' + passwd);
                    self.process();
                }, true);
            } else {
                dUname = config.get('username');
                util.prompt('username' + (dUname ? ' (' + dUname + ')' : '') + ': ', function(uname) {
                    if (uname === '') {
                        if (dUname) {
                            uname = dUname;
                        } else {
                            log.bail('a user name is required');
                        }
                    }
                    self.options.username = uname;
                    log.debug('got username of: ' + uname);
                    util.prompt('password: ', function(passwd) {
                        self.options.password= passwd;
                        log.debug('got password of: ' + passwd);
                        self.process();
                    }, true);
                });
            }
        }
    },
    encode: function(str) {
        var b = new Buffer(str).toString('base64'),
            a = new Buffer(b, 'base64').toString('utf8'),
            encoded = b;

        if (str !== a) {
            encoded = str;
        }
        return encoded;
    },
    login: function(username, password) {
        log.debug('Attempting to login as ' + username + ' to ' + config.get('apiHost'));
        
        api.post('/login', {
            username: username,
            password: this.encode(password)
        }, function(err, data) {
            if (err) {
                log.debug(err);
                log.bail(err.message || err);
            }
            log.debug(data);
            if (!data.username && !data.token) {
                log.bail('Failed to fetch token!');
            }
            log.info('login successful, saving config');
            config.set('username', data.username);
            config.set('token', data.token);
            log.info('config saved, done.');
        });
    },
    help: function() {
        return [
            'login',
            'get a login token to do neat things.',
            'pass nothing for interactive mode',
            '--username <username> (optional)',
            '--password <password> (optional)'
        ];
    }

};

util.mix(exports, mods);
