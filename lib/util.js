/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var fs = require('fs'),
    path = require('path'),
    osenv = require('osenv'),
    log = require('./log'),
    treeify = require('treeify'),
    walkdir = require('walkdir'),
    exists = fs.existsSync || path.existsSync,
    readline = require('readline'),
    editor = require('editor'),
    find = function(dir, file, cb) {
        var files, found,
            next = path.join(dir, '../');

        try {
            files = fs.readdirSync(dir);
        } catch (e) {
            files = [];
        }

        found = files.some(function(f) {
            if (f === file) {
                cb(null, path.join(dir, f));
                return true;
            }
        });

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
    getDSTOffset: function() {
        var start = new Date(),
            year = start.getFullYear(),
            jan = new Date(year, 0);   // January 1
            jul = new Date(year, 6);   // July 1

        // northern hemisphere test
        if (jan.getTimezoneOffset() > jul.getTimezoneOffset() && start.getTimezoneOffset() !== jan.getTimezoneOffset()) {
            return -1;
        }
        // southern hemisphere test
        if (jan.getTimezoneOffset() < jul.getTimezoneOffset() && start.getTimezoneOffset() !== jul.getTimezoneOffset()) {
            return -1;
        }
        // if we reach this point, DST is not in effect on the client computer.
        return 0;
    },
    getCDNWindow: function(callback) {
        var api = require('./api'),
            stamp = (new Date()),
            dow = stamp.getDay(),
            today = stamp.getDate(),
            nextWed;
        if (callback) {
            api.getNon('/cdn/window', function(err, json) {
                var stamp = new Date(json.stamp);
                stamp.setHours(stamp.getHours() + mods.getDSTOffset());
                callback('next cdn deployment window is ' + stamp.toLocaleString());
            });
        } else {
            if ((dow >= 3 && stamp.getUTCHours() >= 20) || dow >= 3) {
                nextWed = (today - dow + 10);
            } else {
                nextWed = (today - dow + 3);
            }
            stamp.setDate(nextWed);
            stamp.setUTCHours(21);
            stamp.setUTCMinutes(0);
            stamp.setUTCSeconds(0);

            stamp.setHours(stamp.getHours() + mods.getDSTOffset());

            return 'next cdn deployment window is ' + stamp.toLocaleString();
        }
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
    findModule: function(inc, fresh) {
        if (this.mod && !fresh) {
            return (inc) ? this.mod : this.mod.name;
        }
        var start = process.cwd(),
            mod, m, name;

        log.debug('finding module from ' + start);
        log.debug('looking for build.json file');
        mods.find(start, 'build.json', function(err, file) {
            if (file) {
                try {
                    var json = JSON.parse(fs.readFileSync(file, 'utf8'));
                    if (json) {
                        if (json.name) {
                            name = json.name;
                        }
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
                name: name || path.basename(mod).replace(path.sep, '').replace('/', '')
            };
            if (m.name.indexOf('src') === 0) { //Hack for build.xml in our src dir
                m = null;
            } else {
                log.debug('found something here: ' + m.dir);
                log.info('using module: ' + m.name);
            }
        }
        this.mod = m;
        return (inc) ? m : (m ? m.name : undefined);
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

mods.getTests = function(dir, coverage) {
    var files = fs.readdirSync(dir),
        hasCoverage = [],
        parts = [],
        tmp,
        tests = [];

    files.forEach(function(file) {
        if (path.extname(file) === '.html') {
            if (coverage) {
                if (file.indexOf('coverage') > -1) {
                    hasCoverage.push(file);
                } else {
                    parts.push(file);
                }
            } else {
                if (file.indexOf('coverage') === -1) {
                    tests.push(path.join(dir, file));
                }
            }
        }
    });
    if (coverage) {
        if (hasCoverage.length) {
            tmp = hasCoverage;
        } else {
            tmp = parts;
        }
        tmp.forEach(function(file) {
            tests.push(path.join(dir, file));
        });
    }
    return tests;
};

mods.tree = function(start, root, callback) {
    var finder = walkdir.find(start),
        tree = {};

    finder.on('path', function(file, stat) {
        var relativePath = path.relative(start, file),
            node = tree,
            parts = relativePath.split(path.sep);

        if (relativePath.indexOf('..') !== 0) {
            parts.forEach(function(part, key) {
                if (key < (parts.length - 1) || stat.isDirectory()) {
                    part += path.sep;
                }
                if (typeof node[part] !== 'object') {
                    node[part] = {};
                }
                node = node[part];
            });
        }
    });

    finder.on('end', function() {
        tree = mods.objectSort(tree);
        var str = treeify.asTree(tree, true),
            out = '';
            rel = path.relative(path.join(root, '../'), start),
            len = rel.split(path.sep)[0].length,
            pad = function(str) {
                for (var i = 0; i <= len; i++) {
                    str = ' ' + str;
                }
                str = str.replace('─', '──');
                return str;
            };

        str = str.split('\n');

        out += '   ' + rel + '\n';
        str.forEach(function(s) {
            out += '   ' + pad(s) + '\n';
        });
        callback(out);
    });
};

mods.objectSort = function(obj) {
    if (typeof obj === 'string') {
        return str;
    }
    var keys = Object.keys(obj).sort(),
        o = {};
    keys.forEach(function(i) {
        o[i] = mods.objectSort(obj[i]);
    });
    return o;
};

mods.selleck = function(base, tests) {

    var dirs = fs.readdirSync(base),
        examples = [],
        ignore = function(json) {
            if (json.name === 'test' || json.name.indexOf('-deprecated') > 0) {
                return true;
            }
            return false;
        },
        parseJSON = function(file) {
            var json = JSON.parse(fs.readFileSync(file, 'utf8')),
                windows = {}, name,
                b = path.join('docs/');

            if (ignore(json)) {
                return;
            }
            if (json && json.examples) {
                name = json.name;
                json.examples.forEach(function(c) {
                    if ('newWindow' in c) {
                        windows[c.name] = c.name;
                    } else {
                        examples.push(path.join(b, name + '/' + c.name + '.html'));
                    }
                });
            }
            if (json && json.pages) {
                Object.keys(json.pages).forEach(function(page) {
                    var p = json.pages[page];
                    if (p && p.name && windows[p.name]) {
                        examples.push(path.join(b, name + '/' + page + '.html'));
                    }
                });
            }
        },
        walk = function(dir) {
            if (!exists(dir)) {
                return;
            }
            var dirs = fs.readdirSync(dir);
            dirs.forEach(function(d) {
                var p = path.join(dir, d),
                    stat = fs.statSync(p);

                if (stat.isDirectory()) {
                    walk(p);
                }
                if (d === 'component.json') {
                    parseJSON(p);
                }
            });
        };


    dirs.forEach(function(dir) {
        var docs = path.join(base, dir),
            stat = fs.statSync(docs);

        if (stat.isDirectory()) {
            walk(docs);
        }
    });

    examples.sort();

    return tests.concat(examples);
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

mods.good = log.good;
mods.bad = log.bad;
mods.progress = log.progress;

mods.mix(exports, mods);
