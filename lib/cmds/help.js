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
                len = 0, commands = [],
                spacer = '  ', items = {},
                detailed = options.parsed.detailed,
                extra,
                pad = function(str) {
                    var pad = '', o;
                    for (o = str.length; o < len; o++) {
                        pad += ' ';
                    }
                    return pad + str;
                };

            this.yui = util.isYUI();

            if (options.parsed.argv.remain.length) {
                scope = options.parsed.argv.remain[0];
                detailed = true;
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
            

            help.forEach(function(i, key) {
                var cmd = help[key].shift();
                items[cmd] = help[key];
                len = (cmd.length > len) ? cmd.length : len;
                commands.push(cmd);
            });
            commands.sort();
            commands.forEach(function(c, k) {
                commands[k] = pad(c);
            });
            
            log.log('');
            log.log('command line options:');
            if (!detailed) {
                log.log('   (--detailed for more)');
            }
            log.log('');
            commands.forEach(function(cmd) {
                var info = items[cmd.trim()],
                    first = info.shift(),
                    p = (info.length) ? '*' : ' ';

                cmd += p;
                log.log(spacer + cmd + spacer + first);
                if (info.length) {
                    extra = true;
                    if (detailed) {
                        info.forEach(function(line) {
                            log.log(spacer + pad('') + spacer + spacer + line);
                        });
                    }
                }
            });
            if (extra) {
                log.log('\n*help topic contains more options. --detailed for more info.');
            }

        },
        help: function() {
            return [
                '-h, --help, help',
                'show this stuff',
                'yogi help [command] to limit'
            ];
        }
    };

util.mix(exports, mods);
