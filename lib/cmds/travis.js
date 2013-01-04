/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    config = require('../config'),
    travis = require('git-travis'),
    request = require('request'),
    git = require('../git'),
mods = {
    start: function() {
        var self = this;

        delete self.options.parsed.rebuild;
        delete self.options.parsed.all;
        mods.init(self.options);
    },
    init: function(options) {
        var info = git.userAndRepo(),
            self = this,
            user = info[0],
            repo = info[1];

        self.options = options;

        if (user === 'yui' && repo === 'yui3') {
            user = repo = null;
        }

        git.branch(function(branch) {
            if (user && repo) {
                if (options.parsed.rebuild) {
                    return self.rebuild(user, repo, branch, function() {
                        if (options.parsed.all) {
                            log.log('');
                            self.rebuild('yui', 'yui3', branch, function() {
                                log.log('');
                                self.start();
                            });
                        } else {
                            self.start();
                        }
                    });
                }
                log.info('checking travis status for ' + user + '/' + repo + ' and yui/yui3 on branch ' + branch);
                log.log('');
                travis.print(user, repo, branch, function() {
                    log.log('');
                    travis.print('yui', 'yui3', branch, function() {
                        log.log('');
                    });
                });
            } else {
                log.info('checking travis status for yui/yui3:' + branch);
                log.log('');
                travis.print('yui', 'yui3', branch, function() {
                    log.log('');
                });
            }
        });
    },
    rebuild: function(user, repo, branch, callback) {
        if (!config.get('gh_token')) {
            log.bail('You need to bind a Github token first!');
        }
        travis.fetch(user, repo, branch, function(err, data) {
            if (err) {
                log.bail(err);
            }
            if (data.item.result === 1) {
                log.info('Build #' + data.item.id + ' appears to have failed, issuing a rebuild request');
                log.debug('fetching token from Travis');
                request({
                    url: 'https://api.travis-ci.org/auth/github',
                    json: true,
                    method: 'POST',
                    body: {
                        "github_token": config.get('gh_token')
                    }
                }, function(err, res) {
                    var token = res.body.access_token;
                    if (!token) {
                        log.bail('failed to fetch token from Travis');
                    }
                    request({
                        url: 'https://api.travis-ci.org/requests',
                        method: 'POST',
                        json: true,
                        headers: {
                            'Authorization': 'token ' + token
                        },
                        body: {
                            "build_id": data.item.id
                        }
                    }, function(err, res) {
                        if (err) {
                            log.bail(err);
                        }
                        if (res.body && res.body.result) {
                            log.info(res.body.flash[0].notice);
                        }
                        if (callback) {
                            callback();
                        }
                    });
                });
            } else {
                log.warn('nothing to do here.. did not detect a failed build');
                if (callback) {
                    callback();
                }
            }
        });
    },
    help: function() {
        return [
            'travis',
            'check travis builds for yui and your fork on your current branch',
            '--rebuild issue a travis rebuild on your failing build (experimental)',
            '--all use with --rebuild to try to restart a yui build too'
        ];
    }
};

util.mix(exports, mods);
