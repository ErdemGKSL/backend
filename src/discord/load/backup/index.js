const dumpToDiscord = require("../../../backup/dumpToDiscord");
const dbi = require("../../dbi");

dbi.register(({ ChatInput }) => {

  ChatInput({
    name: "backup",
    description: "Backup the database",
    defaultMemberPermissions: ["Administrator"],
    onExecute: async ({ interaction }) => {
      await interaction.reply({
        content: "Backing up at <#1105541818453598279>...",
        ephemeral: true,
      });
      try {
        await dumpToDiscord();
      } catch (e) {
        await interaction.editReply({
          content: "Failed to backup",
          ephemeral: true,
        });
        throw e;
      }
    }
  })

});