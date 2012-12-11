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
    init: function(options) {
        this.options = options;

        log.info('fetching your gallery modules');

        api.get('/gallery-by/', function(err, json) {
            if (err) {
                log.bail(err);
            }
            api.getNon('/cdn/buildtag', function(err, j) {
                if (json.count) {
                    if (json.count) {
                        var len = 0,
                            buildtag = j.buildtag,
                            c = 0,
                            buf = 2,
                            modLen = 0,
                            slugLen = 0,
                            tLen = 0,
                            pad = function(str, len) {
                                if (str.length < len) {
                                    for (var i = str.length; i < len; i++) {
                                        str += ' ';
                                    }
                                }
                                return str;
                            },
                            pending = [];
                        json.modules.forEach(function(item, key) {
                            if (!item.approved) {
                                pending.push(item);
                                return;
                            }
                            var c = String(key + 1),
                                slug = item.github + '/' + item.repo;
                            if ((c.length  + buf) > len) {
                                len = c.length + buf;
                            }
                            if ((item.module.length + buf) > modLen) {
                                modLen = item.module.length + buf;
                            }
                            if ((item.title.length + buf) > tLen) {
                                tLen = item.title.length + buf;
                            }
                            if ((slug.length + buf) > slugLen) {
                                slugLen = slug.length + buf;
                            }
                        });
                        log.log('');
                        console.log('   ', log.color(pad('#', len), 'yellow'), log.color(pad('name', tLen), 'yellow'), log.color(pad('module', modLen), 'yellow'), log.color(pad('slug', slugLen), 'yellow'), log.color('since action', 'yellow'));
                        json.modules.forEach(function(item) {
                            if (!item.approved) {
                                return;
                            }
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


                            console.log('   ', log.color(pad('#' + c, len),color), pad(item.title, tLen), pad(item.module, modLen), pad(slug, slugLen), log.color('// ' + since, stampColor));
                        });
                        if (pending.length) {
                            log.log('');
                            log.log('   ----------------------------------------------');
                            log.log('           pending modules');
                            log.log('   ----------------------------------------------');
                            pending.forEach(function(item) {
                                var stamp = (new Date());
                                console.log('   ', item.module, 'has been pending for ' + timethat.calc((new Date(item.created * 1000)), stamp));
                            });
                        }
                        log.log('\n current build tag: ' + buildtag);
                        util.getCDNWindow(function(str) {
                            log.log(' ' + str + '\n');
                        });
                    }
                } else {
                    log.warn('no modules found for this user');
                }
            });
        });
    },
    help: function() {
        return [
            'mine',
            'show your gallery modules'
        ];
    }
};

util.mix(exports, mods);
