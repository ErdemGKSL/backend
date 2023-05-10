const dbi = require("../../dbi");
const prisma = require("../../../../db");
const { parseDuration } = require("stuffs");
const formatifyFeatureDurations = require("../../../other/formatifyFeatureDurations");

dbi.register(({ ChatInput, ChatInputOptions, Modal, Button }) => {

  ChatInput({
    name: "name color set",
    description: "Set your name color.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      await interaction.deferReply({ ephemeral: true });
      const user = interaction.options.getUser("user");
      const points = interaction.options.getString("color")?.split(",").map(color => {
        const [hex, percentage] = color.split(";");
        return {
          color: hex,
          percentage: percentage ? parseFloat(percentage) : null
        };
      });
      const angle = (interaction.options.getInteger("angle") ?? 90) + "deg";
      const type = interaction.options.getString("type") ?? "linear";

      // const name = await prisma.userFeature.findUnique({
      //   where: {
      //     unq_user_feature_user_id_type_feature_id: {
      //       feature_id: -1,
      //       type: "colored_name",
      //       user_id: user.id
      //     }
      //   }
      // });

      // if (!name) {
      //   await interaction.reply({
      //     content: "That user doesn't have a custom name.",
      //     ephemeral: true
      //   });
      //   return;
      // }

      const data = { points, angle, type, max_points: points.length };

      await prisma.userFeature.upsert({
        where: {
          unq_user_feature_user_id_type_feature_id: {
            feature_id: -1,
            type: "colored_name",
            user_id: user.id
          },
        },
        create: {
          user: {
            connect: {
              id: user.id
            }
          },
          type: "colored_name",
          feature_id: -1,
          data,
          enabled: false,
        },
        update: {
          data,
        }
      });

      await interaction.editReply({
        content: "Set the color of " + user.username + "'s name to " + JSON.stringify(points) + ".",
        ephemeral: true
      });
    },
    options: [
      ChatInputOptions.user({
        name: "user",
        description: "The user to set the name color for.",
        required: true,
      }),
      ChatInputOptions.string({
        name: "color",
        description: "The color to set the name to. (eg: '#ff0000;10%,#00ff00;90%')",
        required: true,
      }),
      ChatInputOptions.integer({
        name: "angle",
        description: "The angle of the gradient.",
        required: false,
        minValue: 0,
        maxValue: 360
      }),
      ChatInputOptions.stringChoices({
        name: "type",
        description: "The type of gradient. (eg: 'linear', 'radial')",
        required: false,
        choices: [
          {
            name: "Linear",
            value: "linear"
          },
          {
            name: "Radial",
            value: "radial"
          }
        ]
      }),
    ]
  });

  ChatInput({
    name: "name color add-duration",
    description: "Add a duration to a user's name.",
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
            type: "colored_name",
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
          type: "colored_name",
          feature_id: -1,
          data: {
            points: [{
              color: "#ff00ff",
              percentage: 100
            }],
            angle: "0deg",
            type: "linear"
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
        description: "The duration to add to the user's name. (eg: '1d 2h 3m 4s')",
        required: false,
      }),
    ]
  });

});