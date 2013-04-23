#!/usr/bin/env node

var path = require('path'),
    http = require('http'),
    fs = require('fs'),
    package = require(path.join(__dirname, '../', 'package.json')),
    version = package.version,
    doc = path.join(__dirname, '../', 'conf', 'docs', 'project.json'),
    selleck = path.join(__dirname, '../', 'configs', 'selleck', 'project.json'),
    yuidoc = path.join(__dirname, '../', 'configs', 'yuidoc', 'yuidoc.json');

console.log('[version]', version);
console.log('[doc]', doc);

var docJSON = require(doc);

docJSON.version = version;

fs.writeFileSync(doc, JSON.stringify(docJSON, null, 2));

console.log('[fetch] latest YUI version');

http.get({
    hostname: 'yuilibrary.com',
    path: '/api/v1/version'
}, function(res) {
    var data = '';

    res.on('data', function(d) {
        data += d;
    });

    res.on('end', function() {
        var version = JSON.parse(data).version;
        console.log('[yui]', version);
        console.log('[selleck]', selleck);
        var json = require(selleck);
        json.yuiVersion = version;
        fs.writeFileSync(selleck, JSON.stringify(json, null, 4) + '\n');

        console.log('[yuidoc]', yuidoc);
        var json = require(yuidoc);
        json.version = version;
        fs.writeFileSync(yuidoc, JSON.stringify(json, null, 4) + '\n');
        console.log('[done]');
    });
});

