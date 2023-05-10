require('dotenv').config({
  path: require('path').join(__dirname, '.env')
});
require("./src/discord/publish");