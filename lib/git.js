/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var log = require('./log'),
    fs = require('fs'),
    path = require('path'),
    config = require('./config'),
    exec = require('child_process').exec,
    request = require('request'),
    util = require('./util'),

mods = {
    status: function(cb) {
        this.findRoot();
        exec('git status --short', function(err, stdout, stderr) {
            if (err || stderr) {
                log.bail(err || stderr);
            }
            var status = null;
            if (stdout) {
                status = stdout.trim().split('\n');
            }
            cb(status);
        });
    },
    origin: function() {
        return this.getOrigin();
    },
    branch: function(cb) {
        this.findRoot();
        exec('git status', {
            cwd: process.cwd()
        }, function(err, stdout) {
            var branch = stdout.trim().split('\n')[0];
            branch = branch.replace('# On branch ', '') || 'master';
            cb(branch);
        });
    },
    ghlog: function(cb) {
        log.info('fetching commits from github');
        this.findRoot();
        var info = this.userAndRepo(),
            p = path.relative(path.join(this.root, '../'), process.cwd()),
            url = 'https://api.github.com/repos/' + info[0] + '/' + info[1] + '/commits?per_page=100&path=' + p,
            headers = {
                'Content-Type' : 'application/json',
                'User-Agent': 'yogi CLI tool'
            };

        if (config.get('gh_token')) {
            headers.Authorization = 'bearer ' + config.get('gh_token');
        }
        
        request.get({
            url: url,
            headers: headers,
            json: true
        }, function(err, res) {
            if (err) {
                return mods.log(cb);
            }
            var commits = [];

            res.body.forEach(function(item) {
                var o = {
                    sha: item.sha,
                    note: item.commit.message
                };
                commits.push(o);
            });
            cb(commits);
        });
    },
    log: function(cb) {
        this.findRoot();
        exec('git --no-pager log -n 10 --no-merges --format=oneline .', {
            cwd: process.cwd()
        }, function(err, stdout, stderr) {
            if (err || stderr) {
                log.bail(err || stderr);
            }
            var commits = [];
            if (stdout) {
                commits = stdout.trim().split('\n');
                commits.forEach(function(line, key) {
                    var info = line.trim().split(' '),
                        sha = info.shift(),
                        note = info.join(' ');

                    commits[key] = {
                        sha: sha,
                        note: note
                    };
                });
            }
            cb(commits);
        });
    },
    findRoot: function(start) {
        if (this.root) {
            return this.root;
        }
        start = start || process.cwd();
        log.debug('Finding parent git root for ' + start);
        var self = this;

        util.find(start, '.git', function(err, file) {
            if (file) {
                self.root = file;
            }
        });
        if (this.root) {
            log.debug('Git root found at: ' + this.root);
        } else {
            log.bail('Unable to find parent git root, is this in a git repo?');
        }
        return this.root;
    },
    getOrigin: function() {
        if (this.remote) {
            return this.remote;
        }
        this.findRoot();
        var gitConfig = path.join(this.root, 'config'),
            config = fs.readFileSync(gitConfig, 'utf8'),
            remote = false;

        log.debug('reading git config: ' + gitConfig);
        config = config.split('\n');
        config.some(function(line) {
            if (remote && line.indexOf('url = ') > -1) {
                remote = line.replace('url = ', '').trim();
                return true;
            }
            if (line.indexOf('[remote "origin"]') > -1) {
                remote = true;
            }
        });
        this.remote = remote;
        log.debug('Origin: ' + remote);
        return remote;
    },
    userAndRepo: function() {
        var origin = this.origin(),
            user, repo;

        if (origin.indexOf('git@') === 0) {
            //private repo
            origin = origin.replace('git@github.com:', '').replace('.git', '').split('/');
        } else {
            origin = origin.replace('git://github.com/', '').replace('.git', '').split('/');
        }
        if (origin && origin.length) {
            user = origin[0];
            repo = origin[1];
        }
        
        return [user, repo];
    },
    changedModules: function(callback) {
        var cmd = 'git diff --name-status',
            cwd = path.join(this.findRoot(), '../'),
            mods = {};
        
        if ('GIT_INDEX_FILE' in process.env) {
            //We are in the pre-commit hook
            cmd = 'git diff --cached --name-status --diff-filter=ACM';
        }
        
        log.debug('executing: ' + cmd);
        log.debug('in CWD: ' + cwd);
        exec(cmd, {
            cwd: cwd
        }, function(err, stdout) {
            var items = stdout.trim().split('\n');
            log.debug('Changed items..');
            log.debug(items.join('\n'));
            items.forEach(function(line) {
                line = line.split('\t')[1];
                if (line && (line.indexOf('src') === 0 || line.indexOf('build') === 0)) {
                    var mod = line.split(path.sep)[1];
                    if (util.exists(path.join(cwd, 'src', mod))) {
                        mods[mod] = true;
                    }
                }
            });
            callback(Object.keys(mods).sort());
        });

    }
};

util.mix(exports, mods);
