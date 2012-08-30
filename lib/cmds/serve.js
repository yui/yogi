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
    request = require('request'),
    urlParse = require('url').parse,
    spawn = require('child_process').spawn,
    express = require('express'),
mods = {
    init: function(options) {
        var self = this,
            port = options.parsed.port || 5000,
            module = util.findModule(true);

        this.port = parseInt(port, 10);
        this.yui = config.get('yui');
        this.root = path.join(__dirname, '../../node_modules/.bin');
        if (!module) {
            log.bail('could not locate the module you are attemping to serve, are you in the modules source directory?');
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
    tests: function() {
        var self = this,
            gbase = path.join(git.findRoot(process.cwd()), '../'),
            base = (util.isYUI() ? path.join(this.module.dir, this.module.name) : this.module.dir),
            testDir = path.join(base, 'tests/unit');

        log.info('adding tests route');
        this.app.get('/tests/', function(req, res) {
            res.redirect('/');
        });

        this.app.get('/tests/'+'*', function(req, res) {
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
                res.send('Not Found', 404);
            }
        });

        this.app.get('/build/' + '*', function(req, res) {
            var file = path.join(gbase, 'build', req.params[0]);
            if (util.exists(file)) {
                fs.readFile(file, 'utf8', function(err, data) {
                    if (err) {
                        res.send('Not Found', 404);
                    } else {
                        res.contentType(file);
                        res.send(data);
                    }
                });
            } else if (self.yui) {
                file = path.join(self.yui, 'build/', req.params[0]);
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
            } else {
                res.send('Not Found', 404);
            }
        });

        this.app.get('*', function(req, res) {
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
