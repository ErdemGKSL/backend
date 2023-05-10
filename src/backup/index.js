const dumpToDiscord = require("./dumpToDiscord");

setTimeout(dumpToDiscord, 1000 * 60);
setInterval(dumpToDiscord, 1000 * 60 * 60 * 24);