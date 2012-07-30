/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    config = require('../config'),
    path = require('path'),
    request = require('request'),
    urlParse = require('url').parse,
    spawn = require('child_process').spawn,
    exists = fs.existsSync || path.existsSync;

var express = require('express');

var mods = {
    init: function(options) {
        var self = this;
        var port = options.parsed.port || 5000;
        this.port = parseInt(port, 10);
        var module = util.findModule(true);
        this.root = path.join(__dirname, '../../node_modules/.bin');
        if (!module) {
            log.bail('could not locate the module you are attemping to serve, are you in the modules source directory?');
        }
        this.module = module;
    },
    spawn: function(cmd, args, entry) {

        log.info('launching ' + cmd + ' ' + args.join(' '));
        var port = this.port;

        var child = spawn(path.join(this.root, cmd), args, {
            cwd: this.module.dir
        });

        child.stdout.on('data', function (data) {
            log.debug(cmd + ': ' + data.toString().trim());
        });

        child.stderr.on('data', function (data) {
            log.debug(cmd + ': ' +  data.toString().trim());
        });

        this.app.get('/' + entry + '/' + '*', function(req, res) {
            var parts = req.url.split('/');
            if (parts[0] === '') {
                parts.shift();
            }
            parts.shift();
            var url = '/' + parts.join('/');
            var p = 'http://127.0.0.1:' + port + url;
            var proxy = request(p, {
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
        this.spawn('yuidoc', ['--server', this.port, '--config', config, '.'], 'api');
    },
    coverage: function() {
        var self = this;
        this.port++;
        var port = this.port;
        var entry = 'tests';

        
        this.app.post('/results/', function(req, res) {
            console.log(req);
            var p = 'http://127.0.0.1:' + port + req.url;
            var proxy = request(p);
            proxy.pipe(res);
        });
        

        this.app.get('/dynamic/' + '*', function(req, res) {
            var p = 'http://127.0.0.1:' + port + req.url;
            var proxy = request(p);
            proxy.pipe(res);
        });
        this.app.get('/socket.io/' + '*', function(req, res) {
            var p = 'http://127.0.0.1:' + port + req.url;
            var proxy = request(p);
            proxy.pipe(res);
        });
        
        var testFile = path.join(__dirname, '../../web/tests.html');
        this.app.get('/tests', function(req, res) {
            fs.readFile(testFile, 'utf8', function(err, data) {
                var tests = [];
                fs.readdir(path.join(self.module.dir, 'tests/unit'), function(err, files) {
                    files.forEach(function(file) {
                        if (path.extname(file) === '.html') {
                            tests.push('<li><a href="unit/' + file + '">' + file + '</a></li>');
                        }
                    });
                    var index = data.replace(/\{\{module\}\}/gi, self.module.name);
                    index= index.replace(/\{\{tests\}\}/gi, tests.join('\n'));
                    res.send(index);
                });
            });
        });
        
        
        this.spawn('yui-coverage', ['--port', this.port], 'tests');

    },
    selleck: function() {
        this.port++;
        var port = this.port;
        var project = path.join(__dirname, '../../configs/selleck');
        this.spawn('selleck', ['--server', port, '--project', project], 'docs');
        
    },
    local: function() {
        this.port++;
        var port = this.port;
        var yuiPath = config.get('yui');
        if (!yuiPath) {
            log.bail('can not find path to yui source tree, set with: yogi config set yui <path to yui source tree>');
        }
        if (!exists(yuiPath)) {
            log.bail('failed to locate yui source tree');
        }
        this.spawn('yui-local', ['--port', port, '--build', path.join(yuiPath, 'build')], 'seed');
        
        this.app.get('/yui', function(req, res) {
            var p = 'http://127.0.0.1:' + port + req.url;
            var proxy = request(p);
            proxy.pipe(res);
        });
        
        this.app.get('/build/'+'*', function(req, res) {
            var p = 'http://127.0.0.1:' + port + req.url;
            var proxy = request(p);
            proxy.pipe(res);
        });
        
    },
    run: function() {
        var port = this.port;
        this.app = express.createServer();
        this.app.use(express.bodyParser());
        this.app.listen(port);
        var index = fs.readFileSync(path.join(__dirname, '../../web/index.html'), 'utf8');
        index = index.replace(/\{\{module\}\}/gi, this.module.name);
        this.app.get('/', function(req, res) {
            res.send(index);
        });

        this.app.use(express.static(path.join(__dirname, '../../web')));
        
        this.yuidoc();
        this.coverage();
        this.local();
        this.selleck();
        log.info('listening on: http://127.0.0.1:' + port);
    },
    help: function() {
        return [
            'serve',
            'fire up the yogi server, it\'s here to help'
        ]
    }
};




util.mix(exports, mods);
