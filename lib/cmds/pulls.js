/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    config = require('../config'),
    request = require('request'),
mods = {
    yui: true,
    init: function(options) {
        var self = this,
            remain = options.parsed.argv.remain;

        if (options.parsed['sign-off']) {
            this.signoff = options.parsed['sign-off'];
        }
        remain.forEach(function(item) {
            if (!isNaN(parseInt(item, 10))) {
                self.number = parseInt(item, 10);
            }
            if (item.indexOf('+') > -1) {
                self.signoff = item;
            }
            if (item.toLowerCase() === 'lgtm') {
                self.signoff = item;
            }
        });
        if (!util.isYUI()) {
            log.bail('command only valid in the yui3 repo');
        }
        if (!util.hasGithub()) {
            log.bail('github is not linked yet: yogi gh');
        }
        this.gh_user = config.get('gh_user');
        this.gh_token = config.get('gh_token');
        if (this.number && this.signoff) {
            this.sign();
        } else {
            this.list();
        }
    },
    sign: function() {
        log.info('signing off on #' + this.number);
        var body = JSON.stringify({ body : ':thumbsup:' + ((this.signoff !== true) ? ' ' + this.signoff : '') });

        request.post({
            url: 'https://api.github.com/repos/yui/yui3/issues/' + this.number + '/comments',
            headers: {
                'Content-Length': body.length,
                'Content-Type' : 'application/json',
                'User-Agent': 'yogi CLI tool',
                'Authorization': 'bearer ' + this.gh_token
            },
            json: true,
            body: body
        }, function(err, data) {
            var json = data.body;
            log.info('signed off: ' + json.url);
        });
    },
    get: function(url, callback) {
        request.get({
            url: 'https://api.github.com' + url + '?per_page=100',
            headers: {
                'Content-Type' : 'application/json',
                'User-Agent': 'yogi CLI tool',
                'Authorization': 'bearer ' + this.gh_token
            },
            json: true
        }, function(err, res) {
            callback(err, res.body);
        });
    },
    getPulls: function(callback) {
        var self = this;
        self.get('/repos/yui/yui3/pulls', function(err, data) {
            var stack = new util.Stack(),
                pulls = [];
            data.forEach(function(item) {
                self.get('/repos/yui/yui3/pulls/' + item.number, stack.add(function(err, d) {
                    pulls.push(d);
                }));
            });

            stack.done(function() {
                pulls.sort(function(a, b) {
                    var ret = 0;

                    if (a.number < b.number) {
                        ret = -1;
                    }
                    if (a.number > b.number) {
                        ret =  1;
                    }
                    return ret;
                }).reverse();
                callback(null, pulls);
            });
        });
    },
    list: function() {
        log.info('fetching open pull requests, this may take a moment..');
        this.getPulls(function(err, data) {
            var len = 0,
                nameLen = 0,
                warn,
                pad = function(len, num) {
                    var l = String(num).length,
                        i,
                        str = num;
                    for (i = l; i <= len; i++) {
                        str += ' ';
                    }
                    return str;
                };
            data.forEach(function(item) {
                if (String(item.number).length > len) {
                    len = String(item.number).length;
                }
                if (item.user.login.length > nameLen) {
                    nameLen = item.user.login.length;
                }
            });
            data.forEach(function(item) {
                var m = '  ' + ((item.mergeable) ? util.good : util.bad) + '  ';
                if (!item.mergable) {
                    warn = true;
                }
                console.log(m, ('#' + pad(len, item.number)).yellow,
                    pad(nameLen + 2, '[' + item.user.login + ']'),
                    item.title,
                    ('//last up: ' + (new Date(item.updated_at)).toDateString()).grey);
            });
            if (warn) {
                console.log('\n', util.bad, 'pull request is not mergable without issues,', util.good, 'means good to go!');
            }
        });

    },
    help: function() {
        return [
            'pulls',
            'manage pull requests, default will list open ones',
            '# (--sign-off || lgtm || + || ++) will comment a signoff on the PR',
            '   yogi pulls 234 ++',
            '   yogi pulls 234 lgtm',
            '   yogi pulls 234 +1',
            '   yogi pulls 234 --sign-off',
            '   yogi pulls 234 --sign-off="This looks great, thanks!"'
        ];
    }
};

util.mix(exports, mods);
