const prisma = require("../../../db");
const dbi = require("../dbi");

dbi.register(({ ChatInput, ChatInputOptions }) => {

  ChatInput({
    name: "user-feature delete",
    description: "Delete a user feature.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      await interaction.deferReply({ ephemeral: true });
      const featureId = interaction.options.getInteger("feature-id");
      const feature = await prisma.userFeature.findUnique({
        where: {
          id: featureId,
        }
      });
      if (!feature) {
        await interaction.reply({
          content: "That feature doesn't exist.",
          ephemeral: true
        });
        return;
      }
      await prisma.userFeature.delete({
        where: {
          id: featureId,
        }
      });
      await interaction.editReply({
        content: "Deleted feature.",
        ephemeral: true
      });
    },
    options: [
      ChatInputOptions.integerAutocomplete({
        name: "feature-id",
        description: "The feature ID to delete.",
        required: true,
        onComplete: async ({ interaction, value }) => {
          const feature = await prisma.userFeature.findMany({
            where: {
              id: {
                gte: parseInt(value) || 0,
              },
              user_id: interaction.options.get("user")?.value ?? undefined,
            },
            take: 25,
          });
          return feature.map(f => ({
            name: f.id + " | " + f.type + " | " + f.feature_id,
            value: f.id,
          }));
        },
      }),
      ChatInputOptions.user({
        name: "user",
        description: "The user to delete the feature from.",
        required: false,
      })
    ]
  })

});