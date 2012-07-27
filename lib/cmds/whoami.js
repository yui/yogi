
var config = require('../config');
var log = require('../log');
var util = require('../util');

var mods = {
    init: function() {
        log.info('whoami?');
        var username = config.get('username')
        if (!username) {
            username = 'not logged in'
        }
        log.log('you are: ' + username);
    },
    help: function() {
        return [
            'whoami',
            'who you have authed as'
        ]
    }
};

util.mix(exports, mods);
