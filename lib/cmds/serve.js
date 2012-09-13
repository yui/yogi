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
    path = require('path'),
    echoecho = require('echoecho'),
    istanbul = require('istanbul'),
    request = require('request'),
    urlParse = require('url').parse,
    rimraf = require('rimraf'),
    spawn = require('child_process').spawn,
    express = require('express'),
    istanbulBase = path.join(__dirname, '../../web/results/'),
mods = {
    init: function(options) {
        var self = this,
            port = options.parsed.port || 5000,
            module = util.findModule(true);

        this.options = options;
        this.port = parseInt(port, 10);
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
                log.bail('could not locate the module you are attemping to serve, are you in the modules source directory?');
            }
        }
        this.module = module;
        if (util.isYUI()) {
            log.info('this is yui, using global path for all docs');
            this.module.dir = path.resolve(this.module.dir, '../');
        }
    },
    spawn: function(cmd, args, entry) {

        log.info('launching ' + cmd + ' ' + args.join(' '));
        var port = this.port,
            child = spawn(path.join(this.root, cmd), args, {
                cwd: this.module.dir
            });

        child.stdout.on('data', function (data) {
            log.debug(cmd + ': ' + data.toString().trim());
        });

        child.stderr.on('data', function (data) {
            log.debug(cmd + ': ' +  data.toString().trim());
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
    yuidoc: function() {
        this.port++;
        var config = path.join(__dirname, '../../configs/yuidoc/yuidoc.json');
        if (util.isYUI()) {
            log.info('this is yui, using global path for all docs');
            config = path.join(this.module.dir, 'common/api/yuidoc.json');
        }
        this.spawn('yuidoc', ['--server', this.port, '--config', config, '.'], 'api');
    },
    selleck: function() {
        this.port++;
        var port = this.port,
            project = path.join(__dirname, '../../configs/selleck');

        if (util.isYUI()) {
            log.info('this is yui, using global path for all docs');
            project = path.join(this.module.dir, 'common/docs/');
        }

        this.spawn('selleck', ['--server', port, '--project', project], 'docs');
        
    },
    getEnding: function(callback) {
        fs.readFile(path.join(__dirname, '../../configs/istanbul/ending.js'), function(err, code) {
            callback(code || '');
        });
    },
    serveCoverage: function(file, callback) {
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
    tests: function() {
        var self = this,
            handler,
            gbase = path.join(git.findRoot(process.cwd()), '../'),
            base = (util.isYUI() ? path.join(this.module.dir, this.module.name) : this.module.dir),
            testDir = path.join(base, 'tests/unit');

        log.info('adding tests route');
        this.app.get('/tests/', function(req, res) {
            res.redirect('/');
        });

        this.app.post('/tests/results', function (req, res) {
            process.chdir(gbase);
            var tmp = path.join(__dirname, '../../web/results/');
            if (util.exists(tmp)) {
                rimraf.sync(tmp);
            }
            fs.mkdirSync(tmp);
            var collect = new istanbul.Collector();
            collect.add(req.body);
            var report = istanbul.Report.create('html', {
                dir: tmp
            });
            report.writeReport(collect, true);
            res.header('Content-type', 'application/json');
            res.send(JSON.stringify({
                written: true,
                redirect: '/tests/results/'
            }));
        });

        if (util.exists(istanbulBase)) {
            rimraf.sync(istanbulBase);
        }

        this.app.get('/tests/results/' + '*', function(req, res) {
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
                        res.contentType(file);
                        res.send(data);
                    }
                });
            } else {
                res.redirect('/');
            }
        });
        
        echoecho.paths([
            '/tests/unit/index.html'
        ]);
        
        handler = function(req, res) {
            res.header('Yogi-Served', 'Yes');
            var file = path.join(base, 'tests', req.params[0]);
            if (util.exists(file)) {
                fs.readFile(file, 'utf8', function(err, data) {
                    if (err) {
                        res.send('Not Found', 404);
                    } else {
                        res.contentType(file);
                        res.send(data);
                    }
                });
            } else {
                if (echoecho.handle(req)) {
                    echoecho.serve(req, res);
                } else {
                    res.send('YOGI Not Found', 404);
                }
            }
        };

        this.app.get('/tests/'+'*', handler);
        this.app.post('/tests/'+'*', handler);
        this.app.put('/tests/'+'*', handler);
        this.app.delete('/tests/'+'*', handler);

        this.app.get('/build/' + '*', function(req, res) {
            res.header('Yogi-Served', 'Yes');
            var file = path.join(gbase, 'build', req.params[0]);
            if (util.exists(file)) {
                if (file.indexOf('-coverage.js') > -1 && self.options.parsed.istanbul) {
                    self.serveCoverage(file, function(err, data) {
                        res.contentType(file);
                        res.header('Instanbul-Coverage', 'In-Flight');
                        res.send(data);
                    });
                } else {
                    fs.readFile(file, 'utf8', function(err, data) {
                        if (err) {
                            res.send('Not Found', 404);
                        } else {
                            res.contentType(file);
                            res.send(data);
                        }
                    });
                }
            } else if (self.yui) {
                file = path.join(self.yui, 'build/', req.params[0]);
                if (util.exists(file)) {
                    if (file.indexOf('-coverage.js') > -1 && self.options.parsed.istanbul) {
                        self.serveCoverage(file, function(err, data) {
                            res.contentType(file);
                            res.header('Instanbul-Coverage', 'In-Flight');
                            res.send(data);
                        });
                    } else {
                        fs.readFile(file, 'utf8', function(err, data) {
                            if (err) {
                                res.send('Not Found', 404);
                            } else {
                                res.contentType(file);
                                res.send(data);
                            }
                        });
                    }
                } else {
                    res.send('Not Found', 404);
                }
            } else {
                res.send('Not Found', 404);
            }
        });

        this.app.get('*', function(req, res) {
            res.header('Yogi-Served', 'Yes');
            var file = path.join(gbase, 'src', req.params[0]);
            if (util.exists(file)) {
                fs.readFile(file, 'utf8', function(err, data) {
                    if (err) {
                        res.send('Not Found', 404);
                    } else {
                        res.contentType(file);
                        res.send(data);
                    }
                });
            } else {
                res.send('Not Found', 404);
            }
        });

    },
    run: function() {
        var port = this.port,
            name = this.module.name,
            index = fs.readFileSync(path.join(__dirname, '../../web/index.html'), 'utf8'),
            base = (util.isYUI() ? path.join(this.module.dir, this.module.name) : this.module.dir),
            testDir = path.join(base, 'tests/unit');

        this.app = express.createServer();
        this.app.use(express.bodyParser());
        this.app.listen(port);
        index = index.replace(/\{\{module\}\}/gi, this.module.name);

        this.app.get('/', function(req, res) {
            res.header('Yogi-Served', 'Yes');
            fs.readdir(testDir, function(err, files) {
                if (files && files.length) {
                    files.sort();
                    var t = [], c = [], hasCoverage = false;
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
                    index = index.replace(/\{\{tests\}\}/gi, 'You should be ashamed, this needs tests');
                    index = index.replace(/\{\{covertests\}\}/gi, 'You should be ashamed, this needs tests');
                }
                res.send(index);
            });
        });

        this.app.get('/yogi/' + '*', function(req, res) {
            res.header('Yogi-Served', 'Yes');
            var file = path.join(__dirname, '../../web/', req.params[0]);
            if (util.exists(file)) {
                fs.readFile(file, 'utf8', function(err, data) {
                    if (err) {
                        res.send('Not Found', 404);
                    } else {
                        res.contentType(file);
                        res.send(data);
                    }
                });
            } else {
                res.send('Not Found', 404);
            }
        });

        this.yuidoc();
        this.selleck();
        this.tests();
        log.info('listening on: http://127.0.0.1:' + port);
    },
    help: function() {
        return [
            'serve',
            'fire up the yogi server, it\'s here to help'
        ];
    }
};




util.mix(exports, mods);
