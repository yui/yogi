var log = require('./log'),
    cpr = require('cpr').cpr,
    mkdirp = require('mkdirp'),
    config = require('./config'),
    path = require('path'),
    timethat = require('timethat'),
    fs = require('fs'),
    util = require('./util');


var _defaultDirs = [
    './docs/',
    './tests/',
    './js',
    './meta',
    './css',
    './assets'
];

var createJSON = function(options, callback) {

    var name = options.name,
        build = {
            name: name,
            builds: {}
        },
        meta = {},
        codeFile = path.join(options.location, 'js', name + '.js'),
        skinBase = path.join(options.location, 'assets', name, 'skins', 'sam'),
        file = path.join(options.location, 'build.json'),
        readme = path.join(options.location, 'README.md'),
        history = path.join(options.location, 'HISTORY.md'),
        metaFile = path.join(options.location, 'meta', name + '.json');

    build.builds[name] = {
    };
    meta[name] = {
    };

    switch (options.type) {
        case 'js':
            build.builds[name].jsfiles = [
                'js/' + name + '.js'
            ];
            meta[name].requires = [ 'yui-base' ];
            break;
        case 'css':
            codeFile = path.join(options.location, 'css', name + '.css'),
            build.builds[name].cssfiles = [
                'css/' + name + '.css'
            ];
            meta[name].type = 'css';
            break;
        case 'widget':
            build.builds[name].jsfiles = [
                'js/' + name + '.js'
            ];
            meta[name].requires = [ 'widget' ];
            meta[name].skinnable = true;

            mkdirp.sync(skinBase);
            log.info('creating skin templates');
            fs.writeFileSync(path.join(skinBase, name + '-skin.css'), '\n/**\n Your Code Goes Here\n*/\n', 'utf8');
            fs.writeFileSync(path.join(skinBase, '../../', name + '-core.css'), '\n/**\n Your Code Goes Here\n*/\n', 'utf8');
            break;

    }

    log.debug('creating README file: ' + readme);
    fs.writeFileSync(readme, name + '\n========\n', 'utf8');

    log.debug('creating HISTORY file: ' + history);
    fs.writeFileSync(history, name + '\n========\n', 'utf8');

    
    log.debug('creating code file: ' + codeFile);
    fs.writeFileSync(codeFile, '\n/**\n Your Code Goes Here\n*/\n', 'utf8');

    log.debug('creating build.json file: ' + file);
    fs.writeFileSync(file, JSON.stringify(build, null, 4) + '\n', 'utf8');

    log.debug('creating meta/' + name + '.json file: ' + metaFile);
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 4) + '\n', 'utf8');
    callback();
};


var replaceTitle = function(options, items, callback) {
    var tags = '[ "gallery" ]',
        title = options.name;
        author = config.get('username');

    items.forEach(function(file) {
        var stat = fs.statSync(file), str;
        if (!stat.isDirectory()) {
            log.debug('updating title in ' + file);
            str = fs.readFileSync(file, 'utf8');
            str = str.replace(/\{\{title\}\}/gi, title);
            str = str.replace(/\{\{name\}\}/gi, title);
            str = str.replace(/\{\{summary\}\}/gi, '*Summary Goes Here*');
            str = str.replace(/\{\{description\}\}/gi, '*Module Description Goes Here*');
            str = str.replace(/\{\{tags\}\}/gi, tags);
            str = str.replace(/\{\{author\}\}/gi, author);
            str = str.replace(/\{\{code\}\}/gi, '//Module example code');
            fs.writeFileSync(file, str, 'utf8');
        }
    });
    callback();
};

var createDirs = function(options, callback) {

    log.info('creating default directory structure');
    var stack = new util.Stack(),
        copied = [];

    _defaultDirs.forEach(function(dir) {
        var d = path.join(__dirname, '../defaults/', dir),
            toDir = path.join(options.location, dir);

        if (util.exists(toDir)) {
            log.info('did not create default directory, it exists: ' + toDir);
            return;
        }
        if (util.exists(d)) {
            log.debug('copying dir from ' + d);
            log.debug('to ' + toDir);
            mkdirp(toDir, stack.add(function() {
                cpr(d, toDir, stack.add(function(err, status) {
                    copied = [].concat(copied, status);
                }));
            }));
        } else {
            log.debug('making ' + toDir);
            mkdirp(toDir, stack.add(function() {
            }));
        }
    });
    stack.done(function() {
        log.info('directories created, processing files');
        replaceTitle(options, copied, function() {
            createJSON(options, function() {
                callback();
            });
        });
    });
};

var init = function(options, callback) {
    var start = (new Date()).getTime();
    log.info('creating module (' + options.name + ') in: ' + options.location);
    if (util.exists(options.location)) {
        log.bail('destination already exists, you are on your own! bailing..');
    }
    
    createDirs(options, function() {
        util.tree(options.location, options.root, function(tree) {
            log.log('');
            log.info('module created, here\'s what yogi did for you:');
            log.log('');
            console.log(tree);
            log.info('yogi took ' + timethat.calc(start, new Date().getTime()) + ' to create this module');
            callback();
        });
    });
};

module.exports = {
    init: init,
    createJSON: createJSON,
    createDirs: createDirs
}