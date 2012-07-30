var vows = require('vows'),
    assert = require('assert'),
    config = require('../lib/config');

config.save = function() {}; //noop so we don't write files

vows.describe('config').addBatch({
    'Should be loaded': {
        topic: function () {
            return config
        },
        'should have set method': function (topic) {
            assert.isFunction(topic.set);
        },
        'should have get method': function (topic) {
            assert.isFunction(topic.get);
        },
        'should have delete method': function (topic) {
            assert.isFunction(topic.delete);
        },
        'should have load method': function (topic) {
            assert.isFunction(topic.load);
        },
        'should have list method': function (topic) {
            assert.isFunction(topic.list);
        }
    },
    'testing actions':  {
        topic: function() {
            return config
        },
        'should have defaults': function(topic) {
            assert.equal('', topic.config.username);
            assert.equal('', topic.config.token);
            assert.equal('yuilibrary.com', topic.config.apiHost);
        },
        'should get defaults': function(topic) {
            assert.equal('', topic.get('username'));
            assert.equal('', topic.get('token'));
            assert.equal('yuilibrary.com', topic.get('apiHost'));
        },
        'should get/set value': function(topic) {
            topic.set('username', 'foobar');
            assert.equal('foobar', topic.get('username'));
        },
        'should delete value': function(topic) {
            topic.delete('username');
            assert.isUndefined(topic.get('username'));
        }
    }
}).export(module);

