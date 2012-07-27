var util = require('../util'),
    log = require('../log'),
    path = require('path'),
    spawn = require('child_process').exec,
    predef = [
        "YUI", "window", "YUI_config", "YAHOO", "YAHOO_config", "Event",
        "opera", "exports", "document", "navigator", "console", "self", "require",
        "module", "process", "__dirname", "__filename"
    ];

var mods = {
    init: function(options) {
        this.dir = util.findModule(true).dir;
        this.root = path.join(__dirname, '../../node_modules/.bin');
        if (util.exists(path.join(this.dir, 'js'))) {
            this.jslint();
        }
    },
    args: [
        '--color',
        '--browser',
        '--undef', 
        '--newcap',
        '--predef "' + predef.join(',') + '"',
        '--white',
        '--nomen', 
        '--sloppy',
        '--plusplus',
        '--regexp',
        '--todo',
        '--continue'
    ],
    jslint: function() {
        log.info('running jslint');
        var cmd = path.join(this.root, 'jslint');
        var args = this.args;
        args.push(path.join('./js/' + '*.js'));

        log.debug(cmd + ' ' + args.join(' '));
        spawn(cmd + ' ' + args.join(' '), {
            cwd: this.dir
        },function(err, stdout) {
            process.stdout.write(stdout);
        });
        
    },
    help: function() {
        return [
            'lint',
            'lint your files'
        ]
    }
};

util.mix(exports, mods);
