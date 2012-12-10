/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var log = require('../log'),
    util = require('../util'),
    path = require('path'),
    pack = require('./version').pack,
    spawn = require('win-spawn'),
    which = require('which'),
    os = require('os');

var mods = {
    init: function() {
        log.info('printing yogi debug information:');
        var data = {
            yogi: pack.version
        }, len = 0,
        workingDir = path.join(__dirname, '../../'),
        cpus = os.cpus(),
        child,
        pad = function(str) {
            var l = str.length, i;
            for (i = l; i <= len + 3; i++) {
                str += ' ';
            }
            return str;
        };
        Object.keys(process.versions).forEach(function(name) {
            data[name] = process.versions[name];
        });
        Object.keys(process.config.variables).forEach(function(name) {
            data['config.' + name] = process.config.variables[name];
        });
        
        data['yogi path'] = workingDir;
        data.execPath = process.execPath;
        data.hostname = os.hostname();
        data.type = os.type();
        data.platform = os.platform();
        data.arch = os.arch();
        data.release = os.release();
        
        log.log('');
        log.info('----- start yogi debug -----\n');
        
        Object.keys(data).forEach(function(name) {
            if (name.length > len) {
                len = name.length;
            }
        });

        Object.keys(data).sort().forEach(function(name) {
            log.log('\t' + pad(name + ':') + data[name]);
        });

        log.log('\tcpus: ');
        cpus.forEach(function(c) {
            log.log('\t\t' + c.model);
        });

        log.log('');
        log.info('fetching npm information, please wait\n');
        child = spawn(which.sync('npm'), ['ls'], {
            cwd: workingDir
        });

        child.stdout.on('data', function(d) {
            var lines = d.toString().trim().split('\n');
            lines.forEach(function(line) {
                log.log('\t' + line);
            });
        });

        child.on('exit', function() {
            log.info('----- end yogi debug -----');
        });
    },
    help: function() {
        return [
            'debug',
            'print debugging info for yogi bug reports'
        ];
    }
};

util.mix(exports, mods);


