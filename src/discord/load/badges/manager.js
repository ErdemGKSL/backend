const prisma = require("../../../../db");
const dbi = require("../../dbi");
const { ButtonStyle } = require("discord.js");
const { parseDuration } = require("stuffs");
const formatifyFeatureDurations = require("../../../other/formatifyFeatureDurations");
dbi.register(({ ChatInput, ChatInputOptions, Modal, Button }) => {
  const badgeFinderOption = ChatInputOptions.integerAutocomplete({
    name: "badge",
    description: "The badge to edit.",
    required: true,
    onComplete: async ({ value }) => {
      const badge = await prisma.badge.findMany({
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

      return badge.map(badge => ({
        name: badge.name,
        value: badge.id
      }));
    },
  });

  ChatInput({
    name: "badge create",
    description: "Create a badge.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const badge = await prisma.badge.create({
        data: {
          name: interaction.options.getString("name"),
          display_name: interaction.options.getString("name"),
          image: "https://raw.githubusercontent.com/acord-standalone/assets/main/badges/member.svg"
        }
      });

      await interaction.deferReply({ ephemeral: true });
      interaction.editReply(await getBadgeManager(badge.id));
    },
    options: [
      ChatInputOptions.string({
        name: "name",
        description: "The name of the badge.",
        required: true,
      }),
    ]
  });

  Button({
    name: "badge:edit",
    async onExecute({ interaction, data }) {
      const [badgeId, key] = data;

      const badge = await prisma.badge.findUnique({
        where: {
          id: badgeId
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

      await interaction.showModal(dbi.interaction("badge:edit:modal").toJSON({
        reference: {
          data: [badgeId, key]
        },
        overrides: {
          components: [
            {
              components: [
                {
                  value: badge[key],
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
    name: "badge:edit:modal",
    async onExecute({ interaction, data }) {
      const [badgeId, key] = data;
      const value = interaction.fields.getTextInputValue("badge:edit:input");
      await interaction.deferUpdate();
      await prisma.badge.update({
        where: {
          id: badgeId
        },
        data: {
          [key]: value
        }
      });

      interaction.editReply(await getBadgeManager(badgeId));
    },
    options: {
      title: "Edit Badge",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              customId: "badge:edit:input",
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
    name: "badge edit",
    description: "Edit a badge.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const badgeId = interaction.options.getInteger("badge");
      await interaction.deferReply({ ephemeral: true });
      const badge = await prisma.badge.findUnique({
        where: {
          id: badgeId
        }
      });
      if (!badge) return interaction.editReply("Badge not found.");
      interaction.editReply(await getBadgeManager(badgeId));
    },
    options: [
      badgeFinderOption
    ]
  });

  ChatInput({
    name: "badge assign",
    description: "Assign a badge to a user.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const badgeId = interaction.options.getInteger("badge");
      const duration = interaction.options.get("duration")?.value ?
        Math.min(Number.MAX_SAFE_INTEGER, parseDuration(interaction.options.getString("duration")))
        : -1;

      if (!duration || duration < 0) return interaction.reply({
        content: "Invalid duration.",
        ephemeral: true
      });

      const user = interaction.options.getUser("user");


      // const featureDuration = await prisma.featureDuration.create({
      //   data: {
      //     user_feature: {
      //       connectOrCreate: {
      //         where: {
      //           unq_user_feature_user_id_type_feature_id: {
      //             user_id: user.id,
      //             feature_id: badgeId,
      //             type: "badge"
      //           }
      //         },
      //         create: {
      //           user: {
      //             connect: {
      //               id: user.id
      //             }
      //           },
      //           type: "badge",
      //           feature_id: badgeId,
      //         }
      //       }
      //     },
      //     duration: duration,
      //   },
      //   select: {
      //     user_feature_id: true,
      //   }
      // });

      const userFeature = await prisma.userFeature.upsert({
        where: {
          unq_user_feature_user_id_type_feature_id: {
            user_id: user.id,
            feature_id: badgeId,
            type: "badge"
          },
        },
        create: {
          user: {
            connect: {
              id: user.id
            }
          },
          type: "badge",
          feature_id: badgeId,
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
        content: `Assigned badge to ${user.tag}.`,
        ephemeral: true
      });
    },
    options: [
      ChatInputOptions.user({
        name: "user",
        description: "The user to assign the badge to.",
        required: true,
      }),
      badgeFinderOption,
      ChatInputOptions.string({
        name: "duration",
        description: "The duration of the badge. ex: (10m, 1h)",
        required: false,
        minLength: 2,
        maxLength: 10,
      }),
    ]
  });

  async function getBadgeManager(badgeId) {

    const badge = await prisma.badge.findUnique({
      where: {
        id: badgeId
      }
    });

    return {
      embeds: [{
        title: badge.display_name,
        description: badge.name,
        fields: [{
          name: "Image",
          value: badge.image
        }],
        thumbnail: { url: badge.image },
      }],
      components: [{
        type: 1,
        components: [
          dbi.interaction("badge:edit").toJSON({
            overrides: {
              style: ButtonStyle.Primary,
              label: "Edit Display Name",
              disabled: false
            },
            reference: {
              data: [badgeId, "display_name"]
            }
          }),
          dbi.interaction("badge:edit").toJSON({
            overrides: {
              style: ButtonStyle.Primary,
              label: "Edit Image",
              disabled: false
            },
            reference: {
              data: [badgeId, "image"]
            }
          })
        ]
      }]
    }
  };

  ChatInput({
    name: "badge role-connection toggle",
    description: "Toggle a badge role connection.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const badgeId = interaction.options.getInteger("badge");
      const role = interaction.options.getRole("role");

      await interaction.deferReply({ ephemeral: true });

      const badgeRoleConnection = await prisma.badgeRoleConnection.findUnique({
        where: {
          unq_badge_role_connection_role_id_badge_id: {
            badge_id: badgeId,
            role_id: role.id
          }
        }
      });

      if (badgeRoleConnection) {
        await prisma.badgeRoleConnection.delete({
          where: {
            unq_badge_role_connection_role_id_badge_id: {
              badge_id: badgeId,
              role_id: role.id
            }
          }
        });
        await interaction.editReply(`Badge role connection deleted.`);
      } else {
        await prisma.badgeRoleConnection.create({
          data: {
            badge: {
              connect: {
                id: badgeId
              }
            },
            role_id: role.id
          }
        });
        await interaction.editReply(`Badge role connection created.`);
      }
    },
    options: [
      badgeFinderOption,
      ChatInputOptions.role({
        name: "role",
        description: "The role to connect to the badge.",
        required: true,
      })
    ]
  });

  ChatInput({
    name: "badge un-assign",
    description: "Un-assign a badge from a user.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const badgeId = interaction.options.getInteger("badge");
      const user = interaction.options.getUser("user");

      await interaction.deferReply({ ephemeral: true });

      const userFeature = await prisma.userFeature.findUnique({
        where: {
          unq_user_feature_user_id_type_feature_id: {
            user_id: user.id,
            feature_id: badgeId,
            type: "badge"
          }
        }
      });

      if (!userFeature) return interaction.editReply({
        content: "User does not have that badge.",
        ephemeral: true
      });

      await prisma.userFeature.delete({
        where: {
          id: userFeature.id
        }
      });

      await interaction.editReply({
        content: `Un-assigned badge from ${user.tag}.`,
        ephemeral: true
      });
    },
    options: [
      ChatInputOptions.user({
        name: "user",
        description: "The user to un-assign the badge from.",
        required: true,
      }),
      badgeFinderOption,
    ]
  });

  ChatInput({
    name: "badge delete",
    description: "Delete a badge.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const badgeId = interaction.options.getInteger("badge");

      await interaction.deferReply({ ephemeral: true });

      const badge = await prisma.badge.findUnique({
        where: {
          id: badgeId
        }
      });

      if (!badge) return interaction.editReply({
        content: "Badge does not exist.",
        ephemeral: true
      });

      await prisma.badge.delete({
        where: {
          id: badgeId
        }
      });

      await prisma.userFeature.deleteMany({
        where: {
          feature_id: badgeId,
          type: "badge",
        }
      });

      await interaction.editReply({
        content: `Deleted badge.`,
        ephemeral: true
      });
    },
    options: [
      badgeFinderOption,
    ]
  })

});