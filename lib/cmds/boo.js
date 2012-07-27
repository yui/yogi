require('colors');

//Lines borrowed from various Yogi Bear cartoons/films
//They are copyright whoever, not mine!

var lines = [
    'Yogi:'.white.bold + " Boo Boo, you've tried to stop my brilliant ideas with common sense a thousand times. Has it ever worked?\n" + 'Boo Boo:'.white.bold +  'No.\n' + 'Yogi:'.white.bold + " Then... let's go-go-go!",
    'Yogi:'.white.bold + " I'm so smart that it hurts",
    'Yogi:'.white.bold + " It's because I'm smarter than the average bear.",
    "Boo Boo:".white.bold + " I have problems with potato salad.",
    "Yogi:".white.bold + " Another golden rule is: don't lose your cool.",
    "Yogi:".white.bold + " I'm smarter than the av-er-age bear!",
    "Yogi:".white.bold + " There two things I learn from stealing pic-a-nic basket: 1 was The Regular mayo is better then light mayo, and 2 never give up on what you want!",
    "Yogi:".white.bold + " Pic-a-nic baskets may be delicious on the lips but they're a lifetime on the hips!"
];

exports.init = function() {
    var index = Math.floor(Math.random() * lines.length) || 0;
    console.log(lines[index]);
};
