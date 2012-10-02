/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/


/*
TODO

This needs to be migrated from package.json to module.json.
Too many package.json files in the repo and things will go to hell in a handbag.

Maybe even hijack component.json from Selleck and use it instead?
*/
var util = require('../util'),
    log = require('../log'),
    git = require('../git'),
    api = require('../api'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    mkdirp = require('mkdirp'),
    ncp = require('ncp').ncp,
    config = require('../config'),
mods = {
    gallery: true,
    init: function() {

        if (util.isYUI()) {
            log.bail('command is not valid in yui repo');
        }

        if (!config.get('devel')) {
            log.bail('do not use this command yet, I\'m serious, things will really break for you!');
        }

        var self = this,
            root = git.findRoot(process.cwd()),
            module = util.findModule(true);

        if (!module) {
            log.bail('could not locate the module you are attemping to update, are you in the modules source directory?');
        }
        log.info('attempting to update ' + module.name);
        util.prompt('are you sure you wish to update this module? [Y/n] ', function(ans) {
            ans = ans.toLowerCase() || 'y';
            if (ans !== 'y') {
                log.bail('bailing');
            }
            log.info('updating..');
            
            var jsonFile = path.join(module.dir, 'build.json');
            if (util.exists(jsonFile)) {
                log.bail('build.json file already exists, can not update an updated module');
            }
            module.git =  root;
            self.options = module;
            log.debug('module root is ' + module.dir);
            self.shifter();
        });
    },
    shifter: function() {
        log.info('converting module with shifter');
        var base = this.options.dir,
            self = this,
            shifter = path.join(__dirname, '../../node_modules/.bin/shifter'),
            child = spawn(shifter, [], {
                cwd: base
            });

        child.stdout.on('data', function(data) {
            process.stdout.write(data);
        });
        child.stderr.on('data', function(data) {
            process.stderr.write(data);
        });
        child.on('exit', function(code) {
            log.info('shifter exited with exit code: ' + code);
            self.create(function() {
                self.meta();
            });
        });
    },
    meta: function() {
        log.info('writing loader meta data file');
        var meta = path.join(this.options.dir, 'meta', this.options.name + '.json'),
            mod, self = this;
        if (!util.exists(meta)) {
            log.debug('meta file does not exist, create it');
            log.info('fetching package.json');
            api.get('/gallery/' + this.options.name + '/package.json', function(err, json) {
                mod = {};

                mod[self.options.name] = {
                    requires: json.yui.module.requires,
                    supersedes: json.yui.module.supersedes,
                    optional: json.yui.module.optional,
                    skinnable: json.yui.module.skinnable
                };
                fs.writeFileSync(meta, JSON.stringify(mod, null, 4), 'utf8');
            });
        } else {
            log.warn('loader meta file was already there, not replacing it');
        }

    },
    _defaultDirs: [
        './docs/',
        './tests/',
        './js',
        './meta',
        './css',
        './assets'
    ],
    create: function(callback) {
        log.info('creating default directory structure');
        var stack = new util.Stack(),
            self = this,
            copied = [];

        self._defaultDirs.forEach(function(dir) {
            var d = path.join(__dirname, '../../defaults/', dir),
                toDir = path.join(self.options.dir, dir);

            if (util.exists(toDir)) {
                log.info('did not create default directory, it exists: ' + toDir);
                return;
            }
            if (util.exists(d)) {
                log.debug('copying dir from ' + d);
                log.debug('to ' + toDir);
                ncp(d, toDir, {
                    filter: function(file) {
                        file = file.replace(d, toDir);
                        copied.push(file);
                        return true;
                    }
                }, stack.add(function() {
                }));
            } else {
                log.debug('making ' + toDir);
                mkdirp.sync(toDir);
                util.touch(path.join(toDir, '.keep'));
            }
        });

        stack.done(function() {
            self.replaceTitle(copied);
            log.info('directories created');
            callback();
        });
    },
    replaceTitle: function(items) {
        var title = this.options.name,
            name = title.replace('gallery-', '').replace('gallerycss-', ''),
            code = '', tags, author, desc, summary;

        log.debug('attempting to fetch module example code');
        api.get('/gallery/' + title, function(err, data) {
            if (data && data.code) {
                tags = '[ "gallery" ]';
                author = data.username;
                code = data.code;
                desc = data.description;
                summary = data.summary;
            }
            items.forEach(function(file) {
                var stat = fs.statSync(file), str;
                if (!stat.isDirectory()) {
                    log.debug('updating title in ' + file);
                    str = fs.readFileSync(file, 'utf8');
                    str = str.replace(/\{\{title\}\}/gi, title);
                    str = str.replace(/\{\{name\}\}/gi, name);
                    str = str.replace(/\{\{summary\}\}/gi, summary);
                    str = str.replace(/\{\{description\}\}/gi, desc);
                    str = str.replace(/\{\{tags\}\}/gi, tags);
                    str = str.replace(/\{\{author\}\}/gi, author);
                    str = str.replace(/\{\{code\}\}/gi, code);
                    fs.writeFileSync(file, str, 'utf8');
                }
            });
        });

    },
    help: function() {
        return [
            'update',
            'convert this module into a yogi module'
        ];
    }
};

util.mix(exports, mods);
