const dbi = require("../discord/dbi");
const path = require("path");
const saveBackup = require("./saveBackup");
const fs = require("fs")

module.exports = async function dumpToDiscord() {
  const client = dbi.data.clients.first().client;
  const channel = client.channels.cache.get("1105541818453598279");
  if (!channel) throw new Error("Channel not found at dump to discord");

  const backupPath = path.resolve(__dirname, "./backup.sql");

  await saveBackup(backupPath);

  await channel.send({
    files: [{
      attachment: backupPath,
      name: "backup.sql"
    }]
  });

  await fs.promises.unlink(backupPath);
}