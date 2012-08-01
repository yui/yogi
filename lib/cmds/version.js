/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var path = require('path'),
    util = require('../util'),
    fs = require('fs'),
    version = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')).version,
    mods = {
        init: function() {
            console.log(version);
        },
        version: version,
        help: function() {
            return ['-v, --version', 'show yogi version'];
        }
    };

util.mix(exports, mods);
