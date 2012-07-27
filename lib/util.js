var fs = require('fs'),
    path = require('path'),
    log = require('./log'),
    exists = fs.existsSync || path.existsSync,
    readline = require('readline'),
    find = function(dir, file, cb) {
        if (dir === '/') {
            cb(true);
            return false;
        }
        var files = fs.readdirSync(dir);
        var found = files.some(function(f) {
            if (f === file) {
                cb(null, path.join(dir, f));
                return true;
            }
        });
        if (!found) {
            find(path.join(dir, '../'), file, cb);
        }
    };

var rl;

var mods = {
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
    getBuilder: function() {
        var mod = this.findModule(true);
        var builder = path.join(mod.dir, '../../../builder');
        if (!exists(builder)) {
            log.bail('failed to location yui builder');
        }
        return builder;
    },
    getPackage: function(skip) {
        var mod = this.findModule(true);
        var pack = path.join(mod.dir, 'package.json');
        if (!exists(pack)) {
            if (skip) {
                return false;
            } else {
                log.bail('unable to locate package.json for this module');
            }
        }
        return JSON.parse(fs.readFileSync(pack, 'utf8'));
    },
    findModule: function(inc) {
        if (this.mod) {
            return (inc) ? this.mod : this.mod.name;
        }
        var start = process.cwd();
        log.debug('finding module from ' + start);
        var mod;
        log.debug('looking for build.xml file');
        mods.find(start, 'build.xml', function(err, file) {
            if (file) {
                mod = path.join(file, '../');
            } else {
                log.debug('looking for package.json file');
                mods.find(start, 'package.json', function(err, file) {
                    if (file) {
                        try {
                            var json = JSON.parse(fs.readFileSync(file, 'utf8'));
                            if (json && json.yui) {
                                mod = path.join(file, '../');
                            }
                        } catch (e) {
                            log.log(e);
                            log.bail('found a package.json file, but was unable to parse it');
                        }
                    }
                });
            }
        });
        var m;
        if (mod) {
            m = {
                dir: mod,
                name: path.basename(mod).replace(path.sep, '')
            };
            log.debug('found something here: ' + m.dir);
            log.info('using module: ' + m.name);
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
    longPrompt: function(str, cb) {
        if (!rl) {
            rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

        }
        var answer = [];
        process.stdout.write(str);
        rl.on('line', function(line) {
            answer.push(line);
        });
        rl.on('SIGINT', function() {
            rl.question('Are you sure? [y/n] ', function(ans) {
                if (ans.match(/^y(es)?$/i)) {
                    rl.pause();
                    cb(answer.join('\n'));
                }
            });
        });

        rl.resume();
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
