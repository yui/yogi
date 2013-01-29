/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var request = require('request'),
    config = require('./config'),
    util = require('./util'),
    mods = {
      request: function() {
        var env = process.env,
            proxy_env = env.https_proxy || env.HTTPS_PROXY || '';
        return request.defaults({
          'proxy': config.get('proxy') || proxy_env || ''
        });
      }
    };
util.mix(exports, mods);
