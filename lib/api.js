var util = require('./util');
var request = require('request');
var config = require('./config');
var log = require('./log');
var qs = require('querystring');


var mod = {
    host: function() {
        return 'https://' + config.get('apiHost') + '/api/v1';
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
            headers: headers
        }, function(err, res) {
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
        });
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
            headers: headers,
            body: qs.stringify(data)
        }, function(err, res) {
            
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
        });
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
            headers: {
                'User-Agent': 'yogi CLI tool',
                'x-yui-username': username,
                'x-yui-token': token,
                'Content-type' : 'application/x-www-form-urlencoded'
            },
            body: qs.stringify(data)
        }, function(err, res) {
            
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
        });
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
            headers: {
                'User-Agent': 'yogi CLI tool',
                'x-yui-username': username,
                'x-yui-token': token,
                'Content-type' : 'application/x-www-form-urlencoded'
            },
            body: qs.stringify(data)
        }, function(err, res) {
            
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
        });
    }
};

util.mix(exports, mod);
