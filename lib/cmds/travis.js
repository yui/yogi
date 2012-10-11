/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    request = require('request'),
    git = require('../git'),
mods = {
    init: function() {
        var origin = git.origin(),
            user, repo, self = this;

        if (origin.indexOf('git@') === 0) {
            //private repo
            origin = origin.replace('git@github.com:', '').replace('.git', '').split('/');
        } else {
            origin = origin.replace('git://github.com/', '').replace('.git', '').split('/');
        }
        if (origin && origin.length) {
            user = origin[0];
            repo = origin[1];
        }

        if (user === 'yui' && repo === 'yui3') {
            user = repo = null;
        }

        if (user && repo) {
            log.info('checking travis status for ' + user + '/' + repo + ' and yui/yui3');
            this.getStatus(user, repo, function() {
                self.getStatus('yui', 'yui3');
            });
        } else {
            log.info('checking travis status for yui/yui3');
            self.getStatus('yui', 'yui3');
        }
    },
    getStatus: function(user, repo, callback) {
        log.debug('checking build status for: ' + user + '/' + repo);
        request({
            url: 'https://travis-ci.org/' + user + '/' + repo + '.json',
            json: true
        }, function(err, res) {
            var last = res.body.last_build_status;
            console.log('   ', ((last) ? log.bad : ((last === null) ? log.progress : log.good)), res.body.slug);
            request({
                url: 'https://travis-ci.org/' + user + '/' + repo + '/builds/' + res.body.last_build_id + '.json',
                json: true
            }, function(err, body) {

                var json = body.body,
                    sha = json.commit.substring(0, 7);

                console.log('       ', 'Compare: ', json.compare_url);
                console.log('       ', ((json.status) ? log.bad : ((json.status === null) ? log.progress : log.good)), sha, '(' + json.branch + ')',
                    json.message, '(' + json.author_name + ' <' + json.author_email + '>)', '(' + json.state + ')');
                json.matrix.forEach(function(m) {
                    var lang = m.config.language;
                    console.log('           ', ((m.result) ? log.bad : ((m.result === null) ? log.progress : log.good)),
                        m.number, lang, m.config[lang]);
                });
                if (callback) {
                    callback();
                }
            });
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
