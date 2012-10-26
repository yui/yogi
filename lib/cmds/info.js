/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    api = require('../api'),
mods = {
    gallery: true,
    init: function(options) {
        if (util.isYUI()) {
            log.bail('command is not valid in yui repo');
        }
        log.debug('Info Command');
        var module = options.parsed.argv.remain[0];

        if (!module) {
            module = util.findModule();
        }
        if (!module) {
            log.bail('please provide a module name');
        }
        this.module = module;

        if (options.parsed['set-repo'] || options.parsed['set-path']) {
            this.set(options.parsed['set-repo'], options.parsed['set-path']);
            return;
        }
        this.fetch();
    },
    fetch: function() {
        var module = this.module,
            self = this;
        log.info('showing info for ' + module);
        api.get('/gallery/' + module + '/package.json', function(err, data) {
            if (err) {
                log.bail('nothing known about ' + module);
            }
            api.get('/gallery/' + module + '/cdn/', function(e, cdn) {
                var json = data.yui;
                self.json = json;
                self.cdn(cdn);
                self.reports();
            });
        });
    },
    set: function(repo, path) {
        var self = this;
        log.info('updating info for this module:');
        if (repo) {
            log.info('setting repo to: ' + repo);
        }
        if (path) {
            log.info('setting path to: ' + path);
        }
        api.put('/gallery/' + this.module + '/set', {
            repo: repo,
            path: path
        }, function(e) {
            if (e) {
                log.bail(e);
            }
            self.fetch();
        });
    },
    reports: function() {
        var json = this.json.reports;
        if (!Object.keys(json.coverage).length) {
            log.warn('this module does not provide code coverage');
        }
        if (!Object.keys(json.tests).length) {
            log.warn('this module does not provide tests');
        }
    },
    cdn: function(cdn) {
        if (this.json.cdn) {
            var oncdn = new Date(this.json.cdn.oncdn * 1000),
                since, self = this,
                repo = '';

            console.log('');
            log.log('   ' + this.json.cdn.github + '/' + self.module);
            console.log('');
            log.log('   module has been on the cdn since: ' + oncdn.toDateString());
            log.log('   last build tag pushed: ' + this.json.cdn.buildtag);
            if (cdn && cdn.sha1) {
                since = (new Date(cdn.stamp * 1000)).toDateString();
                repo = 'git://github.com/' + cdn.github  + '/' + cdn.repo + '.git';
                log.log('   currently in the CDN Queue since ' + since);
                console.log('');
                log.log('       stamp:      ' + new Date(cdn.stamp * 1000));
                log.log('       sha:        ' + cdn.sha1);
                log.log('       repo:       ' + repo);
                log.log('       message:    ' + cdn.message);
                console.log('');
                log.log('       clone this request:');
                log.log('           git clone ' + repo);
                log.log('           cd ' + self.json.cdn.path);
                log.log('           git checkout ' + cdn.sha1.substr(0, 7));
                console.log('');
                util.getCDNWindow(function(str) {
                    log.log('   ' + str);
                });
            }
            console.log('');
        } else {
            log.info('this module is not on the cdn');
        }
    },
    help: function() {
        return [
            'info <module>',
            'show module information',
            '--set-repo=<repo> Set the name of the repo if you do not use yui3-gallery',
            '--set-path=<path> Set the path to the module under the repo, defaults to src/'
        ];
    }
};

util.mix(exports, mods);

