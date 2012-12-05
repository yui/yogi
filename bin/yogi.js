#!/usr/bin/env node

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

var log = require('../lib/log');
var config = require('../lib/config');
var args = require('../lib/args');
var which = require('which');
var spawn = require('win-spawn');
var path = require('path');

var options = args.parse();
config.init(options);
var version = require('../lib/cmds/version');
if (options.main && options.main !== 'version') {
    log.info('using yogi@' + version.version + ' on node@' + process.versions.node);
}
//log.warn('THIS IS EXPERIMENTAL, USE AT YOUR OWN RISK!!');
log.debug('starting up yogi');
log.debug("I'm smarter than the av-er-age bear!");

if (!options.cmd) {
    var external;

    try {
        external = which.sync('yogi-' + options.main);
    } catch (e) {
    }
    if (external) {
        log.debug('executing external command: ' + external);
        var env = process.env;
        env.YOGI_PATH = path.join(__dirname, '../');

        external = spawn(external, process.argv.splice(3), {
            cwd: process.cwd(),
            env: env,
            stdio: 'inherit'
        });
    } else {
        log.bail('Command not known: ' + options.main);
    }

} else {
    var cmd = options.cmd;

    if (cmd.init) {
        cmd.init(options);
        if (cmd.run) {
            cmd.run();
        }
    } else if (Array.isArray(cmd)) {
        log.info('available commands: ' + cmd.join(' '));
    }
}
