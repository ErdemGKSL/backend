const prisma = require("../../../../db");
const dbi = require("../../dbi");
const { ButtonStyle } = require("discord.js");
const { parseDuration } = require("stuffs");
const formatifyFeatureDurations = require("../../../other/formatifyFeatureDurations");
dbi.register(({ ChatInput, ChatInputOptions, Modal, Button }) => {
  const hatFinderOption = ChatInputOptions.integerAutocomplete({
    name: "hat",
    description: "The hat to edit.",
    required: true,
    onComplete: async ({ value }) => {
      const hat = await prisma.hat.findMany({
        where: {
          name: {
            contains: value
          }
        },
        select: {
          id: true,
          name: true
        },
        take: 20
      });

      return hat.map(hat => ({
        name: hat.name,
        value: hat.id
      }));
    },
  });

  ChatInput({
    name: "hat create",
    description: "Create a hat.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const hat = await prisma.hat.create({
        data: {
          name: interaction.options.getString("name"),
          display_name: interaction.options.getString("name"),
          image: "https://i.imgur.com/yGaHP90.png"
        }
      });

      await interaction.deferReply({ ephemeral: true });
      interaction.editReply(await getHatManager(hat.id));
    },
    options: [
      ChatInputOptions.string({
        name: "name",
        description: "The name of the hat.",
        required: true,
      }),
    ]
  });

  Button({
    name: "hat:edit",
    async onExecute({ interaction, data }) {
      const [hatId, key] = data;

      const hat = await prisma.hat.findUnique({
        where: {
          id: hatId
        },
        select: {
          [key]: true
        }
      }).catch(console.log);

      const naming = {
        display_name: "Display Name",
        name: "Name",
        image: "Image"
      }

      await interaction.showModal(dbi.interaction("hat:edit:modal").toJSON({
        reference: {
          data: [hatId, key]
        },
        overrides: {
          components: [
            {
              components: [
                {
                  value: hat[key],
                  label: naming[key]
                }
              ]
            }
          ]
        }
      }));
    },
    options: {
      style: ButtonStyle.Primary,
      label: "Edit",
      disabled: false
    }
  });

  Modal({
    name: "hat:edit:modal",
    async onExecute({ interaction, data }) {
      const [hatId, key] = data;
      const value = interaction.fields.getTextInputValue("hat:edit:input");
      await interaction.deferUpdate();
      await prisma.hat.update({
        where: {
          id: hatId
        },
        data: {
          [key]: value
        }
      });

      interaction.editReply(await getHatManager(hatId));
    },
    options: {
      title: "Edit Hat",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              customId: "hat:edit:input",
              placeholder: "Display Name",
              style: 1,
              label: "Display Name",
              required: true,
            }
          ]
        }
      ]
    }
  });

  ChatInput({
    name: "hat edit",
    description: "Edit a hat.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const hatId = interaction.options.getInteger("hat");
      await interaction.deferReply({ ephemeral: true });
      const hat = await prisma.hat.findUnique({
        where: {
          id: hatId
        }
      });
      if (!hat) return interaction.editReply("Hat not found.");
      interaction.editReply(await getHatManager(hatId));
    },
    options: [
      hatFinderOption
    ]
  });

  ChatInput({
    name: "hat assign",
    description: "Assign a hat to a user.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const hatId = interaction.options.getInteger("hat");
      const duration = interaction.options.get("duration")?.value ?
        Math.min(Number.MAX_SAFE_INTEGER, parseDuration(interaction.options.getString("duration")))
        : -1;

      if (!duration || duration < 0) return interaction.reply({
        content: "Invalid duration.",
        ephemeral: true
      });

      const user = interaction.options.getUser("user");

      await prisma.userFeature.updateMany({
        where: {
          user_id: user.id,
          type: "hat"
        },
        data: {
          enabled: false
        }
      });

      const userFeature = await prisma.userFeature.upsert({
        where: {
          unq_user_feature_user_id_type_feature_id: {
            user_id: user.id,
            feature_id: hatId,
            type: "hat"
          },
        },
        create: {
          user: {
            connect: {
              id: user.id
            }
          },
          type: "hat",
          feature_id: hatId,
          // durations: {
          //   create: {
          //     duration,
          //   }
          // }
        },
        update: {
          // durations: {
          //   create: {
          //     duration,
          //   }
          // }
        }
      });

      await prisma.featureDuration.create({
        data: {
          user_feature: {
            connect: {
              id: userFeature.id
            }
          },
          duration
        }
      });

      await formatifyFeatureDurations({
        userFeatureId: userFeature.id,
      });

      await interaction.reply({
        content: `Assigned hat to ${user.tag}.`,
        ephemeral: true
      });
    },
    options: [
      ChatInputOptions.user({
        name: "user",
        description: "The user to assign the hat to.",
        required: true,
      }),
      hatFinderOption,
      ChatInputOptions.string({
        name: "duration",
        description: "The duration of the hat. ex: (10m, 1h)",
        required: false,
        minLength: 2,
        maxLength: 10,
      }),
    ]
  });

  async function getHatManager(hatId) {

    const hat = await prisma.hat.findUnique({
      where: {
        id: hatId
      }
    });

    return {
      embeds: [{
        title: hat.display_name,
        description: hat.name,
        fields: [{
          name: "Image",
          value: hat.image
        }],
        thumbnail: { url: hat.image },
      }],
      components: [{
        type: 1,
        components: [
          dbi.interaction("hat:edit").toJSON({
            overrides: {
              style: ButtonStyle.Primary,
              label: "Edit Display Name",
              disabled: false
            },
            reference: {
              data: [hatId, "display_name"]
            }
          }),
          dbi.interaction("hat:edit").toJSON({
            overrides: {
              style: ButtonStyle.Primary,
              label: "Edit Image",
              disabled: false
            },
            reference: {
              data: [hatId, "image"]
            }
          })
        ]
      }]
    }
  };

  ChatInput({
    name: "hat un-assign",
    description: "Un-assign a hat from a user.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const hatId = interaction.options.getInteger("hat");
      const user = interaction.options.getUser("user");

      await interaction.deferReply({ ephemeral: true });

      const userFeature = await prisma.userFeature.findUnique({
        where: {
          unq_user_feature_user_id_type_feature_id: {
            user_id: user.id,
            feature_id: hatId,
            type: "hat"
          }
        }
      });

      if (!userFeature) return interaction.editReply({
        content: "User does not have that hat.",
        ephemeral: true
      });

      await prisma.userFeature.delete({
        where: {
          id: userFeature.id
        }
      });

      await interaction.editReply({
        content: `Un-assigned hat from ${user.tag}.`,
        ephemeral: true
      });
    },
    options: [
      ChatInputOptions.user({
        name: "user",
        description: "The user to un-assign the hat from.",
        required: true,
      }),
      hatFinderOption,
    ]
  });

  ChatInput({
    name: "hat delete",
    description: "Delete a hat.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const hatId = interaction.options.getInteger("hat");

      await interaction.deferReply({ ephemeral: true });

      const hat = await prisma.hat.findUnique({
        where: {
          id: hatId
        }
      });

      if (!hat) return interaction.editReply({
        content: "Hat not found.",
        ephemeral: true
      });

      await prisma.hat.delete({
        where: {
          id: hatId
        }
      });

      await prisma.userFeature.deleteMany({
        where: {
          feature_id: hatId,
          type: "hat"
        }
      });

      await interaction.editReply({
        content: `Deleted hat ${hat.name}.`,
        ephemeral: true
      });
    },
    options: [
      hatFinderOption
    ]
  });

});