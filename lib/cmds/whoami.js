/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

var config = require('../config'),
    log = require('../log'),
    util = require('../util'),
    mods = {
        init: function() {
            log.info('whoami?');
            var username = config.get('username');
            if (!username) {
                username = 'not logged in';
            }
            log.log('you are: ' + username);
        },
        help: function() {
            return [
                'whoami',
                'who you have authed as'
            ];
        }
    };

util.mix(exports, mods);
