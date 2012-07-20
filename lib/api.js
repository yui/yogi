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
        request.get({
            url: this.host() + url,
            headers: {
                'User-Agent': 'yogi CLI tool'
            }
        }, function(err, res) {
            try {
                var json = JSON.parse(res.body);
                if (json.error) {
                    cb(json.error);
                } else {
                    cb(null, json);
                }
            } catch (e) {
                cb(res.body);
            }
        });
    },
    post: function(url, data, cb) {
        var u = this.host() + url;
        request.post({
            url: u,
            headers: {
                'User-Agent': 'yogi CLI tool',
                'Content-type' : 'application/x-www-form-urlencoded'
            },
            body: qs.stringify(data)
        }, function(err, res) {
            try {
                var json = JSON.parse(res.body);
                if (json.error) {
                    cb(json.error);
                } else {
                    cb(null, json);
                }
            } catch (e) {
                cb(res.body);
            }
        });
    }

};

util.mix(exports, mod);
