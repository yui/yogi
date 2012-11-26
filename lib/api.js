/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('./util'),
    request = require('request'),
    config = require('./config'),
    log = require('./log'),
    qs = require('querystring'),
    jar = request.jar(),
    cookie = request.cookie('yui_nocache'),
    mod;

//add the cookie to the jar
jar.add(cookie);

config.register('loglevel', 'set the default log level (info, debug)');

config.register('devel', 'used during yogi development, allows ssl calls to not use strict checking or limiting beta commands', true);
config.register('apiHost', 'set the apiHost to use when making api calls', true);
config.register('username', 'yuilibrary.com username', true);
config.register('token', 'token for auth with yuilibrary.com', true);

mod = {
    strictSSL: function() {
        var devel = config.get('devel');
        if (devel) {
            log.warn('USING API WITHOUT STRICT SSL CHECKING');
        }
        return !devel;
    },
    host: function() {
        return 'https://' + config.get('apiHost') + '/api/v1';
    },
    callback: function(cb) {
        return function(err, res) {
            var json;
            if (err) {
                log.bail(err);
            }
            try {
                json = JSON.parse(res.body);
            } catch (e) {
                cb(res.body);
            }
            if (json && json.error) {
                cb(json.error);
            } else {
                cb(null, json);
            }
        };
    },
    getNon: function(url, cb) {
        log.debug('GET ' + this.host() + url);
        request.get({
            url: this.host() + url
        }, this.callback(cb));
    },
    get: function(url, cb) {
        var username = config.get('username'),
            token = config.get('token'),
            headers = {
                'User-Agent': 'yogi CLI tool'
            };

        if (username && token) {
            headers['x-yui-username'] = username;
            headers['x-yui-token'] = token;
        }
        log.debug('GET ' + this.host() + url);
        request.get({
            jar: jar,
            url: this.host() + url,
            strictSSL: this.strictSSL(),
            headers: headers
        }, this.callback(cb));
    },
    post: function(url, data, cb) {
        var username = config.get('username'),
            token = config.get('token'),
            headers = {
                'User-Agent': 'yogi CLI tool',
                'Content-type' : 'application/x-www-form-urlencoded'
            },
            u = this.host() + url;

        if (typeof data === 'function') {
            cb = data;
            data = '';
        }

        if (username && token) {
            headers['x-yui-username'] = username;
            headers['x-yui-token'] = token;
        }
        log.debug('POST ' + u);
        request.post({
            jar: jar,
            url: u,
            strictSSL: this.strictSSL(),
            headers: headers,
            body: qs.stringify(data)
        }, this.callback(cb));
    },
    put: function(url, data, cb) {
        var username = config.get('username'),
            token = config.get('token'),
            u = this.host() + url;
        
        if (!username || !token) {
            log.bail('not authorized, did you login yet? yogi login');
        }

        log.debug('PUT ' + u);
        request.put({
            jar: jar,
            url: u,
            strictSSL: this.strictSSL(),
            headers: {
                'User-Agent': 'yogi CLI tool',
                'x-yui-username': username,
                'x-yui-token': token,
                'Content-type' : 'application/x-www-form-urlencoded'
            },
            body: qs.stringify(data)
        }, this.callback(cb));
    },
    'delete': function(url, data, cb) {
        var username = config.get('username'),
            token = config.get('token'),
            u = this.host() + url;
            
            if (!cb) {
                cb = data;
                data = {};
            }
        
        if (!username || !token) {
            log.bail('not authorized, did you login yet? yogi login');
        }

        log.debug('DELETE ' + u);
        request.del({
            jar: jar,
            url: u,
            strictSSL: this.strictSSL(),
            headers: {
                'User-Agent': 'yogi CLI tool',
                'x-yui-username': username,
                'x-yui-token': token,
                'Content-type' : 'application/x-www-form-urlencoded'
            },
            body: qs.stringify(data)
        }, this.callback(cb));
    }
};

util.mix(exports, mod);
