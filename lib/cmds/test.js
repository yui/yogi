var log = require('../log'),
    util = require('../util'),
    path = require('path'),
    fs = require('fs'),
    spawn = require('child_process').spawn;


var mods = {
    init: function() {
        var module = util.findModule(true);
        if (!module) {
            log.bail('not in a module directory');
        }
        this.module = module;
        this.test();
    },
    test: function() {
        log.info('starting grover tests');
        var groverBin = path.join(__dirname, '../../node_modules/.bin/grover');
        if (!util.exists(groverBin)) {
            log.bail('grover is not installed :(');
        }
        var tests = [];
        var self = this;
        var testPath = path.join(this.module.dir, 'tests');
        log.debug('scanning ' + testPath);
        var files = fs.readdirSync(testPath);
        files.forEach(function(file) {
            if (path.extname(file) === '.html') {
                tests.push(path.join(self.module.dir, 'tests', file));
            }
        });
        log.debug('executing testing in:\n' + tests.join('\n'));
        var grover = spawn(groverBin, tests, {
            cwd: this.module.dir
        });
        
        grover.stdout.on('data', function (data) {
            log.log(data.toString().trim());
        });

        grover.stderr.on('data', function (data) {
            log.error('grover: ' +  data.toString().trim());
        });

        grover.on('exit', function(code) {
            if (code) {
                log.bail('grover returned a failure');
            }
            log.info('grover tests complete'.green);
        });

    },
    help: function() {
        return [
            'test',
            'grover tells you what is wrong'
        ]
    }
};

util.mix(exports, mods);
