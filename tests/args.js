var vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    args = require('../lib/args');

var tests = {
    'should be loaded': {
        topic: function () {
            return args
        },
        'should have parse method': function (topic) {
            assert.isFunction(topic.parse);
        },
        'should have shorts object': function (topic) {
            assert.isObject(topic.shorts);
        },
        'should have known object': function (topic) {
            assert.isObject(topic.known);
        }
    },
    'should parse -h': {
        topic: function() {
            return args.parse(['', '', '-h']);
        },
        'should parse': function(topic) {
            assert.equal(topic.main, 'help');
        }
    },
    'should parse -v': {
        topic: function() {
            return args.parse(['', '', '-v']);
        },
        'should parse': function(topic) {
            assert.equal(topic.main, 'version');
            assert.isTrue(topic.parsed.version);
        }
    },
    'should parse --loglevel warn': {
        topic: function() {
            return args.parse(['', '', '--loglevel', 'warn']);
        },
        'should parse': function(topic) {
            assert.equal(topic.main, 'help');
            assert.equal(topic.parsed.loglevel, 'warn');
        }
    },
    'should parse --debug': {
        topic: function() {
            return args.parse(['', '', '--debug']);
        },
        'should parse': function(topic) {
            assert.equal(topic.main, 'help');
            assert.equal(topic.parsed.loglevel, 'debug');
        }
    },
    'should parse --silent': {
        topic: function() {
            return args.parse(['', '', '--silent']);
        },
        'should parse': function(topic) {
            assert.equal(topic.main, 'help');
            assert.equal(topic.parsed.loglevel, 'silent');
        }
    },
    'should parse -s': {
        topic: function() {
            return args.parse(['', '', '-s']);
        },
        'should parse': function(topic) {
            assert.equal(topic.main, 'help');
            assert.equal(topic.parsed.loglevel, 'silent');
        }
    },
    'should parse --json <path>': {
        topic: function() {
            return args.parse(['', '', '--json', './some/path']);
        },
        'should parse': function(topic) {
            assert.equal(topic.main, 'help');
            assert.equal(topic.parsed.json, path.normalize(path.resolve('./some/path')));
        }
    },
    'should parse --json': {
        topic: function() {
            return args.parse(['', '', '--json']);
        },
        'should parse': function(topic) {
            assert.equal(topic.main, 'help');
            assert.equal(topic.parsed.json, true);
        }
    },
    'should parse --no-json': {
        topic: function() {
            return args.parse(['', '', '--no-json']);
        },
        'should parse': function(topic) {
            assert.equal(topic.main, 'help');
            assert.equal(topic.parsed.json, false);
        }
    },
};

//Dynamic tester, this ensures that the command was parsed correctly
var cmds = Object.keys(require('../lib/cmds'));

cmds.forEach(function(cmd) {
    tests['should return ' + cmd] = {
        topic: (function(cmd) {
            return args.parse(['', '', cmd]);
        }(cmd)),
        'should parse': (function(cmd) {
            return function(topic) {
                assert.equal(topic.main, cmd);
            };
        }(cmd))
    };

    tests['should return ' + cmd + ' with arguments'] = {
        topic: (function(cmd) {
            return args.parse(['', '', cmd, '--loglevel', 'warn']);
        }(cmd)),
        'should parse': (function(cmd) {
            return function(topic) {
                assert.equal(topic.main, cmd);
                assert.equal(topic.parsed.loglevel, 'warn');
            };
        }(cmd))
    };

});

vows.describe('args').addBatch(tests).export(module);

