/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('./util');
var request = require('request');
var config = require('./config');
var log = require('./log');
var qs = require('querystring');


var mod = {
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
            if (err) {
                log.bail(err);
            }
            try {
                var json = JSON.parse(res.body);
            } catch (e) {
                cb(res.body);
            }
            if (json && json.error) {
                cb(json.error);
            } else {
                cb(null, json);
            }
        }
    },
    get: function(url, cb) {
        var username = config.get('username'),
            token = config.get('token');
            headers = {
                'User-Agent': 'yogi CLI tool'
            };

        if (username && token) {
            headers['x-yui-username'] = username;
            headers['x-yui-token'] = token;
        }
        log.debug('GET ' + this.host() + url);
        request.get({
            url: this.host() + url,
            strictSSL: this.strictSSL(),
            headers: headers
        }, this.callback(cb));
    },
    post: function(url, data, cb) {
        var username = config.get('username'),
            token = config.get('token');

        var headers = {
            'User-Agent': 'yogi CLI tool',
            'Content-type' : 'application/x-www-form-urlencoded'
        };
        if (username && token) {
            headers['x-yui-username'] = username;
            headers['x-yui-token'] = token;
        }
        var u = this.host() + url;
        log.debug('POST ' + u);
        request.post({
            url: u,
            strictSSL: this.strictSSL(),
            headers: headers,
            body: qs.stringify(data)
        }, this.callback(cb));
    },
    put: function(url, data, cb) {
        var username = config.get('username'),
            token = config.get('token');
        
        if (!username || !token) {
            log.bail('not authorized, did you login yet? yogi login');
        }

        var u = this.host() + url;
        log.debug('PUT ' + u);
        request.put({
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
    delete: function(url, data, cb) {
        var username = config.get('username'),
            token = config.get('token');
            
            if (!cb) {
                cb = data;
                data = {};
            }
        
        if (!username || !token) {
            log.bail('not authorized, did you login yet? yogi login');
        }

        var u = this.host() + url;
        log.debug('DELETE ' + u);
        request.del({
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
