const { pgDump, FormatEnum } = require("pg-dump-restore");
const fs = require("fs");
module.exports = async function saveBackup(backupPath) {

  const url = process.env.DATABASE_URL;

  const [_, username, password, host, port, database] = url.match(/postgresql:\/\/(.*?):(.*?)@(.*?):(.*?)\/(.*?)$/);

  try { await fs.promises.unlink(backupPath); } catch { }

  await pgDump(
    {
      port, // defaults to 5432
      host,
      database,
      username,
      password,
    },
    {
      filePath: backupPath,
      format: FormatEnum.Plain
    }
  );
}