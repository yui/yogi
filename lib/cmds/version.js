var path = require('path'),
    util = require('../util');
    fs = require('fs');

var version = '';

var version = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')).version;

var mods = {
    init: function() {
        console.log(version);
    },
    version: version,
    help: function() {
        return ['-v, --version', 'show yogi version']
    }
};

util.mix(exports, mods);
