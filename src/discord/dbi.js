const { createDBI } = require("@mostfeatured/dbi")

const dbi = createDBI("acord-standalone", {
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    options: {
      intents: ["Guilds", "GuildMembers", "MessageContent", "GuildMessages"]
    },
  },
  strict: true,
  defaults: {
    locale: "en"
  }
});

module.exports = dbi;