const dbi = require("../../dbi");
const prisma = require("../../../../db");
const { parseDuration } = require("stuffs");
const formatifyFeatureDurations = require("../../../other/formatifyFeatureDurations");

dbi.register(({ ChatInput, ChatInputOptions, Modal, Button }) => {

  ChatInput({
    name: "profile-music set",
    description: "Set your profile-music.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      await interaction.deferReply({ ephemeral: true });
      const user = interaction.options.getUser("user");
      const music = interaction.options.getString("music");
      const atMs = interaction.options.getInteger("at-ms") ?? 0;
      const volume = interaction.options.getInteger("volume");

      const data = { uri: music, position_ms: atMs, volume_percent: volume };

      await prisma.userFeature.upsert({
        where: {
          unq_user_feature_user_id_type_feature_id: {
            feature_id: -1,
            type: "profile_music",
            user_id: user.id
          },
        },
        create: {
          user: {
            connect: {
              id: user.id
            }
          },
          type: "profile_music",
          feature_id: -1,
          data,
          enabled: false,
        },
        update: {
          data,
        }
      });

      await interaction.editReply({
        content: "Set the music of " + user.username + "'s profile to " + music + ".",
        ephemeral: true
      });
    },
    options: [
      ChatInputOptions.user({
        name: "user",
        description: "The user to set the profile-music for.",
        required: true,
      }),
      ChatInputOptions.string({
        name: "music",
        description: "The music to set the name to. (eg: 'spotify:track:3iWv4AIba6yYvo5QZbFpWa')",
        required: true,
      }),
      ChatInputOptions.integer({
        name: "at-ms",
        description: "The time in milliseconds to start the music at.",
        required: false,
      }),
      ChatInputOptions.integer({
        name: "volume",
        description: "The volume to play the music at.",
        required: false,
      })
    ]
  });

  ChatInput({
    name: "profile-music add-duration",
    description: "Add a duration to a user's profile-music.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      await interaction.deferReply({ ephemeral: true });

      const user = interaction.options.getUser("user");
      // const duration = Math.min(Number.MAX_SAFE_INTEGER, parseDuration(interaction.options.getString("duration")));
      const duration = interaction.options.get("duration")?.value ?
        Math.min(Number.MAX_SAFE_INTEGER, parseDuration(interaction.options.getString("duration")))
        : -1;

      if (!duration || duration < 0) return interaction.reply({
        content: "Invalid duration.",
        ephemeral: true
      });

      const feature = await prisma.userFeature.upsert({
        where: {
          unq_user_feature_user_id_type_feature_id: {
            feature_id: -1,
            type: "profile_music",
            user_id: user.id
          },
        },
        update: {
          durations: {
            create: {
              duration,
            }
          },
          enabled: true,
        },
        create: {
          user: {
            connect: {
              id: user.id
            }
          },
          type: "profile_music",
          feature_id: -1,
          data: {
            uri: "spotify:track:3iWv4AIba6yYvo5QZbFpWa",
            position_ms: 0,
            volume_percent: null,
          },
          enabled: true,
          durations: {
            create: {
              duration,
            }
          }
        }
      });

      await formatifyFeatureDurations({
        userFeatureId: feature.id,
      });

      await interaction.editReply({
        content: "Added a duration of <t:" + Math.floor((duration + Date.now()) / 1000) + ":R> to <@" + user.id + ">'s name.",
        ephemeral: true
      });
    },
    options: [
      ChatInputOptions.user({
        name: "user",
        description: "The user to add the duration to.",
        required: true,
      }),
      ChatInputOptions.string({
        name: "duration",
        description: "The duration to add to the user's profile music. (eg: '1d 2h 3m 4s')",
        required: false,
      }),
    ]
  });

});