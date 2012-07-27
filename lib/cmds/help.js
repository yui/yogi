var log = require('../log');
var util = require('../util');
var version = require('./version').version;
var cmds = require('../cmds');


var mods = {

    init: function(options) {
        var scope;
        this.yui = util.isYUI();

        if (options.parsed.argv.remain.length) {
            scope = options.parsed.argv.remain[0];
        }
        log.info('yogi@' + version);
        var help = [], self = this;
        
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

        var len = 0;
        help.forEach(function(i) {
            if (i[0].length > len) {
                len = i[0].length;
            }
        });

        var out = [];
        help.forEach(function(i) {
            var pad = '';
            if (i[0].length < len) {
                for (var o = i[0].length; o < len; o++) {
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
        return ['-h, --help', 'show this stuff']
    }

};

util.mix(exports, mods);
