const dbi = require("../../dbi");
const prisma = require("../../../../db");
const { parseDuration } = require("stuffs");
const formatifyFeatureDurations = require("../../../other/formatifyFeatureDurations");

dbi.register(({ ChatInput, ChatInputOptions, Modal, Button }) => {

  // ChatInput({
  //   name: "name fonts add-duration",
  //   description: "Add a duration to a user's name.",
  //   defaultMemberPermissions: ["Administrator"],
  //   async onExecute({ interaction }) {

  //     await interaction.deferReply({ ephemeral: true });

  //     const user = interaction.options.getUser("user");
  //     const duration = Math.min(Number.MAX_SAFE_INTEGER, parseDuration(interaction.options.getString("duration")));

  //     if (!duration || duration < 0) return interaction.reply({
  //       content: "Invalid duration.",
  //       ephemeral: true
  //     });

  //     const feature = await prisma.userFeature.update({
  //       where: {
  //         unq_user_feature_user_id_type_feature_id: {
  //           feature_id: -1,
  //           type: "fonted_name",
  //           user_id: user.id
  //         },
  //       },
  //       data: {
  //         durations: {
  //           create: {
  //             duration,
  //           }
  //         },
  //         enabled: true,
  //       }
  //     });

  //     await formatifyFeatureDurations({
  //       userFeatureId: feature.id,
  //     });

  //     await interaction.editReply({
  //       content: "Added a duration of <t:" + Math.floor((duration + Date.now()) / 1000) + ":R> to <@" + user.id + ">'s name.",
  //       ephemeral: true
  //     });
  //   },
  //   options: [
  //     ChatInputOptions.user({
  //       name: "user",
  //       description: "The user to add the duration to.",
  //       required: true,
  //     }),
  //     ChatInputOptions.string({
  //       name: "duration",
  //       description: "The duration to add to the user's name. (eg: '1d 2h 3m 4s')",
  //       required: true,
  //     }),
  //   ]
  // });

});