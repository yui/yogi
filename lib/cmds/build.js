var util = require('../util'),
    log = require('../log'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    rimraf = require('rimraf');

var mods = {
    init: function(options) {
        this.loud = options.parsed.loud;

        var module = util.getPackage(true);
        this.module = module;

        this.dir = util.findModule(true).dir;
        this.builder = util.getBuilder();
        
        if (module) {
            this.copyDefaults();
        } else {
            log.warn('unable to find package.json, defaulting to `ant all`');
        }
        this.build();
    },
    build: function() {
        log.info('starting ant build, use --loud if you want more noise');
        var self = this;
        var child = spawn('ant', [ 'all' ], {
            cwd: this.dir
        });
        var err;
        child.stdout.on('data', function (data) {
            data = data.toString().trim().split('\n');
            data.forEach(function(line) {
                if (line.indexOf('BUILD FAILED') > -1) {
                    line = line.red;
                }
                var fn = log.debug;
                if (self.loud || line.indexOf('BUILD') > -1 || line.indexOf('Total time') > -1) {
                    fn = log.info;
                }
                fn.call(log, line);
            });
        });

        child.stderr.on('data', function (data) {
            data = data.toString().trim().split('\n');
            data.forEach(function(line) {
                if (line.indexOf('BUILD FAILED') > -1) {
                    line = line.red;
                }
                log.error(line);
                err = true;
            });
        });

        child.on('exit', function() {
            log.debug('ant finished, clean up');
            self.clean();
            if (err) {
                log.error('yogi detected an error, exiting code 1');
                process.exit(1);
            }
        });
        
    },
    clean: function() {
        if (this.module) {
            log.debug('cleaning up');
            var buildTmp = path.join(this.dir, 'build_tmp');
            rimraf.sync(buildTmp);
            var buildTmp = path.join(this.dir, 'build_rollup_tmp');
            rimraf.sync(buildTmp);
            fs.unlinkSync(path.join(this.dir, 'build.xml'));
            fs.unlinkSync(path.join(this.dir, 'build.properties'));
        }
        log.info('build complete')
    },
    copyDefaults: function() {
        log.info('writing build.* files');
        var base = path.join(__dirname, '../../build');
        var xml = fs.readFileSync(path.join(base, 'build.xml'), 'utf8');
        fs.writeFileSync(path.join(this.dir, 'build.xml'), xml, 'utf8');

        var props = fs.readFileSync(path.join(base, 'build.properties'), 'utf8');
        props = props.replace('{{name}}', this.module.name);
        props = props.replace('{{skinnable}}', this.module.yui.module.skinnable);
        
        var jsfiles = '', cssfiles = '', req = '', opt = '';
        if (this.module.yui.module.requires) {
            req = this.module.yui.module.requires.join(',');
        }
        if (this.module.yui.module.optional) {
            opt = this.module.yui.module.optional.join(',');
        }
        if (this.module.yui.files.js) {
            jsfiles = this.module.yui.files.js.join(',');
        } else {
            props = props.replace('component.jsfiles', '#component.jsfiles');
        }
        if (this.module.yui.files.css) {
            cssfiles = this.module.yui.files.css.join(',');
        } else {
            props = props.replace('component.cssfiles', '#component.cssfiles');
        }
        props = props.replace('{{jsfiles}}', jsfiles);
        props = props.replace('{{cssfiles}}', cssfiles);
        props = props.replace('{{requires}}', req);
        props = props.replace('{{optional}}', opt);

        fs.writeFileSync(path.join(this.dir, 'build.properties'), props, 'utf8');
    },
    help: function() {
        return [
            'build',
            'builds your module, duh! [--loud for more info]'
        ]
    }
};

util.mix(exports, mods);
