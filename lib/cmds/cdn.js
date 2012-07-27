var util = require('../util'),
    log = require('../log'),
    git = require('../git'),
    api = require('../api');


var mods = {
    gallery: true,
    cmds: {
        request: function() {
            var self = this;
            log.info('submitting a cdn request for ' + this.module.name);
            git.status(function(status) {
                if (status && status.length) {
                    log.bail('git root is dirty, please commit first');
                }
                git.log(function(logs) {
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
        delete: function() {
            var self = this;
            log.warn('about to remove this module from the CDN queue');
            util.prompt('are you sure about this? [y/N] ', function(ans) {
                ans = ans.toLowerCase() || 'n';
                if (ans !== 'y') {
                    log.bail('bailing');
                }
                api.delete('/gallery/' + self.module.name + '/cdn', function(err, json) {
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
                    log.bail(err)
                }
                var since = (new Date(json.stamp * 1000)).toDateString();
                log.info(self.module.name + ' is in the CDN Queue since ' + since);
                log.log('   stamp: ' + new Date(json.stamp * 1000));
                log.log('   sha: ' + json.sha1);
                log.log('   branch: ' + json.branch);
                log.log('   message: ' + json.message);
            });
        }
    },
    askSha: function() {
        var self = this;
        log.debug('asking for sha');
        util.prompt('what commit would you like to use? ', function(sha) {
            log.debug('got sha ' + sha);
            var note;
            var valid = self.logs.some(function(line) {
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
        var name = this.module.name,
            self = this;

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
        if (util.isYUI()) {
            log.bail('command is not valid in yui repo');
        }
        this.options = options;
        this.cmd = options.parsed.argv.remain[0];
        if (!this.cmd || !this.cmds[this.cmd]) {
            this.print();
            return;
        }

        var module = util.getPackage();
        this.module = module;

        this.dir = util.findModule(true).dir;

        this.cmds[this.cmd].call(this);
    },
    print: function() {
        log.info('valid commands: ' + Object.keys(this.cmds).join(' '));
    },
    help: function() {
        return [
            'cdn',
            '[request|status] submit/view a cdn request'
        ];
    }
};

util.mix(exports, mods);
