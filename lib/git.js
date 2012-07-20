var log = require('./log'),
    fs = require('fs'),
    path = require('path'),
    util = require('./util');

var mods = {
    findRoot: function(start) {
        if (this.root) {
            return this.root;
        }
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
        var gitConfig = path.join(this.root, 'config');
        log.debug('reading git config: ' + gitConfig);
        var config = fs.readFileSync(gitConfig, 'utf8');
        config = config.split('\n');
        var remote = false;
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
