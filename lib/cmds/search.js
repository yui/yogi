/*jshint maxlen: 300 */

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    timethat = require('timethat'),
    api = require('../api'),
mods = {
    gallery: true,
    init: function(options) {
        this.options = options;
        var q, START = new Date();

        if (options.parsed.argv.remain.length) {
            q = options.parsed.argv.remain[0];
        }

        if (!q || q === '') {
            log.bail('nothing to search for');
        }

        log.info('searching for: ' + q);

        this.q = q;

        api.getNon('/gallery/search/?q=' + encodeURIComponent(q), function(err, json) {
            if (err) {
                log.bail(err);
            }
            api.getNon('/cdn/buildtag', function(err, j) {
                if (json.count) {
                    log.info('yogi found ' + json.count + ' results for: ' + q);
                    var len = 0,
                        buildtag = j.buildtag,
                        c = 0,
                        buf = 2,
                        modLen = 0,
                        slugLen = 0,
                        uLen = 0,
                        pad = function(str, len) {
                            if (str.length < len) {
                                for (var i = str.length; i < len; i++) {
                                    str += ' ';
                                }
                            }
                            str = str.replace(q, log.color(q, 'cyan'));
                            return str;
                        };

                    json.results.forEach(function(item, key) {
                        var c = String(key + 1),
                            slug = item.github + '/' + item.repo;
                        if ((c.length  + buf) > len) {
                            len = c.length + buf;
                        }
                        if ((item.module.length + buf) > modLen) {
                            modLen = item.module.length + buf;
                        }
                        if ((item.username.length + buf) > uLen) {
                            uLen = item.username.length + buf;
                        }
                        if ((slug.length + buf) > slugLen) {
                            slugLen = slug.length + buf;
                        }
                    });
                    log.log('');
                    console.log('   ', log.color(pad('#', len), 'yellow'), log.color(pad('user', uLen), 'yellow'), log.color(pad('module', modLen), 'yellow'), log.color(pad('slug', slugLen), 'yellow'), log.color('since action', 'yellow'));
                    json.results.forEach(function(item) {
                        var since = 'created: ' + (new Date(item.created * 1000)).toString(),
                            slug = pad(item.github + '/' + item.repo, slugLen),
                            color = 'yellow',
                            stampColor = 'red';
                        c++;
                        if (item.cdn) {
                            stampColor = 'white';
                            since = 'on cdn: ' + (new Date(item.cdn* 1000)).toString();
                        }
                        if (!item.approved) {
                            color = 'red';
                        }
                        if (item.cdnqueue) {
                            stampColor = 'cyan';
                            since = 'in cdn queue: ' + (new Date(item.cdnqueue * 1000)).toString();
                        }
                        if (item.cdnpending) {
                            stampColor = 'yellow';
                            since = 'pending cdn approval: ' + (new Date(item.cdnpending * 1000)).toString();
                        }

                        console.log('   ', log.color(pad('#' + c, len), color), pad(item.username, uLen), pad(item.module, modLen), pad(slug, slugLen), log.color('// ' + since, stampColor));
                    });

                    log.log('\n current build tag: ' + buildtag);
                    util.getCDNWindow(function(str) {
                        log.log(' ' + str);
                        log.log(' yogi completed the search in ' + timethat.calc(START, new Date()));
                    });
                } else {
                    log.warn('no modules found');
                }
            });
        });
    },
    help: function() {
        return [
            'search <query>',
            'find gallery modules'
        ];
    }
};

util.mix(exports, mods);

