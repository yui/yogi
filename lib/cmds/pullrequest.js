/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    git = require('../git'),
    config = require('../config'),
    api = require('../api'),
    path = require('path'),
    request = require('request'),
mods = {
    yui: true,
    init: function(options) {
        this.user = 'yui';
        this.repo = 'yui3';

        this.simple = config.get('pullrequest');

        if (options.parsed.user) {
            this.user = options.parsed.user;
        }

        if (options.parsed.simple) {
            this.simple = true;
        }

        if (!util.isYUI()) {
            log.bail('command only valid in the yui3 repo');
        }
        if (!util.hasGithub()) {
            log.bail('github is not linked yet: yogi gh');
        }
        var module = util.findModule(true);
        this.module = module;
        if (!module) {
            log.bail('are you in a module directory?');
        }
        log.info('issuing a pull request to ' + this.user + ' for: ' + module.name);
        if (this.simple) {
            log.info('simple pull request, using last commit as message');
        }

        this.request();
    },
    submit: function() {
        var self = this;
        
        log.info('looking up owner of ' + this.module.name);
        api.get('/components/' + this.module.name + '/author', function(err, author) {

            if (author && author.components && author.components.length) {
                var owner = author.components[0].author,
                    lookup = (Array.isArray(owner)) ? owner : [owner];

                log.info('found owner: ' + owner);
                log.debug('looking up user info');
                
                api.get('/user/name/' + lookup.join(';') + '/github', function(err, github) {
                    var owners = [];
                    if (github && Array.isArray(github)) {
                        github.forEach(function(i) {
                            if (i.github) {
                                owners.push(i.github);
                            }
                        });
                    } else if (github && github.github) {
                        owners = [github.github];
                    }
                    if (owners.length) {
                        log.debug('found github username(s): ' + owners);
                        owners.forEach(function(name) {
                            self.body += '\nyogi pinging ' + self.module.name + ' owner: @' + name + '\n';
                        });
                    } else {
                        log.warn('failed to locate default owner, submitting anyway');
                    }
                    self.send();
                });
            } else {
                log.warn('failed to locate default owner, submitting anyway');
                self.send();
            }
        });
    },
    send: function() {
        log.info('submitting pull request');
        var self = this,
            gh_user = config.get('gh_user'),
            gh_token = config.get('gh_token'),
            tag = '\nsubmitted with yogi',
            json = {
                title: self.title,
                body: self.body + tag,
                head: gh_user + ':' + self.branch,
                base: 'master'
            },
            body = JSON.stringify(json),
            url = 'https:/'+'/api.github.com/repos/' + self.user + '/' + self.repo + '/pulls';

        log.debug('POST ' + url);
        request.post({
            url: url,
            headers: {
                'Content-Length': body.length,
                'Content-Type' : 'application/json',
                'User-Agent': 'yogi CLI tool',
                'Authorization': 'bearer ' + gh_token
            },
            body: body
        }, function(err, res) {
            if (err) {
                log.bail(err);
            }
            var json = JSON.parse(res.body);
            if (json.errors) {
                json.errors.forEach(function(i) {
                    log.error(i.message);
                });
            } else {
                log.info('pull request successful');
                log.log(json.html_url);
            }
        });
    },
    confirm: function() {
        var self = this;
        log.info('does this look correct?');
        log.log('user: ' + this.user);
        log.log('repo: ' + this.repo);
        log.log('branch: ' + this.branch);
        log.log('title: ' + this.title);
        log.log('body: -------------------------');
        log.log(this.body);
        util.prompt('ok? [y/N] ', function(ans) {
            if (ans.match(/^y(es)?$/i)) {
                self.submit();
            } else {
                log.bail('bailing');
            }
        });
    },
    request: function() {
        var self = this;

        git.status(function(status) {
            if (status && status.length) {
                log.bail('git root is dirty, please commit first');
            }
            git.branch(function(branch) {
                log.info('using branch ' + branch);
                self.branch = branch;
                if (branch === 'master') {
                    log.warn('you really really should be using a feature branch!');
                    util.prompt('are you sure you want to use the master branch? [y/N] ', function(ans) {
                        ans = ans.toLowerCase() || 'n';
                        if (ans !== 'y') {
                            log.bail('bailing');
                        }
                        self.askTitle();
                    });
                } else {
                    self.askTitle();
                }
            });
        });
    },
    askTitle: function() {
        var self = this;
        git.log(function(logs) {
            var title = logs[0].note;
            if (self.simple && title) {
                self.title = title;
                self.body = '';
                self.confirm();
            } else {
                log.info('use the last commit as the title? [y/N] ');
                util.prompt('[' + title + ']: ', function(ans) {
                    if (ans.match(/^y(es)?$/i)) {
                        self.title = title;
                        self.askBody();
                    } else {
                        util.prompt('pull request title: ', function(title) {
                            self.title = title;
                            self.askBody();
                        });
                    }
                });
            }
        });
    },
    askBody: function() {
        var defaultFile = path.join(__dirname, '../../configs/pr/default.txt'),
            self = this;

        util.longPrompt(defaultFile, function(ans) {
            self.body = ans;
            self.confirm();
        });
    },
    help: function() {
        return [
            'pullrequest',
            'submit a pull request to the yui/yui3 project',
            '--user <name> to send to another user',
            '--simple (use last commit as message)'
        ];
    }
};

util.mix(exports, mods);
