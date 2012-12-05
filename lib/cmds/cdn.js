/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    git = require('../git'),
    api = require('../api'),
mods = {
    gallery: true,
    cmds: {
        tags: function() {
            log.info('fetching cdn buildtags');

            api.get('/cdn/logs/', function(err, json) {
                if (err) {
                    log.bail(err);
                }

                json = json.slice(0, 10);

                json.forEach(function(item) {
                    log.log('   ' + item);
                });

            });
        },
        logs: function() {
            var buildtag = this.options.parsed.buildtag || 'latest';

            log.info('fetching cdn logs for from buildtag: ' + buildtag);

            api.get('/cdn/logs/' + buildtag, function(err, json) {
                if (err) {
                    log.bail(err);
                }
                var len = 0,
                    pad = function(str) {
                        for (var i = str.length; i < len; i++) {
                            str += ' ';
                        }
                        return str;
                    };
                json.forEach(function(item) {
                    if (item.module.length > len) {
                        len = item.module.length;
                    }
                });

                json.forEach(function(item) {
                    var str = '   ' + pad(item.module) + '     ' + item.buildtag;
                    if (item.failed) {
                        str += ' (failed to build)'.red;
                    }
                    log.log(str);
                });

            });
        },
        request: function() {
            var self = this;
            log.info('submitting a cdn request for ' + this.module.name);
            git.status(function(status) {
                if (status && status.length && !self.force) {
                    log.bail('git root is dirty, please commit first or use --force');
                }
                var cmd = 'ghlog';
                if (self.options.parsed.local) {
                    cmd = 'log';
                }
                git[cmd](function(logs) {
                    log.info('found the following commits:');
                    logs.forEach(function(item) {
                        log.log('        ' + item.sha.substr(0, 8) + '  ' +item.note);
                    });
                    self.logs = logs;
                    var sha = logs[0];
                    util.prompt('use commit [' + sha.sha.substr(0, 8) + ']? [Y/n] ', function(ans) {
                        ans = ans.toLowerCase() || 'y';
                        if (ans !== 'y') {
                            self.askSha();
                            return;
                        }
                        self.submit(sha.sha, sha.note);
                    });
                });
            });
        },
        'delete': function() {
            var self = this;
            log.warn('about to remove this module from the CDN queue');
            util.prompt('are you sure about this? [y/N] ', function(ans) {
                ans = ans.toLowerCase() || 'n';
                if (ans !== 'y') {
                    log.bail('bailing');
                }
                api['delete']('/gallery/' + self.module.name + '/cdn', function(err, json) {
                    if (err) {
                        log.bail(err);
                    }
                    log.info(json.message);
                });
            });
        },
        status: function() {
            var self = this;
            api.get('/gallery/' + this.module.name + '/cdn', function(err, json) {
                if (err) {
                    log.bail(err);
                }
                var since = (new Date(json.stamp * 1000)).toDateString();

                log.info(self.module.name + ' is in the CDN ' + ((json.action === 'pending') ? 'Pending' : 'Deployment') + ' Queue since ' + since);
                if (json.action === 'pending') {
                    log.warn('CDN Request is still awaiting approval'.yellow);
                }
                log.log('   since:   ' + new Date(json.stamp * 1000));
                log.log('   sha:     ' + json.sha1);
                log.log('   slug:    ' + json.github + '/' + json.repo);
                log.log('   path:    ' + json.path);
                log.log('   repo:    git://github.com/' + json.github + '/' + json.repo + '.git');
                if (json.action_message) {
                    log.log('   log:     ' + json.action_message);
                }
                log.log('   message: ' + json.message);
                if (json.action !== 'pending') {
                    util.getCDNWindow(function(str) {
                        log.log('\n ' + str);
                    });
                }
            });
        },
        waiting: function() {
            api.get('/cdn/waiting', function(err, json) {
                if (err) {
                    log.bail(err);
                }
                if (json.count) {
                    log.info('There are currently ' + json.count + ' modules awaiting approval');
                    json.modules.forEach(function(item) {
                        var since = (new Date(item.stamp * 1000)).toString();
                        console.log('   ', ('#' + item.pullid).yellow, item.sha1.substr(0, 7), item.module, item.user, ('// ' + since).grey);
                        console.log('       ', item.message || item.summary);
                        console.log('');
                    });
                } else {
                    log.info('There are no modules in the cdn pending queue');
                }
            });
        },
        approve: function() {
            var id = this.options.parsed.argv.remain[1],
                self = this;
            if (!id) {
                log.warn('Please provide a pull id to approve..');
                self.cmds.waiting.call(self);
            } else {
                log.info('approving cdn item #' + id);
                api.post('/cdn/approve/' + id, function(err) {
                    if (err) {
                        log.bail(err);
                    }
                    log.info('CDN Request approved!');
                    self.cmds.waiting.call(self);
                });
            }
        },
        deny: function() {
            var id = this.options.parsed.argv.remain[1],
                self = this;
            if (!id) {
                log.warn('Please provide a pull id to approve..');
                self.cmds.waiting.call(self);
            } else {
                log.info('denying cdn item #' + id);
                api.post('/cdn/deny/' + id, function(err) {
                    if (err) {
                        log.bail(err);
                    }
                    log.info('CDN Request denied!');
                    self.cmds.waiting.call(self);
                });
            }
        },
        queue: function() {
            api.get('/cdn/queue', function(err, json) {
                if (err) {
                    log.bail(err);
                }
                log.info('there are currently ' + json.count + ' items in the queue for: ' + json.buildtag);
                if (json.count) {
                    var len = 0,
                        c = 0,
                        buf = 2,
                        modLen = 0,
                        slugLen = 0,
                        pad = function(str, len) {
                            if (str.length < len) {
                                for (var i = str.length; i < len; i++) {
                                    str += ' ';
                                }
                            }
                            return str;
                        };
                    json.modules.forEach(function(item, key) {
                        var c = String(key + 1),
                            slug = item.github + '/' + item.repo;
                        if ((c.length  + buf) > len) {
                            len = c.length + buf;
                        }
                        if ((item.module.length + buf) > modLen) {
                            modLen = item.module.length + buf;
                        }
                        if ((slug.length + buf) > slugLen) {
                            slugLen = slug.length + buf;
                        }
                    });
                    json.modules.forEach(function(item) {
                        var since = (new Date(item.stamp * 1000)).toString(),
                            slug = pad(item.github + '/' + item.repo, slugLen);
                        c++;
                        console.log('   ', pad('#' + c, len).yellow, item.sha1.substr(0, 7), pad(item.module, modLen), slug, ('// ' + since).grey);
                    });
                }
                util.getCDNWindow(function(str) {
                    log.log('\n ' + str);
                });
            });
        }
    },
    askSha: function() {
        var self = this;
        log.debug('asking for sha');
        util.prompt('what commit would you like to use? ', function(sha) {
            log.debug('got sha ' + sha);
            var note,
            valid = self.logs.some(function(line) {
                if (line.sha.indexOf(sha) > -1) {
                    note = line.note;
                    return true;
                }
            });

            if (!valid) {
                log.bail('sha not found in recent history, please try again');
            }
            self.submit(sha, note);
        });
    },
    submit: function(sha, note) {
        var name = this.module.name;

        git.branch(function(branch) {
            log.info('submitting cdn request for ' + name + ' with ' + sha);
            api.put('/gallery/' + name  + '/cdn/', {
                sha: sha,
                message: note,
                branch: branch
            }, function(err, data) {
                if (err) {
                    log.bail(err || err.message);
                }
                log.debug(JSON.stringify(data));
                log.info(data.message);
            });
        });
    },
    init: function(options) {
        this.options = options;
        this.cmd = options.parsed.argv.remain[0];
        if (this.cmd === 'pending') {
            this.cmd = 'waiting';
        }

        this.force = options.parsed.force;

        if (util.isYUI()) {
            switch (this.cmd) {
                case 'waiting':
                case 'approve':
                case 'deny':
                case 'queue':
                case 'logs':
                    break;
                default:
                    log.bail('command is not valid in yui repo: yogi help cdn');
            }
        }
        if (!this.cmd || !this.cmds[this.cmd]) {
            this.print();
            return;
        }

        var module = util.getPackage(true),
            mod = util.findModule(true);

        this.module = module;

        if (mod && mod.name) {
            if (!module) {
                this.module = {
                    name: mod.name
                };
            }
            this.dir = mod.dir;
        }

        this.cmds[this.cmd].call(this);
    },
    print: function() {
        log.info('valid commands: ' + Object.keys(this.cmds).join(' '));
    },
    shell_complete: [
        'request',
        'status',
        'waiting',
        'queue',
        'logs',
        'tags'
    ],
    help: function() {
        return [
            'cdn',
            '[request|status] submit/view a cdn request',
            'request - submit a cdn request',
            'status - check cdn status',
            'waiting - list all modules in the cdn pending queue',
            'queue - list all modules in the cdn queue',
            'logs - list cdn logs for buildtag (latest is default, --buildtag for other)',
            'tags - show the last 10 gallery build tags',
            '--local check local commits instead of github',
            '--force allow cdn request with dirty git root'
        ];
    }
};

util.mix(exports, mods);
