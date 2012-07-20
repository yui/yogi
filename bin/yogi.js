#!/usr/bin/env node

var log = require('../lib/log');
var config = require('../lib/config');
var args = require('../lib/args');


var options = args.parse();
config.init(options);
log.debug('starting up');

if (!options.cmd) {
    log.bail('Command not known: ' + options.main);
}

var cmd = options.cmd;

cmd.init(options);


