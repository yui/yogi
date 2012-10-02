/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var log = require('../log');
var config = require('../config');
var util = require('../util');

var mods = {
    init: function(options) {
        this.options = options.parsed;
        log.debug('logout init');
        config['delete']('username');
        config['delete']('token');
        config['delete']('gh_user');
        config['delete']('gh_token');
        config['delete']('gh_stamp');
        log.info('you have been logged out');
    },
    help: function() {
        return [
            'logout',
            'remove tokens from yogi config'
        ];
    }
};

util.mix(exports, mods);

