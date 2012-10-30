/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var plural = function(n) {
    return ((n === 0 || n > 1) ? 's' : '');
};

exports.calc = function(start, end) {
    var total = end - start,
        diff = {}, str = '';

    diff.seconds_raw = (total/1000);

    diff.days = Math.floor(total/1000/60/60/24);
    total -= diff.days*1000*60*60*24;

    diff.hours = Math.floor(total/1000/60/60);
    total -= diff.hours*1000*60*60;

    diff.minutes = Math.floor(total/1000/60);
    total -= diff.minutes*1000*60;

    diff.seconds = Math.floor(total/1000);

    if (diff.hours) {
        str = diff.hours + ' hour' + plural(diff.hours) + ', ';
        str += diff.minutes + ' minute' + plural(diff.minutes) + ', ';
        str += diff.seconds + ' second' + plural(diff.seconds);
    } else if (diff.minutes) {
        str = diff.minutes + ' minute' + plural(diff.minutes) + ', ' + diff.seconds + ' second' + plural(diff.seconds);
    } else {
        str = diff.seconds_raw + ' second' + plural(diff.seconds);
    }

    return str;
};

