/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    config = require('../config'),
    fs = require('fs'),
    git = require('../git'),
    version = require('./version').version,
    path = require('path'),
    echoecho = require('echoecho').EchoEcho,
    ee = new echoecho({ all: true }),
    istanbul = require('istanbul'),
    request = require('request'),
    rimraf = require('rimraf'),
    mkdirp = require('mkdirp'),
    spawn = require('win-spawn'),
    express = require('express'),
    api = require('../api'),
    osenv = require('osenv'),
    istanbulBase = path.join(osenv.tmpdir(), 'yogi-istanbul'),
    portfinder = require('portfinder'),
    findit = require('findit'),
    ansispan = require('ansispan'),
    mods;

config.register('yui', '<path> set the path to your local yui3 source tree');

mods = {
    init: function(options) {
        var port = options.parsed.port || 5000,
            self = this,
            module = util.findModule(true);

        this.options = options;
        this.port = parseInt(port, 10);
        if (isNaN(this.port)) {
            this.port = 5000;
        }
        portfinder.basePort = this.port;
        this.yui = config.get('yui');
        this.root = path.join(__dirname, '../../node_modules/.bin');
        
        if (!module) {
            log.debug('not a module, is it yui?');
            if (util.isYUI()) {
                module = {
                    name: 'yui3',
                    dir: path.join(git.findRoot(), '../src')
                };
            } else {
                this._run = this.run;
                this.run = function() {
                    log.debug('holding on to the run command for a bit');
                };
                this.scan(function() {
                    if (options.callback) {
                        options.callback();
                    } else {
                        self.run = self._run;
                        self.run();
                    }
                });
            }
        }

        if (module) {
            this.module = module;
            if (util.isYUI()) {
                log.debug('this is yui, using global path for all docs');
                this.module.dir = path.resolve(this.module.dir, '../');
            }
            if (options.callback) {
                options.callback();
            }
        }
    },
    scan: function(callback) {
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
                log.info('using ' + mods.join(', '));
                self.module = {
                    name: 'gallery',
                    dir: process.cwd()
                };
                self.modules = mods;
                callback();
            } else {
                log.bail('could not locate the module you are attemping to serve, are you in the modules source directory?');
            }
        });
    },
    spawn: function(cmd, port, args, entry) {
        var cwd = this.module.dir,
            child;
        
        if (this.module.name === 'yui3') {
            cwd = path.join(cwd, 'src');
        }

        log.info('launching ' + cmd + ' ' + args.join(' '));
        log.debug('with cwd: ' + cwd);
        child = spawn(path.join(this.root, cmd), args, {
                cwd: cwd
            });

        child.stdout.on('data', function (data) {
            log.debug(cmd + ': ' + data.toString().trim());
        });

        child.stderr.on('data', function (data) {
            if (entry === 'docs') { //HACK
                log.error(cmd + ': ' +  data.toString().trim());
            } else {
                log.debug(cmd + ': ' +  data.toString().trim());
            }
        });

        this.app.get('/' + entry + '/' + '*', function(req, res) {
            res.header('Yogi-Proxied', 'Yes');
            var parts = req.url.split('/'),
                url, p, proxy;

            if (parts[0] === '') {
                parts.shift();
            }
            parts.shift();
            url = '/' + parts.join('/');
            p = 'http://127.0.0.1:' + port + url;
            proxy = request(p, {
                headers: {
                    'x-forwarded-from': req.headers.host
                }
            });
            proxy.pipe(res);
        });
        
        this.app.get('/' + entry, function(req, res) {
            res.redirect(req.url + '/');
        });

    },
    yuidoc: function(callback) {
        var self = this;
        portfinder.getPort(function (err, port) {
            var config = path.join(__dirname, '../../configs/yuidoc/yuidoc.json');
            if (util.isYUI()) {
                log.info('this is yui, using global path for all docs');
                if (self.module.name === 'yui3') {
                    config = path.join(self.module.dir, 'src/common/api/yuidoc.json');
                } else {
                    config = path.join(self.module.dir, 'common/api/yuidoc.json');
                }
            }
            self.version(function(version) {
                if (version) {
                    var json = JSON.parse(fs.readFileSync(config, 'utf8'));

                    json.version = version;
                    try {
                    fs.writeFileSync(config, JSON.stringify(json, null, 4), 'utf8');
                    } catch (e) {}
                }
                self.spawn('yuidoc', port, ['--server', port, '--config', config], 'api');
                callback();
            });
        });
    },
    _version: null,
    version: function(callback) {
        var self = this;
        if (util.isYUI()) {
            return callback(null);
        }
        if (self._version) {
            callback(self._version);
        } else {
            api.getNon('/version', function(err, json) {
                if (json) {
                    self._version = json.version;
                }
                callback(self._version);
            });
        }
    },
    info: function(callback) {
        var self = this;
        
        this.app.get('/info', function(req, res) {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            

            var cmd = process.argv[0],
                html = fs.readFileSync(path.join(__dirname, '../../web/shifter.html'), 'utf8'),
                args = [
                    process.argv[1],
                    'info'
                ], sh,
                cwd = path.join(self.module.dir, self.module.name),
                handler = function(d) {
                    var line = d.toString().replace(/\n/g, '<br>\n');
                    line = line.replace(/ /g, '&nbsp;');
                    res.write(ansispan(line));
                    res.write('<script>window.scrollTo(0, 99999999999999);</script>');
                };

            if (!util.isYUI()) {
                cwd = self.module.dir;
            }

            res.write(html);

            res.write('cd ' + cwd + '<br>');
            res.write('$ ' + args.join(' ') + '<br>');

            sh = spawn(cmd, args, {
                cwd: cwd
            });
            
            sh.stdout.on('data', handler);
            sh.stderr.on('data', handler);

            sh.on('exit', function(code) {
                res.write('yogi exited, code: ' + code + '<br><br>');
                res.write('<script>window.scrollTo(0, 99999999999999);</script>');
                res.end();
            });
        });

        callback();
    },
    yeti: function(callback) {
        var self = this;
        
        this.app.get('/yeti', function(req, res) {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            

            var cmd = process.argv[0],
                html = fs.readFileSync(path.join(__dirname, '../../web/shifter.html'), 'utf8'),
                args = [
                    process.argv[1],
                    'test',
                    '--yeti'
                ], sh,
                cwd = path.join(self.module.dir, self.module.name),
                handler = function(d) {
                    var line = d.toString().replace(/\n/g, '<br>\n');
                    line = line.replace(/ /g, '&nbsp;');
                    res.write(ansispan(line));
                    res.write('<script>window.scrollTo(0, 99999999999999);</script>');
                };

            res.write(html);


            if (util.isYUI()) {
                if (self.module.name === 'yui3') {
                    cwd = path.join(self.module.dir, 'src');
                }
            } else {
                cwd = self.module.dir;
            }

            Object.keys(req.query).forEach(function(key) {
                if (req.query[key] === '') {
                    args.push('--' + key);
                } else {
                    args.push('--' + key + '=' + req.query[key]);
                }
            });
            
            res.write('cd ' + cwd + '<br>');
            res.write('$ ' + args.join(' ') + '<br>');

            sh = spawn(cmd, args, {
                cwd: cwd
            });
            
            sh.stdout.on('data', handler);
            sh.stderr.on('data', handler);

            sh.on('exit', function(code) {
                res.write('yogi exited, code: ' + code + '<br><br>');
                res.write('<script>window.scrollTo(0, 99999999999999);</script>');
                res.end();
            });
        });

        callback();
    },
    grover: function(callback) {
        var self = this;
        
        this.app.get('/grover', function(req, res) {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            

            var cmd = process.argv[0],
                html = fs.readFileSync(path.join(__dirname, '../../web/shifter.html'), 'utf8'),
                args = [
                    process.argv[1],
                    'test'
                ], sh,
                cwd = path.join(self.module.dir, self.module.name),
                handler = function(d) {
                    var line = d.toString().replace(/\n/g, '<br>\n');
                    line = line.replace(/ /g, '&nbsp;');
                    res.write(ansispan(line));
                    res.write('<script>window.scrollTo(0, 99999999999999);</script>');
                };

            res.write(html);


            if (util.isYUI()) {
                if (self.module.name === 'yui3') {
                    cwd = path.join(self.module.dir, 'src');
                }
            } else {
                cwd = self.module.dir;
            }

            Object.keys(req.query).forEach(function(key) {
                if (req.query[key] === '') {
                    args.push('--' + key);
                } else {
                    args.push('--' + key + '=' + req.query[key]);
                }
            });
            
            res.write('cd ' + cwd + '<br>');
            res.write('$ ' + args.join(' ') + '<br>');

            sh = spawn(cmd, args, {
                cwd: cwd
            });
            
            sh.stdout.on('data', handler);
            sh.stderr.on('data', handler);

            sh.on('exit', function(code) {
                res.write('yogi exited, code: ' + code + '<br><br>');
                res.write('<script>window.scrollTo(0, 99999999999999);</script>');
                res.end();
            });
        });

        callback();
    },
    shifter: function(callback) {
        var self = this;
        
        this.app.get('/shifter', function(req, res) {
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            var html = fs.readFileSync(path.join(__dirname, '../../web/shifter.html'), 'utf8'),
                shifter = path.join(self.root, 'shifter'),
                    args = [], sh,
                    cwd = path.join(self.module.dir, self.module.name),
                    handler = function(d) {
                        var line = d.toString().replace(/\n/g, '<br>\n');
                        line = line.replace(/ /g, '&nbsp;');
                        res.write(ansispan(line));
                        res.write('<script>window.scrollTo(0, 99999999999999);</script>');
                    };
            
            res.write(html);

            if (!util.isYUI()) {
                cwd = self.module.dir;
            }

            res.write('<p>You can add parameters to the query string to use shifter options: /shifter?istanbul&quiet&foo=bar</p>');


            if (self.module.name === 'yui3' || self.module.name === 'gallery') {
                if (util.isYUI()) {
                    cwd = path.join(self.module.dir, 'src');
                }
                args.push('--walk');
                args.push('--cache');
            }

            Object.keys(req.query).forEach(function(key) {
                if (req.query[key] === '') {
                    args.push('--' + key);
                } else {
                    args.push('--' + key + '=' + req.query[key]);
                }
            });

            res.write('cd ' + cwd + '<br>');
            res.write('$ shifter ' + args.join(' ') + '<br>');

            sh = spawn(shifter, args, {
                cwd: cwd
            });

            sh.stdout.on('data', handler);
            sh.stderr.on('data', handler);

            sh.on('exit', function(code) {
                res.write('shifter exited, code: ' + code + '<br><br>');
                res.write('<script>window.scrollTo(0, 99999999999999);</script>');
                res.end();
            });
        });

        callback();
    },
    selleck: function(callback) {
        var self = this;
        portfinder.getPort(function (err, port) {
            var project = path.join(__dirname, '../../configs/selleck');

            if (util.isYUI()) {
                log.info('this is yui, using global path for all docs');
                if (self.module.name === 'yui3') {
                    project = path.join(self.module.dir, 'src/common/docs/');
                } else {
                    project = path.join(self.module.dir, 'common/docs/');
                }
            }

            self.version(function(version) {
                if (version) {
                    var file = path.join(project, 'project.json'),
                        json = JSON.parse(fs.readFileSync(file, 'utf8'));

                    json.yuiVersion = version;
                    try {
                    fs.writeFileSync(file, JSON.stringify(json, null, 4), 'utf8');
                    } catch (e) {}
                }
                self.spawn('selleck', port, ['--server', port, '--project', project], 'docs');
                callback();
            });
        });
    },
    getEnding: function(callback) {
        if (this.options.grover) {
            callback('');
        } else {
            fs.readFile(path.join(__dirname, '../../configs/istanbul/ending.js'), function(err, code) {
                callback(code || '');
            });
        }
    },
    serveCoverage: function(file, callback) {
        log.debug('serving istanbul file: ' + file);
        this.getEnding(function(ending) {
            var name = path.join('build', file.split('build')[1]);
            name = name.replace('-coverage', '');
            fs.readFile(file.replace('-coverage', ''), 'utf8', function(err, data) {
                var inst = new istanbul.Instrumenter({
                    embedSource: true
                });
                inst.instrument(data, name, function(err, source) {
                    source += '\n' + ending;
                    callback(err, source);
                });
            });
        });
    },
    toSeed: function(str, fixGallery) {
        if (fixGallery) {
            str += "\n";
            str += "YUI.applyConfig({\n";
            str += "    groups: {\n";
            str += "        gallery: {\n";
            str += "            combine: false,\n";
            str += "            root: '/build/',\n";
            str += "            patterns: {\n";
            str += "                'gallery-': { },\n";
            str += "                'lang/gallery-': {},\n";
            str += "                'gallerycss-': { type: 'css' }\n";
            str += "            }\n";
            str += "        }\n";
            str += "    }\n";
            str += "});\n";
        }
        str += "\n";
        str += 'var YOGI_CONFIG = ' + JSON.stringify(this.getConfig(), null, 4) + ';';
        str += "\n";
        return str;
    },
    _buildtag: null,
    fetchAndServe: function(file, res) {
        log.debug('fetching ' + file);
        var self = this,
            _fetch = function() {
                var url = 'http://yui.yahooapis.com/' + self._buildtag + '/build/' +  file;
                    log.debug('fetching: ' + url);

                request.get(url, function(err, r) {
                    if (r.statusCode === 200) {
                        res.charset = 'utf-8';
                        res.contentType(String(file));
                        res.header('YOGU-Gallery-Fetch', 'In-Flight');
                        res.send(r.body);
                    } else {
                        res.send('YOGI Not Found', 404);
                    }
                });
            };

        if (this._buildtag) {
            _fetch();
        } else {
            log.warn('fetching latest buildtag');
            api.get('/cdn/buildtag', function(err, json) {
                self._buildtag = json.buildtag;
                _fetch();
            });
        }
    },
    parseAndServe: function(file, res) {
        var self = this,
            st;

        if (file.indexOf('-coverage.js') > -1 && self.options.parsed.istanbul) {
            self.serveCoverage(file, function(err, data) {
                res.charset = 'utf-8';
                res.contentType(file);
                res.header('Instanbul-Coverage', 'In-Flight');
                res.send(data);
            });
        } else {
            switch (path.extname(file)) {
                case '.js':
                case '.css':
                case '.json':
                    fs.readFile(file, 'utf8', function(err, data) {
                        if (err) {
                            res.send('Not Found', 404);
                        } else {
                            res.charset = 'utf-8';
                            res.contentType(file);
                            if (file.indexOf('build' + path.sep + 'yui') > -1) {
                                data = self.toSeed(data, !util.isYUI());
                            }
                            res.send(data);
                        }
                    });
                    break;
                case '.html':
                    st = fs.createReadStream(file);
                    res.charset = 'utf-8';
                    res.contentType('text/html');
                    st.pipe(res);
                    break;
                default:
                    st = fs.createReadStream(file);
                    res.contentType(file);
                    st.pipe(res);
            }
        }
    },
    tests: function(callback) {
        var self = this,
            handler,
            gbase = path.join(git.findRoot(process.cwd()), '../'),
            base = (util.isYUI() ? path.join(this.module.dir) : this.module.dir);
        
        if (this.module.name === 'yui3') {
            base = path.join(base, 'src');
        } else {
            if (path.basename(base).indexOf(this.module.name) === -1) {
                if (util.exists(path.join(base, this.module.name))) {
                    base = path.join(base, this.module.name);
                }
            }
        }

        log.info('adding tests route');
        this.app.get('/tests/', function(req, res) {
            res.redirect('/');
        });

        this.app.post('/tests/results', function (req, res) {
            process.chdir(gbase);
            log.debug('got istanbul results, generating report in ' + istanbulBase);
            if (util.exists(istanbulBase)) {
                rimraf.sync(istanbulBase);
            }
            mkdirp(istanbulBase, function() {
                var jsonFile = path.join(istanbulBase, 'istanbul.json'),
                    collect, report;

                log.debug('writing coverage json here: ' + jsonFile);
                fs.writeFileSync(jsonFile, JSON.stringify(req.body, null, 4), 'utf8');
                collect = new istanbul.Collector();
                collect.add(req.body);
                report = istanbul.Report.create('html', {
                    dir: istanbulBase
                });
                report.writeReport(collect, true);
                res.header('Content-type', 'application/json');
                log.debug('report generated, sending confirmation to client');
                res.send(JSON.stringify({
                    written: true,
                    redirect: '/tests/results/'
                }));
            });
        });

        if (util.exists(istanbulBase)) {
            rimraf.sync(istanbulBase);
        }

        this.app.get('/tests/results/' + '*', function(req, res) {
            log.debug('serving istanbul coverage report: ' + req.params[0]);
            res.header('Yogi-Served', 'Yes');
            var file = path.join(istanbulBase, req.params[0]);
            if (!req.params[0] || req.params[0] === '') {
                file = path.join(file, 'index.html');
            }
            if (util.exists(file)) {
                fs.readFile(file, 'utf8', function(err, data) {
                    if (err) {
                        res.send('Not Found', 404);
                    } else {
                        res.charset = 'utf-8';
                        res.contentType(file);
                        res.send(data);
                    }
                });
            } else {
                res.redirect('/');
            }
        });
        
        if (this.options.tests) {
            this.options.tests.forEach(function(val, key) {
                self.options.tests[key] = '/' + val;
            });
        }
        
        handler = function(req, res) {
            res.header('Yogi-Served', 'Yes');
            //Checking a batch of locations to serve these files from..
            var paths = [
                path.join(base, 'tests', req.params[0]),
                path.join(base, 'tests', 'unit', req.params[0]),
                path.join(base, req.params[0]),
                path.join(gbase, req.params[0]),
                path.join(gbase, 'src', req.params[0])
            ], served = false;

            paths.forEach(function(file) {
                if (!served) {
                    log.debug('checking: ' + file);
                    if (util.exists(file)) {
                        served = true;
                        self.parseAndServe(file, res);
                    }
                }
            });
            
            if (!served) {
                if (ee.handle(req)) {
                    ee.serve(req, res);
                } else {
                    res.send('YOGI Not Found', 404);
                }
            }
        };

        this.app.get('/tests/'+'*', handler);
        this.app.post('/tests/'+'*', handler);
        this.app.put('/tests/'+'*', handler);
        this.app['delete']('/tests/'+'*', handler);

        this.app.get('/build/' + '*', function(req, res) {
            res.header('Yogi-Served', 'Yes');
            var paths = [
                path.join(gbase, 'build', req.params[0]), //This build
                path.join(gbase, '../', 'yui3', 'build', req.params[0]), //up one build
                path.join(self.yui, 'build/', req.params[0]) //yui build
            ], served = false;

            paths.forEach(function(file) {
                if (!served) {
                    log.debug('checking: ' + file);
                    if (util.exists(file)) {
                        served = true;
                        self.parseAndServe(file, res);
                    }
                }
            });

            if (!served) {
                if (req.params[0].indexOf('gallery-') > -1 || req.params[0].indexOf('gallerycss-') > -1) {
                    served = true;
                    self.fetchAndServe(req.params, res);
                }
            }

            if (!served) {
                res.send('Not Found', 404);
            }
        });
        
        self.attachXDR(function() {
            callback();
        });
    },
    attachXDR: function(callback) {
        var self = this;
        portfinder.getPort(function(err, port) {
            log.info('launching xdr server on port ' + port);
            var server = express.createServer(),
                handle = function(req, res) {
                    ee.serve(req, res);
                };
            server.use(express.bodyParser());
            server.get('*', handle);
            server.post('*', handle);
            server['delete']('*', handle);
            server.listen(port);
            self.xdrPort = port;
            self.xdr = server;
            callback();
        });
    },
    run: function () {
        var self = this;
        portfinder.getPort(function(err, port) {
            if (err) {
                if (err.code === 'EACCES') {
                    log.error('Access Denied for port: ' + self.port);
                } else {
                    console.log(err);
                }
                process.exit(1);
            }
            self.port = port;
            self.startServer.call(self);
        });
    },
    stopServer: function() {
        if (!this.app.closed) {
            try {
                this.app.close();
                this.app.closed = true;
            } catch (e) {
                this.app.closed = true;
            }
        }
        try {
            this.xdr.close();
        } catch (e) {}
    },
    getConfig: function() {
        var config = {
            version: version,
            yui: util.isYUI(),
            module: this.module
        };

        if (this.xdrPort) {
            config.xdrPort = this.xdrPort;
        }
        return config;
    },
    startServer: function() {
        var name = this.module.name,
            port = this.port,
            index = fs.readFileSync(path.join(__dirname, '../../web/index.html'), 'utf8'),
            base = (util.isYUI() ? path.join(this.module.dir, this.module.name) : this.module.dir),
            testDir = path.join(base, 'tests/unit'),
            stack = new util.Stack(),
            self = this,
            noop = function() {};

        istanbulBase = path.join(istanbulBase, String(port));
        log.debug('setting istanbul base to: ' + istanbulBase);
        this.app = express.createServer();
        this.app.use(express.bodyParser());
        this.app.on('error', function(e) {
            console.error(log.color('Yogi Error','red'));
            if (e.code === 'EADDRINUSE') {
                console.error(log.color('Port ' + port + ' is in use, try a different one!', 'red'));
            } else {
                console.error(e);
            }
            process.exit(1);
        });
        this.app.listen(port);

        this.app.get('/', function(req, res) {

            index = fs.readFileSync(path.join(__dirname, '../../web/index.html'), 'utf8'),
            index = index.replace(/\{\{module\}\}/gi, self.module.name);
            index = index.replace('{{YOGI_CONFIG}}', JSON.stringify(self.getConfig(), null, 4));
            res.header('Yogi-Served', 'Yes');
            fs.readdir(testDir, function(err, files) {
                var base = path.join(git.findRoot(), '../src'),
                    tests = [],
                    coverageTests = [],
                    t = [],
                    c = [],
                    echoPaths = [],
                    batch,
                    hasCoverage = false;

                if (files && files.length) {
                    files.sort();
                    files.forEach(function(file) {
                        if (path.extname(file) === '.html') {
                            if (file.indexOf('coverage') > -1) {
                                hasCoverage = true;
                                c.push('<li><a href="/tests/unit/' + file + '?filter=coverage">' + name + '/' + file + '</a></li>');
                            }
                        }
                    });
                    files.forEach(function(file) {
                        if (path.extname(file) === '.html') {
                            if (file.indexOf('coverage') === -1) {
                                t.push('<li><a href="/tests/unit/' + file + '">' + name + '/' + file + '</a></li>');
                                if (!hasCoverage) {
                                    c.push('<li><a href="/tests/unit/' + file + '?filter=coverage">' + name + '/' + file + '</a></li>');
                                }
                            }
                        }
                    });
                    
                    index = index.replace(/\{\{tests\}\}/gi, t.join('\n'));
                    index = index.replace(/\{\{covertests\}\}/gi, c.join('\n'));
                } else {
                    if (util.isYUI() || self.module.name === 'gallery') {
                            batch = fs.readdirSync(base);
                            batch.forEach(function(mod) {
                                
                                var p = path.join(base, mod, 'tests/unit');
                                if (util.exists(p)) {
                                    tests = [].concat(tests, util.getTests(p));
                                    coverageTests = [].concat(coverageTests, util.getTests(p, true));
                                }
                            });
                        tests.sort();
                        coverageTests.sort();
                        tests.forEach(function(p) {
                            p = p.replace(base, '/tests');
                            var name = p.replace(/\/tests/g, '').replace(/\/unit/g, '');
                            echoPaths.push(p);
                            t.push('<li><a href="' + p + '">' + name + '</a></li>');
                        });
                        coverageTests.forEach(function(p) {
                            p = p.replace(base, '/tests');
                            echoPaths.push(p);
                            var name = p.replace(/\/tests/g, '').replace(/\/unit/g, '');
                            c.push('<li><a href="' + p + '?filter=coverage">' + name + '</a></li>');
                        });

                        if (t.length) {
                            index = index.replace(/\{\{tests\}\}/gi, t.join('\n'));
                        } else {
                            index = index.replace(/\{\{tests\}\}/gi, 'You should be ashamed, this needs tests');
                        }
                        if (c.length) {
                            index = index.replace(/\{\{covertests\}\}/gi, c.join('\n'));
                        } else {
                            index = index.replace(/\{\{covertests\}\}/gi, 'You should be ashamed, this needs tests');
                        }
                    } else {
                        index = index.replace(/\{\{tests\}\}/gi, 'You should be ashamed, this needs tests');
                        index = index.replace(/\{\{covertests\}\}/gi, 'You should be ashamed, this needs tests');
                    }
                }
                res.send(index);
            });
        });

        this.app.get('/docs/yui3/', function(req, res) {
            res.redirect('/docs/');
        });
        this.app.get('/api/modules/yui3.html', function(req, res) {
            res.redirect('/api/');
        });

        this.app.get('/docs/gallery/', function(req, res) {
            res.redirect('/docs/');
        });
        this.app.get('/api/modules/gallery.html', function(req, res) {
            res.redirect('/api/');
        });

        this.app.get('/yogi/' + '*', function(req, res) {
            res.header('Yogi-Served', 'Yes');
            var file = path.join(__dirname, '../../web/', req.params[0]);
            if (util.exists(file)) {
                fs.readFile(file, 'utf8', function(err, data) {
                    if (err) {
                        res.send('Not Found', 404);
                    } else {
                        res.charset = 'utf-8';
                        res.contentType(file);
                        res.send(data);
                    }
                });
            } else {
                res.send('Not Found', 404);
            }
        });
        
        if (!this.options.grover) {
            this.yuidoc(stack.add(noop));
            this.selleck(stack.add(noop));
            this.shifter(stack.add(noop));
            this.grover(stack.add(noop));
            this.info(stack.add(noop));
            this.yeti(stack.add(noop));
        }
        this.tests(stack.add(noop));

        stack.done(function() {
            if (self.options.parsed.port && self.options.parsed.port !== port) {
                log.warn('It appears that port ' + self.options.parsed.port + ' was in use, so I picked ' + port + ' for you');
            }
            log.info('listening on: http://127.0.0.1:' + port);
            log.debug('All services have attached, attach final route..');
            self.attachFinalRoute();
        });
    },
    attachFinalRoute: function() {
        var gbase = path.join(git.findRoot(process.cwd()), '../');

        this.app.get('*', function(req, res) {
            res.header('Yogi-Served', 'Yes');
            var file = path.join(gbase, 'src', req.params[0]);
            if (util.exists(file)) {
                fs.readFile(file, 'utf8', function(err, data) {
                    if (err) {
                        res.send('Not Found', 404);
                    } else {
                        res.charset = 'utf-8';
                        res.contentType(file);
                        res.send(data);
                    }
                });
            } else {
                res.send('Not Found', 404);
            }
        });

        this.watch();
    },
    watch: function() {
        if (!this.options.parsed.watch) {
            return;
        }

        log.info('shifter watching for changes');
        var shifter = path.join(this.root, 'shifter'),
            args = [
                '--watch'
            ], sh;

        if (this.options.parsed.quiet) {
            args.push('--quiet');
        }

        sh = spawn(shifter, args, {
            cwd: path.join(this.module.dir, this.module.name)
        });

        sh.stdout.on('data', function(d) {
            console.log(d.toString().trim());
        });
        sh.stderr.on('data', function(d) {
            console.log(d.toString().trim());
        });

        sh.on('exit', function(code) {
            console.log('shifter exited, code: ', code);
        });

    },
    help: function() {
        return [
            'serve',
            'fire up the yogi server, it\'s here to help',
            '--istanbul to auto cover all requests to -coverage files',
            '--watch shifter will watch and build for you too',
            '--quiet tell shifter to be quiet when --watch is used'
        ];
    }
};




util.mix(exports, mods);
