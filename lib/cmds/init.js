/*jshint maxlen: 200, forin: false */

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    create = require('./create'),
    mods = {}, i;

for (i in create) {
    mods[i] = create[i];
}

mods.run = function() {
    if (util.isYUI()) {
        log.info('initializing new YUI core module ' + this.module);
    } else {
        log.info('initializing new module ' + this.module);
    }
    this._init = true;
    this.path = 'src/' + this.module;
    this.print();
    this.initialize();
};

mods.help = function() {
    return [
        'init <module>',
        'init a new module on disk',
        '--yes automatically assume yes to all questions',
        '--type <js|css|widget> the type of module to create'
    ];
};

util.mix(exports, mods);
