YUI().use('jsonp', 'node', function(Y) {
    var status = Y.one('#status .version'),
        gstatus = Y.one('#status .gallery'),
        cstatus = Y.one('#status .cdn');

    Y.jsonp('http://yuilibrary.com/api/v1/version?callback={callback}', function(o) {
        if (o && o.version) {
            status.setHTML('Current YUI Version: ' + o.version);
        }
    });

    Y.jsonp('http://yuilibrary.com/api/v1/cdn/buildtag?callback={callback}', function(o) {
        if (o && o.buildtag) {
            gstatus.setHTML('Current Gallery Version: ' + o.buildtag);
        }
    });

    Y.jsonp('http://yuilibrary.com/api/v1/cdn/window?callback={callback}', function(o) {
        if (o) {
            var stamp = new Date(o.stamp);
            stamp.setHours(stamp.getHours() + getDSTOffset());
            var html = 'next cdn deployment window is ' + stamp.toLocaleString();
            cstatus.setHTML(html);
        }
    });



    var getDSTOffset = function() {
        var start = new Date(),
            year = start.getFullYear(),
            jan = new Date(year, 0);   // January 1
            jul = new Date(year, 6);   // July 1

        // northern hemisphere test
        if (jan.getTimezoneOffset() > jul.getTimezoneOffset() && start.getTimezoneOffset() !== jan.getTimezoneOffset()) {
            return -1;
        }
        // southern hemisphere test
        if (jan.getTimezoneOffset() < jul.getTimezoneOffset() && start.getTimezoneOffset() !== jul.getTimezoneOffset()) {
            return -1;
        }
        // if we reach this point, DST is not in effect on the client computer.
        return 0;
    };

    
});
