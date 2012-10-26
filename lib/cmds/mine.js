/*jshint maxlen: 200 */

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
                            };
                        json.modules.forEach(function(item, key) {
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
                        console.log('   ', pad('#', len).yellow, pad('name', tLen), pad('module', modLen), pad('slug', slugLen), ('since action'));
                        json.modules.forEach(function(item) {
                            var since = 'created: ' + (new Date(item.created * 1000)).toString(),
                                slug = pad(item.github + '/' + item.repo, slugLen),
                                color = 'yellow',
                                stampColor = 'red';
                            c++;
                            if (item.cdn) {
                                stampColor = 'grey';
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


                            console.log('   ', pad('#' + c, len)[color], pad(item.title, tLen), pad(item.module, modLen), pad(slug, slugLen), ('// ' + since)[stampColor]);
                        });
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
