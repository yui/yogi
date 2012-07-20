var util = require('../util');
var log = require('../log');
var git = require('../git');
var api = require('../api');

var mods = {
    init: function(options) {
        log.debug('Info Command');
        var root = git.findRoot(process.cwd());

        var origin = git.getOrigin();
        var module = options.parsed.argv.remain[0];
        if (!module) {
            module = util.findModule();
        }
        if (!module) {
            log.bail('please provide a module name');
        }
        log.info('showing info for ' + module);
        log.debug('fetching package.json for ' + module);
        var self = this;
        api.get('/gallery/' + module + '/package.json', function(err, data) {
            var json = data.yui;
            self.json = json;
            self.meta();
            self.cdn();
            self.reports();
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
        var json = this.json;
        var mod = {
            requires: json.module.requires,
            optional: json.module.optional,
            supersedes: json.module.supersedes,
            skinnable: json.module.skinnable
        };
        log.info('module meta data:');
        log.log(JSON.stringify(mod, null, 2));
    },
    cdn: function() {
        if (this.json.cdn) {
            var cdn = new Date(this.json.cdn.oncdn * 1000);
            log.info('last build tag pushed: ' + this.json.cdn.buildtag);
            log.info('module has been on the cdn since: ' + cdn);
        } else {
            log.info('this module is not on the cdn');
        }
    }
};

util.mix(exports, mods);

