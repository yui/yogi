/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var log = require('./log'),
    fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
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
    }
};

util.mix(exports, mods);
