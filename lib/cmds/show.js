/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var api = require('../api'),
    util = require('../util'),
    log = require('../log');

var mods = {
    gallery: true,
    init: function(options) {
        if (util.isYUI()) {
            log.bail('command is not valid in yui repo');
        }
        var module = options.parsed.argv.remain[0];
        if (!module) {
            module = util.findModule();
        }
        if (!module) {
            log.bail('please provide a module name');
        }
        log.info('fetching package.json for ' + module);
        api.get('/gallery/' + module + '/package.json', function(err, data) {
            log.log(JSON.stringify(data, null, 2));
        });
    },
    help: function() {
        return ['show <module>', 'fetches the package.json for <module>']
    }
};

util.mix(exports, mods);
