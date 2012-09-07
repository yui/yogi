/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var fs = require('fs'),
    path = require('path'),
    osenv = require('osenv'),
    log = require('./log'),
    exists = fs.existsSync || path.existsSync,
    readline = require('readline'),
    editor = require('editor'),
    find = function(dir, file, cb) {
        var files = fs.readdirSync(dir),
        found = files.some(function(f) {
            if (f === file) {
                cb(null, path.join(dir, f));
                return true;
            }
        }),
        next = path.join(dir, '../');

        if (!found) {
            if (dir === next) {
                cb(true);
                return;
            }
            find(next, file, cb);
        }
    },
    rl,
mods = {
    dedupe: function(arr) {
        var o = {};
        arr = arr || [];
        arr.forEach(function(m) {
            o[m] = 1;
        });

        return Object.keys(o).sort();
    },
    mix: function(r, s) {
        Object.keys(s).forEach(function(key) {
            r[key] = s[key];
        });
    },
    hasGithub: function() {
        var config = require('./config');
        return (config.get('gh_user') && config.get('gh_token'));
    },
    isYUI: function() {
        var yui = false;
        find(process.cwd(), 'package.json', function(err, file) {
            if (file) {
                var json = JSON.parse(fs.readFileSync(file, 'utf8'));
                if (json && json.name === 'yui') {
                    yui = true;
                }
            }
        });
        return yui;
    },
    mod: null,
    exists: exists,
    find: find,
    getPackage: function(skip) {
        var mod = this.findModule(true),
            pack = mod ? path.join(mod.dir, 'package.json') : '';

        if (!exists(pack)) {
            if (!skip) {
                log.bail('unable to locate package.json for this module');
            }
        }
        return skip ? false : JSON.parse(fs.readFileSync(pack, 'utf8'));
    },
    findModule: function(inc) {
        if (this.mod) {
            return (inc) ? this.mod : this.mod.name;
        }
        var start = process.cwd(),
            mod, m;

        log.debug('finding module from ' + start);
        log.debug('looking for build.json file');
        mods.find(start, 'build.json', function(err, file) {
            if (file) {
                try {
                    var json = JSON.parse(fs.readFileSync(file, 'utf8'));
                    if (json) {
                        mod = path.join(file, '../');
                    }
                } catch (e) {
                    log.log(e);
                    log.bail('found a build.json file, but was unable to parse it');
                }
            } else {
                log.debug('looking for build.xml file');
                mods.find(start, 'build.xml', function(err, file) {
                    if (file) {
                        mod = path.join(file, '../');
                    }
                });
            }
        });
        if (mod) {
            m = {
                dir: mod,
                name: path.basename(mod).replace(path.sep, '').replace('/', '')
            };
            if (m.name.indexOf('src') === 0) { //Hack for build.xml in our src dir
                m = null;
            } else {
                log.debug('found something here: ' + m.dir);
                log.info('using module: ' + m.name);
            }
        }
        this.mod = m;
        return (inc) ? m : m.name;
    },
    touch: function(file) {
        log.debug('touching file: ' + file);   
        var date = new Date();
        if (exists(file)) {
            fs.utimesSync(file, date, date);
        } else {
            fs.writeFileSync(file, '', 'utf8');
        }
    },
    prompt: function(str, cb, mask) {
        if (!rl) {
            rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

        }
        if (mask) {
            process.stdout.write(str);
            rl.output = {
                write: function() {}
            };
            process.stdin.on('keypress', function(c, key) {
                if (key && key.name === 'enter') {
                    process.stdout.pause();
                } else {
                    process.stdout.write('*');
                }
            });
        } else {
            rl.output = process.stdout;
        }
        rl.question(str, function(answer) {
            rl.pause();
            if (mask) {
                process.stdout.write('\n');
            }
            cb(answer);
        });
    },
    createTmp: function(file, cb) {
        var fileName = path.basename(file),
            stamp = (new Date()).getTime(),
            tmpFile = path.join(osenv.tmpdir(), fileName + '.yogi-tmp-' + stamp),
            newFile = fs.createWriteStream(tmpFile),
            oldFile = fs.createReadStream(file);
        
        oldFile.pipe(newFile);

        oldFile.on('close', function() {
            cb(tmpFile);
        });


    },
    longPrompt: function(file, cb) {
        var self = this;
        self.createTmp(file, function(fileName) {
            log.info('opening ' + fileName + ' for editing.');
            editor(fileName, function(code) {
                log.debug('editor exited with code ' + code);
                var data = fs.readFileSync(fileName, 'utf8'),
                    str = [];
                data = data.split('\n');
                data.forEach(function(line) {
                    if (line.indexOf('#') === -1) {
                        str.push(line);
                    }
                });
                cb(str.join('\n'));
            });
        });
    }
};

var Stack = function () {
    this.errors   = [];
    this.finished = 0;
    this.results  = [];
    this.total    = 0;
};

Stack.prototype = {
    add: function (fn) {
        var self  = this,
            index = self.total;

        self.total += 1;

        return function (err) {
            if (err) { self.errors[index] = err; }

            self.finished += 1;
            self.results[index] = fn.apply(null, arguments);
            self.test();
        };
    },

    test: function () {
        if (this.finished >= this.total && this.callback) {
            this.callback.call(null, this.errors.length ? this.errors : null,
                    this.results, this.data);
        }
    },

    done: function (callback, data) {
        this.callback = callback;
        this.data     = data;
        this.test();
    }
};

mods.Stack = Stack;

mods.mix(exports, mods);
