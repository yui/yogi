/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    git = require('../git'),
    path = require('path'),
    tasks = require('../cmds'),
    timethat = require('timethat'),
    which = require('which'),
    spawn = require('win-spawn'),
    log = require('../log'),
    mods = {
        yui: true,
        init: function(options) {
            this.options = options;
            var root = git.findRoot(),
                self = this,
                branch = options.parsed.argv.remain[0];

            if (!root) {
                log.bail('command only works in a git repo');
            }

            if (!branch) {
                log.bail('please specify a branch to switch to');
            }

            this.START = new Date();
            this.base = path.join(root, '../src');
            
            log.info('attempting to switch to branch: ' + branch);
            git.switchBranch(branch, function(err) {
                if (err) {
                    log.warn(branch + ' does not exist, creating..');
                    git.createBranch(branch, function(err) {
                        self.build();
                    });
                } else {
                    self.build();
                }
            });
        },
        afterBuild: function() {
            var self = this;
            log.info('after build, install npm deps');
            which('npm', function(err, npm) {
                var args = [
                        'install',
                        '--production',
                        '--log-level=silent'
                    ],
                    child;

                log.info('executing: ' + npm + ' ' + args.join(' '));

                child = spawn(npm, args, {
                    cwd: path.join(self.base, '../build-npm'),
                    stdio: 'inherit'
                });

                child.on('exit', function() {
                    log.info('yogi checkout complete in ' + timethat.calc(self.START, new Date()));
                });

            });
        },
        build: function() {
            var self = this;
            log.info('branch switch complete, building with shifter --cache --quiet --no-lint');
            process.chdir(this.base);

            tasks.build.complete = function() {
                log.info('yogi took ' + timethat.calc(self.START, new Date().getTime()) + ' to build');
                self.afterBuild();
            };
            tasks.build.init({
                parsed: {
                    argv: {
                        original: [
                            '--cache',
                            '--quiet',
                            '--no-lint'
                        ]
                    }
                }
            });
        },
        help: function() {
            return [
                'checkout',
                '<branch> The branch to swtich to and sync with'
            ];
        }
    };

util.mix(exports, mods);

