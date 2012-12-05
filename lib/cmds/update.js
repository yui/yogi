/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

var util = require('../util'),
    log = require('../log'),
    git = require('../git'),
    api = require('../api'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('win-spawn'),
    mkdirp = require('mkdirp'),
    cpr = require('cpr').cpr,
    wiky = require('wiky.js'),
mods = {
    gallery: true,
    init: function() {

        if (util.isYUI()) {
            log.bail('command is not valid in yui repo');
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
            shifter = path.join(this.options.dir, 'build.json'),
            mod, self = this;
        if (util.exists(shifter)) {
            shifter = JSON.parse(fs.readFileSync(shifter, 'utf8'));
        }
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
                if (shifter.builds[self.options.name] && shifter.builds[self.options.name].config) {
                    mod[self.options.name] = shifter.builds[self.options.name].config;
                }
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
                mkdirp(toDir, stack.add(function() {
                    cpr(d, toDir, stack.add(function(err, status) {
                        copied = [].concat(copied, status);
                    }));
                }));
            } else {
                log.debug('making ' + toDir);
                mkdirp(toDir, stack.add(function() {
                    util.touch(path.join(toDir, '.keep'));
                }));
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
                desc = data.description.replace(/\r/g, '\n');
                summary = data.summary.replace(/\r/g, '\n');
            }
            desc = wiky.process(desc, { 'link-image': false });
            desc = desc.replace(/\{\{\{/g, '```');
            desc = desc.replace(/\}\}\}/g, '```');
            desc = desc.replace(/<br\/>/g, '<br>');
            desc = desc.replace(/\n\n/g, '\n');
            summary = summary.replace(/\n\n/g, '\n');
            items.forEach(function(file) {
                var stat = fs.statSync(file), str, s = summary;
                if (!stat.isDirectory()) {
                    if (path.extname(file) === '.json') {
                        s = s.replace(/\n/g, '\\\\n');
                    }
                    log.debug('updating title in ' + file);
                    str = fs.readFileSync(file, 'utf8');
                    str = str.replace(/\{\{title\}\}/gi, title);
                    str = str.replace(/\{\{name\}\}/gi, name);
                    str = str.replace(/\{\{summary\}\}/gi, s);
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
