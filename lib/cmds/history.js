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
    history: function(name) {
        log.info('fetching history for this module');
        api.get('/gallery/' + name + '/history', function(err, json) {
            if (err) {
                log.bail(err);
            }
            var len = 0,
                buf = 5,
                noteLen = 0,
                pad = function(str, len) {
                    if (str.length < len) {
                        for (var i = str.length; i < len; i++) {
                            str += ' ';
                        }
                    }
                    return str;
                };
            json.forEach(function(item) {
                if ((item.action.length  + buf) > len) {
                    len = item.action.length + buf;
                }
                if ((item.note.length  + buf) > noteLen) {
                    noteLen = item.note.length + buf;
                }
            });
            json.forEach(function(item) {
                var since = (new Date(item.stamp * 1000)).toLocaleString(),
                    note = item.note.replace(/<\S[^><]*>/g, ' ');
                console.log('   ', log.color(pad('[' + item.action + ']', len), 'yellow'), pad(note, noteLen), log.color('// ' + since, 'white'));
            });
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
        this.history(name);
    },
    help: function() {
        return [
            'history',
            'view a modules history log',
            '<module> pass a module name to view its log'
        ];
    }
};

util.mix(exports, mods);

