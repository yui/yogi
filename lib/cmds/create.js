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
    mods;


config.register('shortpath', 'set to true to always use the gallery shortpath when creating: src/module instead of src/gallery-module');

mods = {
    init: function(options) {
        this.options = options;
        this.module = options.parsed.argv.remain[0];
        this._init = options.parsed.init;
        this.type = options.parsed.type;
        this.yes = options.parsed.yes;
        this.license = options.parsed.license || 'YUI BSD';

        this.license = this.license.toUpperCase();

        if (!this.module) {
            log.bail('please provide a module name to create');
        }

        this.module = this.module.toLowerCase();

        if (this.module.indexOf('gallery-') === 0 || this.module.indexOf('gallerycss-') === 0) {
            this.module = this.module.replace('gallery-', '').replace('gallerycss-', '');
            log.warn('gallery- prefix is not required here, I have removed it for you.');
        }
        
        var mod = this.module.replace(/[^A-Za-z0-9\.\-]+/g, '');
        if (this.module !== mod) {
            log.bail('name contained invalid characters, cleaned it would be: ' + mod);
        }
        this.root = git.findRoot();

        if (!this.root) {
            log.bail('you must be in a git repo for this to work!');
        }

        if (this.root) {
            this.origin = git.origin();
        }
        
        this.repo = this.options.parsed.repo;
        this.github = this.options.parsed.github;

        if (this.origin && !this.repo) {
            this.repo = this.origin.replace('.git', '').split('/')[1];
        }
        if (this.origin && !this.github) {
            this.github = this.origin.split(':')[1].split('/')[0];
        }
        this.path = this.options.parsed.path || 'src/gallery-' + mod;


    },
    run: function() {

        if (util.isYUI()) {
            if (!this._init) {
                log.bail('nothing to do, forget --init?');
            }
            log.warn('creating a YUI core module');
            this.path = 'src/' + this.module;
        } else {
            if (config.get('shortpath') && !this.options.parsed.path) {
                this.path = 'src/' + this.module;
            } else if (this.options.parsed.path) {
                log.info('---------------------------------');
                log.info('yogi config set shortpath true');
                log.log('');
                log.info('this will tell yogi to always');
                log.info('  use the shortpath when creating');
                log.info('----------------------------------');
            }
        }

        if (this.module.indexOf('gallery') === -1) {
            this.module = 'gallery' + ((this.type === 'css') ? 'css' : '') + '-' + this.module;
        }

        this.print();

        if (util.isYUI()) {
            this.initialize();
        } else {
            this.check();
        }
    },
    print: function() {
        log.log('-------------------------------------------------------------------------');
        log.info('yogi found this git origin:   ' + this.origin);
        log.info('and this repo:                ' + this.github + '/' + this.repo);
        log.info('using this path:              ' + this.path);
        log.info('of type:                      ' + this.type);
        log.info('with this license:            ' + this.license);
        if (this.type === 'widget') {
            log.info('and skinnable');
        }
        log.log('-------------------------------------------------------------------------');
        if (this.yes) {
            log.warn('\nskipping questions, yogi will assume yes to all..\n');
        }
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
                    if (self._init) {
                        self.initialize();
                    }
                } else {
                    util.prompt('are you sure you wish to initialize it locally? [y/N] ', function(ans) {
                        if (ans.toLowerCase().indexOf('y') === 0) {
                            if (self._init) {
                                self.initialize();
                            }
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
        log.info('and this repo:                ' + this.github + '/' + this.repo);
        log.info('using this path:              ' + this.path);
        log.info('of type:                      ' + this.type);
        log.info('with this license:            ' + this.license);
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
            github: this.github,
            origin: this.origin
        }, function() {
        });
    },
    hold: function() {
        var self = this;
        log.info('yogi is requesting this module for you');
        api.post('/gallery/' + this.module, {
            repo: this.repo,
            path: this.path,
            type: this.type,
            license: this.license,
            github: this.github
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

