/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var path = require('path'),
    util = require('../util'),
    http = require('http'),
    request,
    latest,
    fs = require('fs'),
    version = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')).version,
    mods = {
        init: function() {
            request = http.get('http://registry.npmjs.org/yogi/latest', function (res) {
                var c = '';
                res.on('data', function (chunk) {
                    c += chunk;
                });
                res.on('end', function () {
                    var json = JSON.parse(c);
                    latest = json.version;
                    if (version < latest) {
                        console.log('!!!WARNING!!!'.red);
                        console.log(('your version ' + version + ' is out of date, the latest available version is ' + latest).red);
                        console.log('update with: npm -g install yogi'.blue);
                        process.exit(1);
                    }
                });
            }).on('error', function () {
                console.log(version);
                process.exit(0);
            });
            setTimeout(function () {
                request.abort();
                console.log(version);
                process.exit(0);
            }, 500);
        },
        version: version,
        help: function() {
            return ['-v, --version', 'show yogi version'];
        }
    };

util.mix(exports, mods);
