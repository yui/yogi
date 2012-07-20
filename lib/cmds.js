
var fs = require('fs'),
    path = require('path');

var files = fs.readdirSync(path.join(__dirname, './cmds'));
var mods = {};
files.forEach(function(file) {
    if (path.extname(file) === '.js') {
        var mod = file.replace('.js', '');
        exports[mod] = require('./cmds/' + mod);
    }
});

