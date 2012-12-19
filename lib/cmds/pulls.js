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

        this.merge = options.parsed['show-merge'];

        if (!util.isYUI()) {
            log.bail('command only valid in the yui3 repo');
        }
        if (!util.hasGithub()) {
            log.bail('github is not linked yet: yogi gh');
        }
        this.gh_user = config.get('gh_user');
        this.gh_token = config.get('gh_token');
        if (this.number && this.merge) {
            this.showMerge();
        } else if (this.number && this.signoff) {
            this.sign();
        } else if (this.number) {
            log.bail('yogi found #' + this.number + ' but nothing else: --sign-off, ++, lgtm, --show-merge');
        } else {
            this.list();
        }
    },
    showMerge: function() {
        log.info('showing merge commands for #' + this.number);

        request.get({
            url: 'https://api.github.com/repos/yui/yui3/pulls/' + this.number,
            headers: {
                'Content-Type' : 'application/json',
                'User-Agent': 'yogi CLI tool',
                'Authorization': 'bearer ' + this.gh_token
            },
            json: true
        }, function(err, data) {
            var json = data.body,
                branch;

            log.log('');
            if (json.mergeable_state === 'clean') {
                log.info('should merge cleanly');
            } else {
                log.warn('this pull request is not clean, merge with caution!!');
                log.warn('mergable state: ' + json.mergeable_state);
            }
            log.log('');
            
            branch = json.head.user.login + '-' + json.head.ref;
            log.info('you can perform a manual merge on the command line:');
            log.log('');
            log.log('   ' + json.html_url);
            log.log('');
            log.log('   git checkout -b ' + branch + ' ' + json.base.ref);
            log.log('   git pull ' + json.head.repo.git_url + ' ' + json.head.ref);
            log.log('');
            log.log('   git checkout ' + json.base.ref);
            log.log('   git merge ' + branch);
            log.log('   git push origin ' + json.base.ref);
            log.log('');
        });
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
                console.log(m, log.color('#' + pad(len, item.number), 'yellow'),
                    pad(nameLen + 2, '[' + item.user.login + ']'),
                    item.title,
                    log.color('//last up: ' + (new Date(item.updated_at)).toDateString(), 'white'));
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
            '   yogi pulls 234 --sign-off="This looks great, thanks!"',
            '--show-merge show the git commands to merge this pull request'
        ];
    }
};

util.mix(exports, mods);
