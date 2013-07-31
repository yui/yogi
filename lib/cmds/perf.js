/*jshint maxlen: 300 */

/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var util = require('../util'),
    log = require('../log'),
    git = require('../git'),
    spawn = require('win-spawn'),
    path = require('path'),
    async = require('async'),
    glob = require('glob'),
    mods = {
        help: function help () {
            return [
                'perf',
                'Executes performance tests'
            ];
        },
        init: function init (opts) {
            var options,
                yuiRoot,
                module,
                mod,
                component,
                testpaths;

                options = this.options = opts.parsed;
                yuiRoot = this.yuiRoot = path.join(git.findRoot(), '..');
                module = this.module = util.getPackage(true);
                mod = util.findModule(true);
                component = (options.component || (mod && mod.name));
                testpaths = glob.sync(path.join(yuiRoot, '/src/' + (component ? component : '*') + '/tests/performance/*.js'));

            this.executeTests(testpaths);
        },
        executeTests: function executeTests (testpaths) {
            var options = this.options,
                yuiRoot = this.yuiRoot,
                loglevel = (options.loglevel || 'info'),
                tmp = (options.tmp || false),
                timeout = (options.timeout || 300),
                outdir = (options.outdir || false),
                refs = (options.ref || []),
                wip = (options.working === undefined ? true : options.working),
                cmd = path.resolve(__dirname + '/../../node_modules/.bin/yb'),
                args = [],
                rawpath;

            args = [
                '--repo=' + yuiRoot,
                '--loglevel=' + loglevel,
                '--working=' + wip,
                '--timeout=' + timeout,
                '--phantom=true'
            ];

            if (tmp) {
                args.push('--tmp=' + tmp);
            }

            refs.forEach(function(ref) {
                args.push('--ref=' + ref);
            });

            log.info('Found ' + testpaths.length + ' test file' + (testpaths.length > 1 ? 's' : ''));
            log.debug('Paths: \n' + testpaths.join('\n'));

            async.eachSeries(testpaths, function (testpath, next) {
                var actualArgs = args.concat('--source=' + testpath);

                if (outdir) {
                    rawpath = path.resolve(process.cwd(), outdir, path.basename(testpath).replace(/.js$/, '.json'));
                    actualArgs.push('--raw=' + rawpath);
                }

                log.info('Executing: ' + testpath);
                log.debug('Args: ' + actualArgs.join(' '));

                spawn(cmd, actualArgs, {stdio: 'inherit'}).on('close', next);
            });
        }
    };

util.mix(exports, mods);
