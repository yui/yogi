var fs = require('fs'),
    path = require('path'),
    log = require('./log'),
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
    find: find,
    findModule: function() {
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
                        mod = path.join(file, '../');
                    }
                });
            }
        });
        if (mod) {
            log.debug('found something here: ' + mod);
            mod = path.basename(mod).replace(path.sep, '');
            log.info('using module: ' + mod);
        }
        return mod;
    },
    prompt: function(str, cb, mask) {
        if (!rl) {
            rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

        }
        if (mask) {
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
    }
};

mods.mix(exports, mods);
