/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var log = require('../log'),
    util = require('../util'),
    git = require('../git'),
    path = require('path'),
    portfinder = require('portfinder'),
    fs = require('fs'),
    server = require('./serve'),
    findit = require('findit'),
    fork = require('child_process').fork,
    spawn = require('win-spawn'), //comma
mods = {
    init: function(options) {
        var b, module,
           self = this;

        if (options.parsed.argv.remain.length) {
            this.modules = options.parsed.argv.remain;
        }

        this.options = options;
        portfinder.basePort = 5000;

        if (options.parsed.port) {
            portfinder.basePort = options.parsed.port;
        }

        this.useYeti = options.parsed.yeti;
        this.yetiHub = options.parsed.hub || 'http://hub.davglass.com:8080/';
        this.yetiAgents = options.parsed.agents;

        this.useYetiGrid = options.parsed.grid;

        if (options.parsed['wd-host']) {
            this.useYetiGrid = true;
            this['wd-host'] = options.parsed['wd-host'];
        }
        if (this.useYetiGrid) {
            if (!this['wd-host']) {
                this['wd-host'] = 'grid.davglass.com';
            }
            if (!this['wd-port']) {
                this['wd-port'] = '4444';
            }
            if (!this.options.parsed.b || !this.options.parsed.b.length) {
                this.options.parsed.b = [];
            }
            if (!this.options.parsed.chrome && !this.options.parsed.phantom) {
                this.options.parsed.chrome = 5;
                this.options.parsed.phantom = 15;
            }
            if (this.options.parsed.chrome) {
                for (b = 0; b < this.options.parsed.chrome; b++) {
                    this.options.parsed.b.push('chrome');
                }
            }
            if (this.options.parsed.phantom) {
                for (b = 0; b < this.options.parsed.phantom; b++) {
                    this.options.parsed.b.push('phantomjs');
                }
            }
            if (this.options.parsed.firefox) {
                for (b = 0; b < this.options.parsed.firefox; b++) {
                    this.options.parsed.b.push('firefox');
                }
            }
        }
        
        this.filter = options.parsed.filter;

        if (this.filter === 'coverage') {
            this.coverage = true;
        }

        module = util.findModule(true);

        if (module && this.modules && this.modules.length) {
            this.modules.unshift(module.name);
            this.modules = util.dedupe(this.modules);
            module = null;
        }
        if (!module) {
            log.debug('not a module, is it yui?');
            if (util.isYUI()) {
                module = {
                    name: 'yui3',
                    dir: path.join(git.findRoot(), '../src')
                };
                this.module = module;
                this.afterInit();
            } else {
                this.scan(function(mods) {
                    if (mods.length) {
                        self.modules = mods;
                        self.afterInit();
                    } else {
                        log.bail('not in a module directory');
                    }
                });
            }
        } else {
            this.module = module;
            this.afterInit();
        }
    },
    afterInit: function() {
        var self = this;
        if ((this.useYetiGrid || this.yetiHub) && this.useYeti) {
            if (this.yetiAgents) {
                this.agents();
            } else {
                this.yeti();
            }
        } else {
            this.prepServer(function(port) {
                if (self.options.parsed.cli) {
                    self.cli(port, function() {
                        self.stopServer();
                        self.done();
                    });
                } else {
                    if (self.options.parsed.cli === false) {
                        self.grover();
                    } else {
                        self.cli(port, function() {
                            self.grover();
                        });
                    }
                }
            });
        }
    },
    scan: function(callback) {
        log.debug('scanning for gallery modules..');
        var finder = findit.find(process.cwd()),
            mods = [],
            self = this;

        finder.on('path', function(file, stat) {
            if (stat.isFile()) {
                var name = path.basename(file);
                if (name === 'build.json') {
                    mods.push(path.basename(path.dirname(file)));
                }
            }
        });

        finder.on('end', function() {
            if (mods.length) {
                self.module = {
                    name: 'gallery',
                    dir: process.cwd()
                };
            }
            callback(mods);
        });
    },
    done: function() {
        if (this.options.callback) {
            this.options.callback();
        } else {
            process.exit();
        }
    },
    buildYUI: function(callback) {
        log.info('installing yui to create npm package');
        var yuibase = path.join(git.findRoot(), '../src/yui'),
            shifter = path.join(__dirname, '../../node_modules/.bin/shifter'),
            child,
            self = this;
        
        child = spawn(shifter, [
            '--config',
            'build-npm.json'
        ], {
            cwd: yuibase
        });

        child.stdout.on('data', function(data) {
            console.log(data.toString().trim());
        });

        child.on('exit', function() {
            log.info('yui install complete, continuing..');
            self.installNPM(callback);
        });
    },
    removeLocalYUITest: function(callback) {
        log.warn('removing localYUITest install');
        var npmbase = path.join(git.findRoot(), '../build-npm'),
            child,
            self = this;

        if (!util.exists(npmbase)) {
            log.error('yui needs to be built first!');
            return self.buildYUI(callback);
        }
        
        child = spawn('npm', [
            'remove',
            'yuitest',
            '-loglevel',
            'silent'
        ], {
            cwd: npmbase
        });

        child.stdout.on('data', function(data) {
            console.log(data.toString().trim());
        });

        child.on('exit', function() {
            log.info('npm removal complete, continuing..');
            self.cli(callback);
        });

    },
    cli: function(port, callback) {
        log.debug('checking for cli based tests');
        var gbase = path.join(git.findRoot(), '../'),
            yuitestBin = path.join(__dirname, '../../node_modules/.bin/yuitest'),
            base, batch,
            self = this, yuitest,
            tests = [], files = [],
            mods = {}, exclude = {},
            testBase = path.join(this.module.dir, 'tests', 'cli'),
            env = process.env;

        if (this.options.parsed.x) {
            this.options.parsed.x.forEach(function(m) {
                exclude[m] = true;
            });
        }
        env.NODE_PATH = path.join(__dirname, '../../node_modules');
        env.TEST_PORT = port;
        
        if (util.exists(path.join(gbase, 'node_modules/.bin/yuitest'))) {
            log.info(path.join(gbase, 'node_modules/.bin/yuitest'));
            this.stopServer();
            log.bail('Found a local install of YUITest, remove it please..');
            //return this.removeLocalYUITest(callback);
        }

        if (!util.exists(yuitestBin)) {
            this.stopServer();
            log.bail('local yogi yuitest can not be found, you may need to reinstall yogi..');
        }
        
        if (util.isYUI() && (this.module.name === 'yui3' || this.modules)) {
            base = path.join(git.findRoot(), '../src');
            batch = fs.readdirSync(base);
            batch.forEach(function(mod) {
                if (exclude[mod]) {
                    return;
                }
                var testBase = path.join(base, mod, 'tests/cli');
                if (util.exists(testBase)) {
                    files = fs.readdirSync(testBase);
                    files.forEach(function(file) {
                        var ext = path.extname(file);
                        if (ext === '.js') {
                            mods[mod] = true;
                            tests.push(path.join(testBase, file));
                        }
                    });
                }
            });
            tests.sort();
            tests.push(path.join(gbase, 'src/common/tests/prep.js'));
        } else {
            if (!util.exists(testBase)) {
                testBase = path.join(this.module.dir, this.module.name, 'tests', 'cli');
            }
            if (util.exists(testBase)) {
                files = fs.readdirSync(testBase);
                files.forEach(function(file) {
                    var ext = path.extname(file);
                    if (ext === '.js') {
                        mods[self.module.name] = true;
                        tests.push(path.join(testBase, file));
                    }
                });
            }
        }

        if (tests.length) {
            log.info('starting cli tests for: ' + Object.keys(mods).sort().join(', '));
            log.debug('executing: ' + yuitestBin + ' ' + tests.join(' '));
            log.log('');
            yuitest = spawn(yuitestBin, tests, {
                env: env
            });
            yuitest.stdout.on('data', function (data) {
                process.stdout.write(data.toString());
            });

            yuitest.stderr.on('data', function (data) {
                data = data.toString().trim();
                log.error('yuitest: ' +  data);
            });

            yuitest.on('exit', function(code) {
                if (code) {
                    self.stopServer();
                    log.bail('yuitest returned a failure');
                }
                log.info(log.color('yuitest tests complete', 'green'));
                if (callback) {
                    callback();
                }
            });
        } else {
            log.debug('module does not have cli based tests');
            if (callback) {
                log.debug('no cli modules, calling callback to start grover');
                callback();
            }
        }
    },
    grover: function() {
        /*
        log.debug('sending grover SIGCONT');
        process.kill(this.groverProcess.pid, 'SIGCONT');
        */
        log.debug('sending grover continue message');

        //this.groverProcess.send({ 'continue': true });
        this.startGrover();
    },
    groverProcess: null,
    agents: function() {
        log.info('fetching yeti agents from ' + this.yetiHub);
        var yeti = require('yeti'),
            client = yeti.createClient(this.yetiHub);

            client.connect(function() {
                client.getAgents(function(err, agents) {
                    log.info('hub currently has ' + agents.length + ' connected agents');
                    agents.sort().forEach(function(a) {
                        console.log('               ', a);
                    });
                    client.end();
                });
            });
    },
    yeti: function() {
        var tests = this.resolveTests(),
            yetiBin = path.join(__dirname, '../../node_modules/.bin/yeti'),
            gbase = path.join(git.findRoot(), '../'),
            child, self = this, env = process.env,
            d = new Date(),
            yetiPort = String(d.getFullYear()) + String(d.getMinutes()) + String(d.getSeconds());

        log.info('using hub: ' + this.yetiHub);

        log.debug('setting server root to: ' + gbase);
        log.info('starting yeti output\n');
        tests.forEach(function(val, key) {
            tests[key] = val.replace(gbase, '');
        });
        process.chdir(gbase);
        
        if (this.useYetiGrid) {
            tests.unshift(this['wd-host']);
            tests.unshift('--wd-host');
            tests.unshift(this['wd-port']);
            tests.unshift('--wd-port');
            tests.unshift(yetiPort);
            tests.unshift('--port');
            this.options.parsed.b.forEach(function(b) {
                tests.unshift(b);
                tests.unshift('-b');
            });
        } else {
            tests.unshift(self.yetiHub);
            tests.unshift('--hub');
        }

        log.debug(yetiBin + ' ' + tests.join(' '));
        //process.exit();

        env.YETI_NO_TIMEOUT = 1;

        child = spawn(yetiBin, tests, {
            cwd: gbase,
            env: env,
            stdio: 'inherit'
        });
        
        child.on('exit', function(code) {
            if (code) {
                log.bail('yeti tests failed');
            }
            log.info('yeti tests complete');
            self.done();
        });
    },
    _tests: null,
    resolveTests: function(excludes) {
        if (this._tests && this._tests.length) {
            return [].concat(this._tests);
        }
        var tests = [], base,
            self = this, batch,
            exclude = {},
            canBatch = false,
            testPath = path.join(this.module.dir, 'tests', 'unit');

        if (this.options.parsed.x) {
            this.options.parsed.x.forEach(function(m) {
                exclude[m] = true;
            });
        }
        if (excludes) {
            excludes.forEach(function(m) {
                exclude[m] = true;
            });
        }
        if (!util.exists(testPath)) {
            testPath = path.join(this.module.dir, this.module.name, 'tests', 'unit');
        }
        log.debug('scanning ' + testPath);

        if (util.exists(testPath)) {
            tests = util.getTests(testPath, self.coverage);
        } else {
            canBatch = (util.isYUI() && (this.module.name === 'yui3' || this.modules));
            if (this.module.name === 'gallery') {
                canBatch = true;
            }
            if (canBatch) {
                base = path.join(git.findRoot(), '../src');
                if (!this.modules) {
                    this.modules = [];
                    batch = fs.readdirSync(base);
                    batch.forEach(function(mod) {
                        self.modules.push(mod);
                    });
                }
                this.modules.sort();

                log.info('using override modules: ' + this.modules.sort().join(', '));
                if (Object.keys(exclude).length) {
                    log.warn('excluding the following modules: ' + Object.keys(exclude).sort().join(', '));
                }
                this.modules.forEach(function(mod) {
                    if (exclude[mod]) {
                        return;
                    }
                    var p = path.join(base, mod, 'tests/unit');

                    if (util.exists(p)) {
                        tests = [].concat(tests, util.getTests(p, self.coverage));
                    }
                });
            } else {
                if (this.module) {
                    log.bail('seems this module does not have tests, you should add some :)');
                } else {
                    log.bail('are you in a module directory?');
                }
            }
        }
        
        if (this.options.parsed.functional) {
            log.info('Scanning for functional tests too');
            tests = util.selleck(this.module.dir, tests);
        }
        this._tests = [].concat(tests);
        return tests;
    },
    prepServer: function(callback) {
        log.info('prepping grover tests');
        var gbase = path.join(git.findRoot(), '../'),
            self = this;

        log.debug('setting server root to: ' + gbase);
        process.chdir(gbase);
        

        portfinder.getPort(function (err, port) {
            self.yogiURL = 'http://127.0.0.1:' + port + '/';
            
            log.debug('startng yogi server at: ' + self.yogiURL);
            self.options.grover = true;
            self.options.tests = self.resolveTests();

            self.options.tests.forEach(function(val, key) {
                self.options.tests[key] = val.replace(gbase, 'tests/').split(path.sep).join('/');
            });
            self.options.callback = function() {
                //delete the options callback so that it never fires again
                delete self.options.callback;
                server.port = port;
                server.startServer();
                self.yogiServer = server;
                var t = ((self.options.functional) ? 500 : 0);
                setTimeout(function() {
                    callback(port);
                }, t);
            };
            server.init(self.options);
        });
    },
    startGrover: function() {
        var groverBin = path.join(__dirname, '../../node_modules/grover/bin/grover.js'),
            gbase = path.join(git.findRoot(), '../'),
            tests = this.resolveTests(),
            self = this, grover;

        if (!util.exists(groverBin)) {
            log.bail('grover is not installed :(');
        }

        tests.forEach(function(val, key) {
            tests[key] = val.replace(gbase, 'tests/').split(path.sep).join('/');
        });

        if (this.options.parsed.color === false) {
            tests.unshift('--no-color');
        }

        if (this.options.parsed['phantom-bin']) {
            tests.unshift(this.options.parsed['phantom-bin']);
            tests.unshift('--phantom-bin');
        }

        if (this.options.parsed.coverdir) {
            tests.unshift(this.options.parsed.coverdir);
            tests.unshift('--coverdir');
        }

        if (this.options.parsed.outfile) {
            tests.unshift(this.options.parsed.outfile);
            tests.unshift('--outfile');
        }

        if (this.options.parsed.junit) {
            tests.unshift('--junit');
        }

        if (this.coverage) {
            log.info('turning on coverage support in grover');
            tests.unshift('?filter=coverage');
            tests.unshift('--suffix');
            tests.unshift('--coverage');
            tests.unshift('70');
            tests.unshift('--coverage-warn');
        } else {
            tests.unshift('?filter=' + this.filter);
            tests.unshift('--suffix');
        }
        if (this.options.parsed.json) {
            tests.unshift('--json');
        }
        
        /*
        if (this.options.parsed.outfile) {
            tests.unshift(path.join(this.module.dir, this.options.parsed.outfile));
            tests.unshift('--outfile');
        }
        */
        
        tests.unshift(self.yogiURL);
        tests.unshift('--prefix');

        if (self.options.parsed.t) {
            tests.unshift(self.options.parsed.t);
            tests.unshift('--timeout');
        }
        if (self.options.parsed.c) {
            tests.unshift(self.options.parsed.c);
            tests.unshift('--concurrent');
        }
        log.debug('executing testing in:\n' + tests.join('\n'));
        grover = fork(groverBin, tests, {
            env: process.env,
            cwd: gbase,
            stdio: 'inherit'
        });

        self.groverProcess = grover;
        
        grover.on('exit', function(code) {
            if (code) {
                log.bail('grover returned a failure');
            }
            log.info(log.color('grover tests complete', 'green'));
            self.stopServer();
            self.done();
        });

        grover.on('message', function (msg) {
            if (msg.done) {
                self.stopServer();
            }
        });

    },
    stopServer: function() {
        if (this.yogiServer) {
            this.yogiServer.stopServer();
        }
    },
    help: function() {
        return [
            'test',
            'grover tells you what is wrong',
            'run from inside a module to test it',
            'pass extra modules to test them too.',
            'from ./src to test all',
            '--port <number> to change the testing port',
            '--coverage to generate a coverage report',
            '--cli to run only cli tests',
            '--filter (min|raw|debug) pass filter to test files',
            '--functional Also run the Selleck functional tests',
            '--yeti Will run tests on http://hub.davglass.com (experimental)',
            '--yeti --hub <url> Use this hub instead  (experimental)',
            '--yeti --agents List the agents connected to the hub  (experimental)',
            '--wd-host <url> The selenium grid host, defaults to grid.davglass.com (experimental)',
            '--wd-port <number> The selenium grid host port, defaults to 4444 (experimental)',
            '--grid use the default selenium gridThe selenium grid host (experimental)',
            '--chrome <number> Number of browsers to launch (experimental)',
            '--phantom <number> Number of browsers to launch (experimental)',
            '--firefox <number> Number of browsers to launch (experimental)',
            '-b <array|browser names> -b chrome -b chrome/mac -b firefox/windows (experimental)'
        ];
    }
};

util.mix(exports, mods);
