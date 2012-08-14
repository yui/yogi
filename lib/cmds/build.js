/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    rimraf = require('rimraf'),
mods = {
    init: function(options) {
        this.loud = options.parsed.loud;
        this.quiet = options.parsed.quiet;

        var module = util.getPackage(true), mod;
        this.module = module;

        mod = util.findModule(true);
        if (!mod) {
            log.bail('yogi does not know what to do here..');
        }
        this.dir =mod.dir;

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
        var self = this,
            child = spawn('ant', [ 'all', '-Dlint.skip=true', '-Dfile.encoding=utf8' ], {
                cwd: this.dir
            }), err, compErr;
            
        child.stdout.on('data', function (data) {
            data = data.toString().trim().split('\n');
            data.forEach(function(line) {
                if (line.indexOf('BUILD FAILED') > -1) {
                    line = line.red;
                }
                if (line.indexOf('[yuicompressor]') > -1) {
                    if (line.indexOf('WARNING') > -1) {
                        if (!self.quiet) {
                            compErr = true;
                        }
                    }
                } else {
                    compErr = null;
                }
                var fn = log.debug;
                if (self.loud || line.indexOf('BUILD') > -1 || line.indexOf('Total time') > -1) {
                    fn = log.info;
                }
                if (compErr) {
                    fn = log.warn;   
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
                if (line.indexOf('WARNING') > -1) {
                    if (!self.quiet) {
                        log.warn(line);
                    }
                } else {
                    log.error(line);
                    err = true;
                }
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

            buildTmp = path.join(this.dir, 'build_rollup_tmp');
            rimraf.sync(buildTmp);
            fs.unlinkSync(path.join(this.dir, 'build.xml'));
            fs.unlinkSync(path.join(this.dir, 'build.properties'));
        }
        log.info('build complete');
    },
    copyDefaults: function() {
        log.info('writing build.* files');
        var base = path.join(__dirname, '../../build'),
            xml = fs.readFileSync(path.join(base, 'build.xml'), 'utf8'),
            props = fs.readFileSync(path.join(base, 'build.properties'), 'utf8'),
            jsfiles = '', cssfiles = '', req = '', opt = '';

        fs.writeFileSync(path.join(this.dir, 'build.xml'), xml, 'utf8');

        props = props.replace('{{name}}', this.module.name);
        props = props.replace('{{skinnable}}', this.module.yui.module.skinnable);
        
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
        ];
    }
};

util.mix(exports, mods);
