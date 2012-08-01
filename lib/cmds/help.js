/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var log = require('../log'),
    util = require('../util'),
    version = require('./version').version,
    cmds = require('../cmds'),
    mods = {
        init: function(options) {
            var scope, help = [], self = this,
                len = 0, out = [];

            this.yui = util.isYUI();

            if (options.parsed.argv.remain.length) {
                scope = options.parsed.argv.remain[0];
            }
            log.info('yogi@' + version);
            
            Object.keys(cmds).forEach(function(name) {
                if (cmds[name].help) {
                    if (cmds[name].gallery && self.yui) {
                        return;
                    }
                    if (cmds[name].yui && !self.yui) {
                        return;
                    }
                    if (!scope || scope === name) {
                        help.push(cmds[name].help());
                    }
                }
            });

            help.forEach(function(i) {
                if (i[0].length > len) {
                    len = i[0].length;
                }
            });

            help.forEach(function(i) {
                var pad = '', o;
                if (i[0].length < len) {
                    for (o = i[0].length; o < len; o++) {
                        pad += ' ';
                    }
                }
                out.push('\t' + i[0] + pad + '\t' +  i[1]);
            });
            log.info('Command line arguments');
            out.sort();
            console.log('\n', out.join('\n'));
        },
        help: function() {
            return ['-h, --help', 'show this stuff'];
        }
    };

util.mix(exports, mods);
