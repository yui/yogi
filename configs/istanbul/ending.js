(function () {
    if (window.YOGI) {
        return;
    }
    window.YOGI = true;
    var timer;
    var check = function() {
        return (typeof YUI !== 'undefined ' && typeof YUITest !== 'undefined' && typeof YUITest.TestRunner !== 'undefined');
    };
    var waitForIt = function(callback) {
        if (timer) {
            clearTimeout(timer);
        }
        if (check()) {
            callback();
        } else {
            timer = setTimeout(function() {
                waitForIt(callback);
            }, 100);
        }
    };
    var waitForResults = function(callback) {
        
        if (YUITest.TestRunner.getResults() !== null) {
            callback();
        } else {
            timer = setTimeout(function() {
                waitForResults(callback);
            }, 100);
        }
    };

    waitForIt(function() {
        waitForResults(function() {
            YUI().use('io-base', 'json', function(Y) {
                Y.io('/tests/results', {
                    method: 'POST',
                    data: Y.JSON.stringify(__coverage__),
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    on: {
                        complete: function(id, e) {
                            var data = Y.JSON.parse(e.responseText);
                            location.href = data.redirect;
                        }
                    }
                });
            });
        });
    });
}());
