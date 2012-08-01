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
    init: function(options) {
        if (util.isYUI()) {
            log.bail('command is not valid in yui repo');
        }
        log.debug('Info Command');
        var root = git.findRoot(process.cwd()),
            origin = git.getOrigin(),
            self = this,
            module = options.parsed.argv.remain[0];

        if (!module) {
            module = util.findModule();
        }
        if (!module) {
            log.bail('please provide a module name');
        }
        log.info('showing info for ' + module);
        log.debug('fetching package.json for ' + module);
        api.get('/gallery/' + module + '/package.json', function(err, data) {
            if (err) {
                log.bail('nothing known about ' + module);
            }
            api.get('/gallery/' + module + '/cdn/', function(e, cdn) {
                var json = data.yui;
                self.json = json;
                self.meta();
                self.cdn(cdn);
                self.reports();
            });
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
    meta: function() {
        var json = this.json,
            mod = {
                requires: json.module.requires,
                optional: json.module.optional,
                supersedes: json.module.supersedes,
                skinnable: json.module.skinnable
            };
        log.info('module meta data:');
        log.log(JSON.stringify(mod, null, 2));
    },
    cdn: function(cdn) {
        if (this.json.cdn) {
            var oncdn = new Date(this.json.cdn.oncdn * 1000),
                since;

            log.info('last build tag pushed: ' + this.json.cdn.buildtag);
            log.info('module has been on the cdn since: ' + oncdn);
            if (cdn && cdn.sha1) {
                since = (new Date(cdn.stamp * 1000)).toDateString();
                log.info('is in the CDN Queue since ' + since);
                log.log('   stamp: ' + new Date(cdn.stamp * 1000));
                log.log('   sha: ' + cdn.sha1);
                log.log('   branch: ' + cdn.branch);
                log.log('   message: ' + cdn.message);
            }
        } else {
            log.info('this module is not on the cdn');
        }
    },
    help: function() {
        return [
            'info <module>',
            'show module information'
        ];
    }
};

util.mix(exports, mods);

