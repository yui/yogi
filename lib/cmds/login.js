var log = require('../log');
var config = require('../config');
var util = require('../util');
var api = require('../api');

var mods = {
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
            var self = this;
            util.prompt('username: ', function(uname) {
                self.options.username = uname;
                log.debug('got username of: ' + uname);
                util.prompt('password: ', function(passwd) {
                    self.options.password= passwd;
                    log.debug('got password of: ' + passwd);
                    self.process();
                }, true);
            });
        }
    },
    login: function(username, password) {
        log.debug('Attempting to login as ' + username + ' to ' + config.get('apiHost'));
        
        api.post('/login', {
            username: username,
            password: password
        }, function(err, data) {
            if (err) {
                log.bail(err.message || err);
            }
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
            '--username --password fetch your login token'
        ];
    }

};

util.mix(exports, mods);
