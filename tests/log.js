var vows = require('vows'),
    assert = require('assert'),
    log = require('../lib/log');

vows.describe('log').addBatch({
    'Should be loaded': {
        topic: function () {
            return log
        },
        'should have log method': function (topic) {
            assert.isFunction(topic.log);
        },
        'should have info method': function (topic) {
            assert.isFunction(topic.info);
        },
        'should have debug method': function (topic) {
            assert.isFunction(topic.debug);
        },
        'should have warn method': function (topic) {
            assert.isFunction(topic.warn);
        },
        'should have error method': function (topic) {
            assert.isFunction(topic.error);
        },
        'should have bail method': function (topic) {
            assert.isFunction(topic.bail);
        },
    }
}).export(module);

