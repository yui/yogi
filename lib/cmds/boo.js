var log = require('../log');

//Lines borrowed from various Yogi Bear cartoons/films
//They are copyright whoever, not mine!
/*jshint maxlen: 500 */
var lines = [
    log.color('Yogi:', 'white+bold') + " Boo Boo, you've tried to stop my brilliant ideas with common sense a thousand times. Has it ever worked?\n" + log.color('Boo Boo:', 'white+bold') +  'No.\n' + log.color('Yogi:', 'white+bold') + " Then... let's go-go-go!",
    log.color('Yogi:', 'white+bold') + " I'm so smart that it hurts",
    log.color('Yogi:', 'white+bold') + " It's because I'm smarter than the average bear.",
    log.color("Boo Boo:", 'white+bold') + " I have problems with potato salad.",
    log.color('Yogi:', 'white+bold') + " Another golden rule is: don't lose your cool.",
    log.color('Yogi:', 'white+bold') + " I'm smarter than the av-er-age bear!",
    log.color('Yogi:', 'white+bold') + " There two things I learn from stealing pic-a-nic basket: 1 was The Regular mayo is better then light mayo, and 2 never give up on what you want!",
    log.color('Yogi:', 'white+bold') + " Pic-a-nic baskets may be delicious on the lips but they're a lifetime on the hips!"
];

exports.init = function() {
    var index = Math.floor(Math.random() * lines.length) || 0;
    console.log(lines[index]);
};
