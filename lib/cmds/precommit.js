/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    git = require('../git'),
    path = require('path'),
    fs = require('fs'),
    tasks = require('../cmds'),
    log = require('../log'),
    mods = {
        init: function(options) {
            this.options = options;
            var test = options.parsed.test,
                remove = options.parsed.remove,
                root = git.findRoot();

            if (!root) {
                log.bail('command only works in a git repo');
            }
            this.hook = path.join(root, 'hooks/pre-commit');

            if (test || remove) {
                if (remove) {
                    this.remove();
                } else {
                    this.test();
                }
            } else {
                this.check();
            }
        },
        remove: function(callback) {
            var self = this;
            fs.readFile(this.hook, 'utf8', function(err, data) {
                var str = [],
                    inYogi = false;
                data.split('\n').forEach(function(line) {
                    if (line.indexOf('#START YOGI') === 0) {
                        inYogi = true;
                    }
                    if (!inYogi) {
                        str.push(line);
                    }
                    if (line.indexOf('#END YOGI') === 0) {
                        inYogi = false;
                    }
                });
                str = str.join('\n');
                fs.writeFile(self.hook, str, 'utf8', function() {
                    log.info('removed yogi precommit hook');
                    if (callback) {
                        callback();
                    }
                });
            });
        },
        test: function() {
            var root = path.join(git.findRoot(), '../'),
                self = this;
            git.changedModules(function(mods) {
                log.info('yogi precommit found changes for: ' + mods.join(', '));
                var _check = function() {
                    var m = mods.pop(),
                        cwd;
                    if (m) {
                        log.debug('linting mod: ' + m);
                        cwd = path.join(root, 'src', m);
                        log.debug('CWD: ' + cwd);
                        process.chdir(cwd);
                        self.options.fail = true;
                        self.options.callback = function() {
                            log.debug('testing mod: ' + m);
                            self.options.callback = function() {
                                log.debug('callback from ' + m);
                                _check();
                            };
                            tasks.test.init(self.options);
                        };
                        tasks.lint.init(self.options);
                    } else {
                        log.info('if we got here, we should be good, you may commit now!');
                    }
                };
                _check();
            });
        },
        cmd: function() {
            var str = [
                '#START YOGI PRECOMMIT',
                'yogi precommit --test',
                '#END YOGI PRECOMMIT'
            ];
            return str.join('\n');
        },
        perms: function() {
            fs.chmod(this.hook, parseInt('754', 8), function() {
                log.info('done');
            });
        },
        create: function() {
            log.info('creating file');
            var self = this;
            fs.writeFile(this.hook, this.cmd(), 'utf8', function() {
                log.debug('changing perms');
                self.perms();
            });
        },
        check: function() {
            log.debug('using hook: ' + this.hook);
            var self = this;
            fs.stat(this.hook, function(err, stat) {
                if (stat) {
                    if (!stat.isFile()) {
                        log.debug('file does not exit, creating it');
                        self.create();
                    } else {
                        log.debug('file exists, reading it');
                        self.remove(function() {
                            self.create();
                        });
                    }
                } else {
                    log.debug('file does not exit, creating it');
                    self.create();
                }
            });
        },
        help: function() {
            return [
                'precommit',
                'adds a precommit hook to this project',
                '--remove to remove the hook',
                '--test to test the hook'
            ];
        }
    };

util.mix(exports, mods);
