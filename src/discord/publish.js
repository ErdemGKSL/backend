const { Utils: { recursiveImport } } = require("@mostfeatured/dbi");
const dbi = require("./dbi");
const path = require("path");

(async () => {
  await recursiveImport(path.join(__dirname, "./load"));
  await dbi.load();
  await dbi.publish("Guild", process.env.DISCORD_GUILD_ID);
  await dbi.unload();
  console.log("Published guild.")
  process.exit(0);
})();