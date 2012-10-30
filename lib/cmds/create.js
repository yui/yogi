/*jshint maxlen: 200 */

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    config = require('../config'),
    path = require('path'),
    create = require('../create'),
    git = require('../git'),
    api = require('../api'),
mods = {
    init: function(options) {
        this.options = options;
        this.module = options.parsed.argv.remain[0];
        this._init = options.parsed.init;
        this.type = options.parsed.type;
        this.yes = options.parsed.yes;

        if (!this.module) {
            log.bail('please provide a module name to create');
        }

        this.module = this.module.toLowerCase();
        
        var mod = this.module.replace(/[^A-Za-z0-9\.\-]+/g, '');
        if (this.module !== mod) {
            log.bail('name contained invalid characters, cleaned it would be: ' + mod);
        }
        this.root = git.findRoot();

        if (!this.root) {
            log.bail('you must be in a git repo for this to work!');
        }

        this.github = config.get('gh_user');
        
        if (!this.github) {
            log.bail('please connect your github account with: yogi gh');
        }

        if (this.root) {
            this.origin = git.origin();
        }
        
        this.repo = this.options.parsed.repo;

        if (this.origin && !this.repo) {
            this.repo = this.origin.replace('.git', '').split('/')[1];
        }
        this.path = this.options.parsed.path || 'src/gallery-' + mod;
        
        log.log('-------------------------------------------------------------------------');
        log.info('yogi found this git origin:   ' + this.origin);
        log.info('and this repo:                ' + this.repo);
        log.info('using this path:              ' + this.path);
        log.log('-------------------------------------------------------------------------');
        if (this.yes) {
            log.warn('\nskipping questions, yogi will assume yes to all..\n');
        }
        this.check();
    },
    check: function() {
        var self = this;
        log.info('checking if ' + this.module + ' is free');
        api.get('/gallery/' + this.module, function(err, json) {
            if (json) {
                if (!self._init) {
                    log.error('module name is already in use: yogi info ' + json.module);
                }
                log.warn('this modue has already been registered!!');
                if (self.yes) {
                    self.initialize();
                } else {
                    util.prompt('are you sure you wish to initialize it locally? [y/N] ', function(ans) {
                        if (ans.toLowerCase().indexOf('y') === 0) {
                            self.initialize();
                        } else {
                            log.bail('bailing..');
                        }
                    });
                }
            } else {
                log.info('module name is free');
                if (self.yes) {
                    self.hold();
                } else {
                    util.prompt('are you sure you want to request this name with the above information? [Y/n] ', function(answer) {
                        if (answer.toLowerCase().indexOf('y') === 0 || answer === '') {
                            self.hold();
                        } else {
                            log.bail('bailing..');
                        }
                    });
                }
            }
        });
    },
    initialize: function() {
        var self = this;

        self.location = path.join(this.root, '../', this.path);

        log.log('');
        log.log('');
        log.info('initializing new module with the following info:');
        log.log('');
        log.log('--------------------------------------------------------------------------------------');
        log.info('yogi found this git origin:   ' + this.origin);
        log.info('in this location:             ' + this.root);
        log.info('and this repo:                ' + this.repo);
        log.info('using this path:              ' + this.path);
        log.info('of type:                      ' + this.type);
        if (this.type === 'widget') {
            log.info('and skinnable');
        }
        log.info('');
        log.info('yogi will create this module here:');
        log.info('  ' + self.location);
        log.info('');
        log.log('---------------------------------------------------------------------------------------');
        log.log('');
        if (self.yes) {
            self.create();
        } else {
            util.prompt('does the above look correct? may yogi create this module? [y/N] ', function(ans) {
                if (ans && ans.toLowerCase().indexOf('y') === 0) {
                    self.create();
                } else {
                    log.bail('bailing..');
                }
            });
        }
    },
    create: function() {
        create.init({
            type: this.type,
            location: this.location,
            root: this.root,
            path: this.path,
            name: this.module,
            repo: this.repo,
            origin: this.origin
        }, function() {
        });
    },
    hold: function() {
        var self = this;
        log.info('yogi is requesting this module for you');
        api.post('/gallery/' + this.module, {
            repo: this.repo,
            path: this.path
        }, function(err, json) {
            if (err) {
                log.bail(err);
            }
            if (!json.approved) {
                log.warn('---------------------------------------------');
                log.warn('module needs approval, you can request with: ');
                log.warn('      yogi info ' + json.module + ' --approve');
                log.warn('you can also check it\'s status with:');
                log.warn('      yogi info ' + json.module + '');
                log.warn('---------------------------------------------');
            } else {
                log.info(json.module + ' was created successfully');
            }
            if (self._init) {
                self.initialize();
            }
        });
    },
    help: function() {
        return [
            'create <module>',
            'create a new module in the gallery db',
            '--init to create the file tree',
            '--yes automatically assume yes to all questions',
            '--type <js|css|widget> the type of module to create',
            '--path <src/path> set the source path'
        ];
    }
};

util.mix(exports, mods);

