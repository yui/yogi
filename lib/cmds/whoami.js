
var config = require('../config');
var log = require('../log');
var util = require('../util');

var mods = {
    init: function() {
        log.info('whoami?');
        log.log('you are: ' + config.get('username'));
    },
    help: function() {
        return [
            'whoami',
            'who you have authed as'
        ]
    }
};

util.mix(exports, mods);
