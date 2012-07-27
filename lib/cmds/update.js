var util = require('../util');
var log = require('../log');
var git = require('../git');
var api = require('../api');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp'); 
var ncp = require('ncp').ncp;
var config = require('../config');

var exists = fs.existsSync || path.existsSync;

var mods = {
    gallery: true,
    init: function(options) {

        if (util.isYUI()) {
            log.bail('command is not valid in yui repo');
        }

        if (!config.get('devel')) {
            log.bail('do not use this command yet, I\'m serious, things will really break for you!');
        }

        var self = this;
        var root = git.findRoot(process.cwd());
        var origin = git.getOrigin();
        var module = util.findModule(true);
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
            
            var jsonFile = path.join(module.dir, 'package.json');
            if (exists(jsonFile)) {
                log.bail('package.json file already exists, can not update an updated module');
            }
            module.git =  root;
            self.options = module;
            log.debug('module root is ' + module.dir);
            log.debug('fetching package.json for ' + module.name);
            api.get('/gallery/' + module.name + '/package.json', function(err, data) {
                if (err) {
                    log.bail('nothing known about ' + module);
                }
                module.json = data;
                data = self.parseProperties(data);
                log.debug('writing package.json file');
                fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
                self.clean();
            });
        });
    },
    parseProperties: function(data) {
        var self = this;

        //TODO add build.properties parsing here for jsfiles, cssfiles, etc..
        var props = path.join(self.options.dir, 'build.properties');
        if (exists(props)) {
            log.debug('Parsing build.properties file');
            var str = fs.readFileSync(props, 'utf8').split('\n');
            str.forEach(function(line) {
                if (line.trim().indexOf('component.jsfiles=') === 0) {
                    var files = line.trim().replace('component.jsfiles=', '');
                    if (!data.yui.files) {
                        data.yui.files = {};
                    }
                    data.yui.files.js = files.replace(' ', '').split(',');
                }
                if (line.trim().indexOf('component.cssfiles=') === 0) {
                    var files = line.trim().replace('component.cssfiles=', '');
                    if (!data.yui.files) {
                        data.yui.files = {};
                    }
                    data.yui.files.css = files.replace(' ', '').split(',');
                }
            });
        }
        return data;
    },
    clean: function() {
        var self = this;
        log.debug('cleaning out old files and creating new directory structure');
        
        var files = fs.readdirSync(this.options.dir);
        var toDelete = [];
        files.forEach(function(f) {
            var ext = path.extname(f);
            if (ext === '.xml' || ext === '.properties') {
                toDelete.push(path.join(self.options.dir, f));
            }
            if (f === 'build_tmp') {
                toDelete.push(path.join(self.options.dir, f));
            }
        });

        if (toDelete.length) {
            log.log('about to delete the following files:');
            log.log(toDelete.join('\n'));
            
            util.prompt('is this ok? [Y/n]', function(ans) {
                ans = ans.toLowerCase() || 'y';
                if (ans !== 'y') {
                    log.bail('bailing');
                }
                self.delete(toDelete, function() {
                    log.debug('files deleted from source');
                    self.create();
                    self.meta();
                });
            });
        } else {
            self.create();
            self.meta();
        }
        
    },
    meta: function() {
        log.info('writing loader meta data file');
        var meta = path.join(this.options.dir, 'meta', this.options.name + '.json');
        if (!exists(meta)) {
            log.debug('meta file does not exist, create it');
            var json = this.options.json.yui.module;
            var mod = {};

            mod[this.options.name] = {
                requires: json.requires,
                supersedes: json.supersedes,
                optional: json.optional,
                skinnable: json.skinnable
            };
            fs.writeFileSync(meta, JSON.stringify(mod, null, 4), 'utf8');
        } else {
            log.warn('loader meta file was already there, not replacing it');
        }

    },
    _defaultDirs: [
        './docs/',
        './tests/',
        './js',
        './meta',
        './css'
    ],
    create: function() {
        log.info('creating default directory structure');
        var stack = new util.Stack();
        var noop = function() {};
        var self = this;
        var copied = [];
        self._defaultDirs.forEach(function(dir) {
            var d = path.join(__dirname, '../../defaults/', dir);
            var toDir = path.join(self.options.dir, dir);
            if (exists(toDir)) {
                log.info('did not create default directory, it exists: ' + toDir);
                return;
            }
            if (exists(d)) {
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
        });
    },
    replaceTitle: function(items) {
        var title = this.options.name;
        var name = title.replace('gallery-', '').replace('gallerycss-', '');
        var desc = this.options.json.description;
        var summary = desc;
        var tags = JSON.stringify(this.options.json.keywords);
        var author = this.options.json.author;
        var code = '';
        log.debug('attempting to fetch module example code');
        api.get('/gallery/' + title, function(err, data) {
            if (data && data.code) {
                code = data.code;
                desc = data.description;
            }
            items.forEach(function(file) {
                var stat = fs.statSync(file);
                if (!stat.isDirectory()) {
                    log.debug('updating title in ' + file);
                    var str = fs.readFileSync(file, 'utf8');
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
    delete: function(files, cb) {
        var stack = new util.Stack();
        var noop = function() {};
        files.forEach(function(file) {
            log.debug('preparing to delete ' + file);
            rimraf(file, stack.add(noop));
        });

        stack.done(function() {
            cb();
        });
    },
    help: function() {
        return [
            'update',
            'convert this module into a yogi module'
        ]
    }
};

util.mix(exports, mods);
