const dbi = require("../../dbi");
const { ButtonStyle } = require("discord.js");
dbi.register(({ ChatInput, Button }) => {

  ChatInput({
    name: "ticket",
    description: "Create a ticket",
    defaultMemberPermissions: ["Administrator"],
    onExecute: async ({ interaction, client }) => {
      interaction.channel.send({
        content: `:flag_tr: Ticket oluşturmaki için alttaki butona basınız.\n:flag_gb: Click the button below to create a ticket.`,
        components: [
          {
            type:1,
            components: [dbi.interaction("ticket-create").toJSON()]
          }
        ]
      })
    },
  });

  Button({
    name: "ticket-create",
    onExecute: async ({ interaction, client }) => {
      /** @type {import("discord.js").BaseGuildTextChannel} */
      const channel = interaction.channel;
      if (channel.threads.cache.find((thread) => thread.name?.endsWith(interaction.user.id) && !thread.archived && !thread.locked)) return interaction.reply({ content: "You already have a ticket open!", ephemeral: true });
      const ticket = await channel.threads.create({
        name: `ticket-${interaction.user.username}-${interaction.user.id}`,
      });

      await interaction.deferReply({ ephemeral: true });

      const members = [interaction.user.id, "943861275203612673", "319862027571036161", "707309693449535599"];

      for (const member of members) {
        await ticket.members.add(member);
      }

      await interaction.editReply({ content: `Created a ticket! ${ticket}`, ephemeral: true });
    },
    options: {
      style: ButtonStyle.Primary,
      emoji: "🎟️",
      label: "Create a ticket",
    }
  });

});