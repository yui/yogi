/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    path = require('path'),
    fs = require('fs'),
    log = require('../log'),
    timethat = require('timethat'),
    MD5_TOKEN = '{ /* MD5 */ }',
    TEMPLATE_TOKEN = '{ /* METAGEN */ }',
    crypto = require('crypto'),
    md5 = function(str) {
        var md5sum = crypto.createHash('md5');
        md5sum.update(str);
        return md5sum.digest('hex');
    },
mods = {
    init: function(options) {
        var self = this,
            cmd = process.argv.slice(1),
            exe = path.basename(cmd.shift());
        this.options = options;

        this.modules = this.options.parsed.m;
        
        this.name = this.options.parsed.name;

        this.yes = this.options.parsed.yes;

        this.expand = this.options.parsed.expand;

        this.start = this.options.parsed.start || process.cwd();

        process.chdir(this.start);

        this.mix = this.options.parsed.mix || false;

        this.strict = this.options.parsed.strict || false;

        this.json = this.options.parsed.json || path.join(this.start, 'loader/js/yui3.json');

        this.js = this.options.parsed.js || path.join(this.start, 'loader/js/yui3.js');
        
        this.tests = this.options.parsed.tests || path.join(this.start, 'yui/js/load-tests.js');

        this.baseCMD = exe + ' ' + cmd.join(' ');

        log.info('generating loader meta-data for: ' + this.start);
        log.info('storing module here: ' + this.js);
        log.info('and json here: ' + this.json);

        if (this.modules) {
            log.info('building custom meta-data for: ' + this.modules.join(', '));
        }

        if ((this.start === process.cwd()) && !this.yes) {
            util.prompt('are you sure you want to use the default settings? [Y/n] ', function(answer) {
                if (answer === '') {
                    answer = 'y';
                }
                if (answer.toLowerCase().indexOf('y') !== 0) {
                    log.bail('bailing');
                }
                self.begin();
            });
        } else {
            this.begin();
        }
    },
    data:{
        json: {},
        conds: {},
        files: null
    },
    parseData: function(name, data, file) {
        var i, o;
        for (i in data) {
            if (i === 'submodules' || i === 'plugins') {
                for (o in data[i]) {
                    this.parseData(o, data[i][o], file);
                }
                delete data[i];
            }
            if (i === 'condition') {
                if (data[i].test && data[i].test.indexOf('.js') > 0) {
                    this.data.conds[name] = path.join(path.dirname(file), data[i].test);
                }
                data[i].name = name;
                data[i] = this.sortObject(data[i]);
            }
        }
        this.data.json[name] = this.sortObject(data);
    },
    sortObject: function(data) {
        var keys = Object.keys(data).sort(),
            d = {};
        keys.forEach(function(k) {
            d[k] = data[k];
        });
        return d;
    },
    scan: function() {
        var self = this,
            dirs = fs.readdirSync(this.start),
            metaFiles = [];

        dirs.forEach(function(d) {
            if (self.strict) {
                if (!util.exists(path.join(self.base, d, 'build.json'))) {
                    return; //No build.json file, exclude this automatically
                }
            }
            var p = path.join(self.base, d, 'meta'),
                files;
            if (util.exists(p)) {
                files = fs.readdirSync(p);
                files.forEach(function(f) {
                    if (path.extname(f) === '.json') {
                        metaFiles.push(path.join(p, f));
                    }
                });
            }
        });

        if (!metaFiles.length) {
            log.bail('Something went very wrong here, could not find meta data to parse.');
        }

        log.info('found ' + metaFiles.length + ' .json files to parse. parsing now..');

        this.data.files = metaFiles;

    },
    reduce: function() {
        if (!this.modules) {
            return;
        }
        log.info('reducing meta-data from ' + Object.keys(this.data.json).length);
        var YUI = require('yuidocjs/node_modules/yui').YUI,
            Y = YUI(),
            self = this,
            loader, out, mods = {};

        Y.UA.nodejs = false;
        loader = new Y.Loader({
            ignoreRegistered: true,
            require: this.modules
        });
        out = loader.resolve(true);
        
        ['jsMods', 'cssMods'].forEach(function(key) {
            out[key].forEach(function(item) {
                mods[item.name] = item;
            });
        });

        Object.keys(this.data.json).forEach(function(mod) {
            if (mods[mod]) {
                if (self.expand) {
                    self.data.json[mod] = mods[mod];
                }
            } else {
                delete self.data.json[mod];
            }
        });

        log.info('meta-data reduced to ' + Object.keys(this.data.json).length);

        //console.log(mods);
        //console.log(this.data.json);
        //process.exit();
    },
    process: function() {
        var self = this;
        this.data.files.forEach(function(file) {
            var data = fs.readFileSync(file, 'utf8'), i;

            try {
                data = JSON.parse(data);
            } catch (e) {
                log.error('Failed to parse: ' + file);
                console.error(e);
                process.exit(1);
            }
            for (i in data) {
                self.parseData(i, data[i], file);
            }
        });

    },
    writeJSON: function() {
        var out = this.sortObject(this.data.json),
            jsonStr;

        log.info('writing json: ' + this.json);

        jsonStr = JSON.stringify(out, null, 4);

        fs.writeFileSync(this.json, jsonStr, 'utf8');

        log.info('done processing json');

        this.data.md5 = md5(jsonStr);
        log.info('using md5: ' + this.data.md5);

        this.data.json = out;

    },
    conditionals: function() {
        log.info('processing conditionals');

        var tests = [],
            allTests = [],
            jsonStr,
            self = this;

        Object.keys(this.data.json).forEach(function(name) {
            var mod = self.data.json[name],
                file, cond, cName, test;
            if (mod.condition) {
                cond = self.sortObject(mod.condition);
                if (self.data.conds[mod.condition.name]) {
                    cName = mod.condition.name;
                    file = self.data.conds[cName];
                    if (util.exists(file)) {
                        test = fs.readFileSync(file, 'utf8');
                        mod.condition.test = md5(file);
                        cond.test = test;
                        tests.push({ key: md5(file), test: test });
                    } else {
                        log.bail('Failed to locate test file: ' + file);
                    }
                }
                allTests.push(cond);
            }
        });

        jsonStr = JSON.stringify(this.data.json, null, 4);

        tests.forEach(function(info) {
            jsonStr = jsonStr.replace('"' + info.key + '"', info.test);
        });

        jsonStr = jsonStr.replace(/\}\n,/g, '},').replace(/\}\n\n,/g, '},');

        this.data.jsonStr = jsonStr;
        this.data.tests = allTests;

    },
    writeJS: function() {
        var header = this.header().replace(MD5_TOKEN, this.data.md5),
            jsStr = header.replace(TEMPLATE_TOKEN, this.data.jsonStr);

        log.info('writing js file: ' + this.js);
        fs.writeFileSync(this.js, jsStr, 'utf8');
        log.info('done writing js file');
    },
    writeConds: function() {
        this.data.tests.sort(function(a, b) {
            var nameA = a.name.toLowerCase(),
                nameB = b.name.toLowerCase();

            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }
            return 0;
        });

        var header = this.loadTests(),
            tests = [];

        this.data.tests.forEach(function(cond, key) {
            var test = cond.test, o;
            if (test) {
                cond.test = '~~COND~~';
            }
            o = JSON.stringify(cond, null, 4);
            if (test) {
                o = o.replace('"~~COND~~"', test);
            }
            tests.push("// " + cond.name);
            tests.push("add('load', '" + key + "', " + o + ");");
        });

        header += tests.join('\n');
        header= header.replace(/\}\n,/g, '},');
        header= header.replace(/\}\n\n,/g, '},');


        log.info('writing load tests file: ' + this.tests);

        fs.writeFileSync(this.tests, header, 'utf8');

    },
    begin: function() {
        var start = new Date();
        this.scan();
        this.process();
        this.reduce();
        this.writeJSON();
        this.conditionals();
        this.writeJS();
        this.writeConds();

        log.info('done generating meta data in ' + timethat.calc(start, new Date()));

    },
    loadTests: function() {
        var str = [
            '/* This file is auto-generated by (' + this.baseCMD + ') */',
            'var add = Y.Features.add;',
            ''
        ];
        return str.join('\n');
    },
    header: function() {
        var str = [
            '/* This file is auto-generated by (' + this.baseCMD + ') */',
            '',
            '/**',
            ' * YUI 3 module metadata',
            ' * @module loader',
            ' * @submodule loader-yui3',
            ' */'
        ];

        if (this.mix) {
            log.info('using mix to assign meta-data');
            str.push('YUI.Env[Y.version].modules = YUI.Env[Y.version].modules || {};');
            str.push('Y.mix(YUI.Env[Y.version].modules, { /* METAGEN */ });');
        } else {
            str.push('YUI.Env[Y.version].modules = YUI.Env[Y.version].modules || { /* METAGEN */ };');
        }

        str.push("YUI.Env[Y.version].md5 = '{ /* MD5 */ }';");
        str.push('');

        if (this.name) {
            str.unshift('YUI.add("' + this.name + '", function(Y, NAME) {');
            str.push('});');
        }

        return str.join('\n');
    },
    help: function() {
        return [
            'loader',
            'generate loader meta data',
            '--yes auto answer yes to all questions (default: false)',
            '--start <path> where to start scanning (default CWD)',
            '--json <path> where to write the JSON data (default CWD/loader/js/yui3.json)',
            '--js <path> where to write the JS data (default CWD/loader/js/yui3.js)',
            '--tests <path> where to write the Conditional Test data (default CWD/yui/js/load-tests.js)',
            '--mix  use mix to mix the module meta-data into an existing object (for gallery builds)',
            '--strict only parse meta files that also have a build.json (default: false, true for gallery)',
            '--expand Use Loader to pre-expand module meta data',
            '--name Wrap the YUI.add wrapper and name the module'
        ];
    }
};

util.mix(exports, mods);
