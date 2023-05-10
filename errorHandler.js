const dbi = require("./src/discord/dbi");

process.on("unhandledRejection", (e, r) => {

  r.catch(async (e) => {

    console.error("[ Rejection ]", e?.stack ?? e);
    dbi.data.clients.first().client.channels.cache.get("1088837324181352490")?.send({
      content: `[Rejection - <t:${Math.floor(Date.now() / 1000)}:f>]` + ("\n```js\n" + (e?.stack ?? e) + "\n```"),
    });

  });

});

process.on("uncaughtException", (e) => {

  console.error("[ Exception ]", e?.stack ?? e);
  dbi.data.clients.first().client.channels.cache.get("1088837324181352490")?.send({
    content: `[Exception - <t:${Math.floor(Date.now() / 1000)}:f>]` + ("\n```js\n" + (e?.stack ?? e) + "\n```"),
  });

});