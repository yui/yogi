/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    config = require('../config'),
    proxy = require('../proxy'),
    request = require('request'),
    api = require('../api'),
    mods;

config.register('gh_user', 'github username', true);
config.register('gh_token', 'github oauth token', true);

mods = {
    cmds: {
        show: function() {
            var gh_user = config.get('gh_user'),
                gh_token = config.get('gh_token'),
                gh_token_date = config.get('gh_token_date');

            if (!gh_user && !gh_token && !gh_token_date) {
                log.bail('you have not linked your github account yet: yogi gh');
            }
            log.info('github username: ' + gh_user);
            log.info('github token: ' + gh_token);
            log.info('token created: ' + gh_token_date);
        }
    },
    init: function(options) {
        var cmd = options.parsed.argv.remain[0] || 'info',
            username = config.get('username'),
            token = config.get('token'),
            self = this,
            gh_user = config.get('gh_user'),
            gh_token = config.get('gh_token');


        if (!username || !token) {
            log.bail('you must login before you can connect github: yogi login');
        }

        if (self.cmds[cmd]) {
            self.cmds[cmd](options);
            return;
        }

        if (gh_user && gh_token) {
            util.prompt('you already have a token, continue? [y/N] ', function(ans) {
                ans = ans.toLowerCase() || 'n';
                if (ans !== 'y') {
                    log.bail('bailing');
                }
                self.fetchToken(gh_user);
            });
        } else {
            util.prompt('about to link your github account, are you sure? [Y/n] ', function(ans) {
                ans = ans.toLowerCase() || 'y';
                if (ans !== 'y') {
                    log.bail('bailing');
                }
                self.fetchUser(username, token);
            });
        }
    },
    fetchUser: function(username) {
        var self = this;
        log.info('fetching user info from yuilibrary.com');
        api.get('/user/name/' + username, function(err, json) {
            if (err) {
                log.bail(err);
            }
            var gh_user = json.github;
            if (!gh_user) {
                log.bail('github account not found, please visit the website and add it to your profile: http://yuilibrary.com/forum/ucp.php?i=164');
            }
            log.info('found github user: ' + gh_user);
            config.set('gh_user', gh_user);
            self.fetchToken(gh_user);
        });
    },
    fetchToken: function(user) {
        var scopes = 'user,repo,gist';
        log.warn('fetching oauth token from github, your github password will be required!');
        log.info('this password will NOT be saved!');
        util.prompt('Github password for ' + user + ': ', function(pass) {
            if (!pass) {
                log.bail('password is required');
            }
            log.info('fetching oauth token for: ' + scopes);
            var body = JSON.stringify({
                    //Adding date here because Github doesn't show it in the admin page
                    note: 'yogi CLI access [' + (new Date()).toDateString() + ']',
                    note_url: 'http://yui.github.com/yogi',
                    scopes: scopes.split(',')
                }),
                auth = 'Basic ' + new Buffer(user + ':' + pass).toString('base64');

            proxy.request().post({
                url: 'https://api.github.com/authorizations',
                body: body,
                headers: {
                    'Content-Length': body.length,
                    'Content-Type' : 'application/json',
                    'User-Agent': 'yogi CLI tool',
                    'Authorization': auth
                }
            }, function(err, res) {
                if (err) {
                    log.bail(err);
                }
                var json = JSON.parse(res.body), token;
                if (json.message) {
                    log.bail(json.message);
                }
                if (!json.token) {
                    log.log(json);
                    log.bail('something bad happened, file a bug for it!');
                }
                token = json.token;
                log.info('received token, saving');
                config.set('gh_token', token, true);
                config.set('gh_token_date', json.created_at);
                log.info('you can revoke this token here: https://github.com/settings/applications');
                log.info('done');
            });
        }, true);
    },
    help: function() {
        return [
            'gh',
            'connect yogi to github, it helps!'
        ];
    }
};


util.mix(exports, mods);
