const { Utils: { recursiveImport } } = require("@mostfeatured/dbi");
const dbi = require("./dbi");
const path = require("path");

(async () => {
  await recursiveImport(path.join(__dirname, "./load"));
  await dbi.load();
  await dbi.login();
  console.log("Discord bot is ready.")
})();