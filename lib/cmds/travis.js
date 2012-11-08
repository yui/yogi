/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    travis = require('git-travis'),
    git = require('../git'),
mods = {
    init: function() {
        var info = git.userAndRepo(),
            user = info[0],
            repo = info[1];

        if (user === 'yui' && repo === 'yui3') {
            user = repo = null;
        }

        git.branch(function(branch) {
            if (user && repo) {
                log.info('checking travis status for ' + user + '/' + repo + ' and yui/yui3 on branch ' + branch);
                log.log('');
                travis.print(user, repo, branch, function() {
                    log.log('');
                    travis.print('yui', 'yui3', branch, function() {
                        log.log('');
                    });
                });
            } else {
                log.info('checking travis status for yui/yui3:' + branch);
                log.log('');
                travis.print('yui', 'yui3', branch, function() {
                    log.log('');
                });
            }
        });
    },
    help: function() {
        return [
            'travis',
            'check travis builds for yui and your fork'
        ];
    }
};

util.mix(exports, mods);
