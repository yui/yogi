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
    logs: function(name) {
        log.info('fetching history for this module');
        api.get('/gallery/' + name + '/logs', function(err, json) {
            if (err) {
                log.bail(err);
            }

            log.info('showing logs for: ' + json.build_message + '\n');
            if (json.failed) {
                log.warn('------------------------------------');
                log.warn('  this module failed to build');
                log.warn('------------------------------------');
            }
            if (json.logs) {
                console.log(json.logs);
            } else {
                console.log(json.lint);
            }

            if (json.test_results) {
                log.info('---------------------- test results --------------------------\n');
                json.test_results = JSON.parse(json.test_results);
                if (!Object.keys(json.test_results).length) {
                    log.warn('this module does not provide tests');
                } else {
                    log.info('latest test results');
                    var grover = require('grover/lib/index');
                    grover.status(json.test_results);
                }
            } else {
                log.warn('this build has no tests');
            }
        });
    },
    init: function(options) {
        this.options = options;
        var mod = util.findModule(true),
            name,
            other = options.parsed.argv.remain[0];

        if (other) {
            name = other;
        } else if (mod) {
            name = mod.name;
        }
        if (!name) {
            log.bail('either provide a module name or enter a module directory');
        }
        this.logs(name);
    },
    help: function() {
        return [
            'logs',
            'view a modules cdn log',
            '<module> pass a module name to view its log'
        ];
    }
};

util.mix(exports, mods);

