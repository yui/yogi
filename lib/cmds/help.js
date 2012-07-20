var log = require('../log');
var util = require('../util');
var version = require('./version').version;
var cmds = require('../cmds');


var mods = {

    init: function() {
        log.info('yogi@' + version);
        var help = [];
        
        Object.keys(cmds).forEach(function(name) {
            if (cmds[name].help) {
                help.push(cmds[name].help());
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
