const prisma = require("../../../../db");
const dbi = require("../../dbi");
const { FeatureType, Prisma, ViewType } = require("@prisma/client");
const { parseDuration } = require("stuffs")

dbi.register(({ ChatInput, ChatInputOptions }) => {

  const storeItemFinder = (required = true) => ChatInputOptions.integerAutocomplete({
    name: "store-item",
    description: "The store item to create.",
    required,
    minValue: 0,
    async onComplete({ interaction, value }) {
      const items = await prisma.storeItem.findMany({
        where: {
          name: {
            contains: value,
          }
        },
        take: 25,
        select: {
          name: true,
          id: true,
        }
      });
      return items.map((e) => ({
        name: e.name,
        value: e.id,
      }));
    },
  })

  ChatInput({
    name: "store item create",
    description: "Creates a store item.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const name = interaction.options.get("name")?.value;
      const image = interaction.options.get("image")?.value;
      const price = interaction.options.get("price")?.value;
      const featureType = interaction.options.get("feature-type")?.value;
      const featureId = interaction.options.get("feature-id")?.value;
      const duration = interaction.options.get("duration")?.value ?
        Math.min(Number.MAX_SAFE_INTEGER, parseDuration(interaction.options.getString("duration")))
        : -1;
      const extra = JSON.parse(interaction.options.get("extra")?.value ?? "{}");

      await interaction.deferReply();

      // const exists = await prisma.storeItem.findUnique({
      //   where: {
      //     unq_market_item_feature_type_feature_id: {
      //       feature_id: featureId,
      //       feature_type: featureType,
      //     }
      //   }
      // });

      // if (exists) {
      //   return interaction.editReply({
      //     content: "A store item with this feature ID and feature type already exists.",
      //   });
      // }

      const item = await prisma.storeItem.create({
        data: {
          name,
          image: [image],
          price: new Prisma.Decimal(price),
          feature_type: featureType,
          feature_id: featureId,
          data: {
            duration,
            extra,
          }
        }
      });

      interaction.editReply({
        content: `Created store item ${item.name} with ID ${item.id}.`,
        ephemeral: true,
      });
    },
    options: [
      ChatInputOptions.string({
        name: "name",
        description: "The name of the store item.",
        required: true,
        minLength: 2,
        maxLength: 64,
      }),
      ChatInputOptions.string({
        name: "image",
        description: "The image of the store item.",
        required: true,
        minLength: 2,
        maxLength: 256,
      }),
      ChatInputOptions.number({
        name: "price",
        description: "The price of the store item in USD.",
        required: true,
        minValue: 0.0001,
        maxValue: 999999999999.9999,
      }),
      ChatInputOptions.stringChoices({
        name: "feature-type",
        description: "The feature type of the store item.",
        required: true,
        choices: Object.values(FeatureType).map((e) => ({
          name: e,
          value: e,
        })),
      }),
      ChatInputOptions.integerAutocomplete({
        name: "feature-id",
        description: "The feature ID of the store item.",
        required: true,
        minValue: 0,
        async onComplete({ interaction, value }) {
          const type = interaction.options.get("feature-type")?.value;
          if (!type) return [];
          switch (type) {
            case FeatureType.badge: {
              const badges = await prisma.badge.findMany({
                where: {
                  name: {
                    contains: value,
                  }
                },
                take: 25,
                select: {
                  name: true,
                  id: true,
                }
              });
              return badges.map((e) => ({
                name: e.name,
                value: e.id,
              }));
            }
            case FeatureType.hat: {
              const hats = await prisma.hat.findMany({
                where: {
                  name: {
                    contains: value,
                  }
                },
                take: 25,
                select: {
                  name: true,
                  id: true,
                }
              });
              return hats.map((e) => ({
                name: e.name,
                value: e.id,
              }));
            }
            default: {
              return [{
                name: "Default",
                value: 0,
              }]
            }
          }
        },

      }),
      ChatInputOptions.string({
        name: "duration",
        description: "The duration of the store item. (ex: 1d, 1w, 1m, 1y)",
        required: false,
      }),
      ChatInputOptions.string({
        name: "extra",
        description: "Extra data for the store item. (ex: { \"max_points\": 3 })",
        required: false,
      })
    ]
  });

  ChatInput({
    name: "store item delete",
    description: "Deletes a store item.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const item = interaction.options.get("store-item")?.value;
      if (!item) {
        return interaction.reply({
          content: "Missing required arguments.",
          ephemeral: true,
        });
      }

      await prisma.storeItem.delete({
        where: {
          id: item,
        }
      });

      interaction.reply({
        content: `Deleted store item with ID ${item}.`,
        ephemeral: true,
      });
    },
    options: [
      storeItemFinder(),
    ]
  });

  ChatInput({
    name: "store item view-type",
    description: "Views a store item's type.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const itemId = interaction.options.get("store-item")?.value;
      const type = interaction.options.get("view-type")?.value;
      const order = interaction.options.get("view-order")?.value;

      await interaction.deferReply();

      try {
        const item = await prisma.storeItem.update({
          where: {
            id: itemId,
          },
          data: {
            view_type: type,
            view_order: order ?? undefined,
          }
        });

        interaction.editReply({
          content: `Set type of pack ${item.name} to ${item.view_type}.`,
          ephemeral: true,
        });
      } catch (e) {
        interaction.editReply({
          content: `Failed to set type of pack ${itemId}.\n${e.message.toString().slice(0, 1800)}`,
          ephemeral: true,
        });
        throw e;
      }
    },
    options: [
      storeItemFinder(),
      ChatInputOptions.stringChoices({
        name: "view-type",
        description: "The view type of the store item.",
        required: true,
        choices: Object.values(ViewType).map((e) => ({
          name: e,
          value: e,
        })),
      }),
      ChatInputOptions.integer({
        name: "view-order",
        description: "The view order of the store item.",
        required: false,
        minValue: 0,
        maxValue: 1_000_000,
      })
    ]
  });

  ChatInput({
    name: "store item edit",
    description: "Edits a store item.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const itemId = interaction.options.get("store-item")?.value;
      const name = interaction.options.get("name")?.value;
      const image = interaction.options.get("image")?.value;
      const price = interaction.options.get("price")?.value;
      const duration = interaction.options.get("duration")?.value;
      const featureType = interaction.options.get("feature-type")?.value;
      const featureId = interaction.options.get("feature-id")?.value;
      const extra = interaction.options.get("extra")?.value;

      await interaction.deferReply();

      try {
        const item = await prisma.storeItem.update({
          where: {
            id: itemId,
          },
          data: {
            name,
            image: [image],
            price,
            duration,
            feature_type: featureType,
            feature_id: featureId,
            extra: extra ? JSON.parse(extra) : undefined,
          }
        });

        interaction.editReply({
          content: `Edited store item with ID ${item.id}.`,
          ephemeral: true,
        });
      } catch (e) {
        interaction.editReply({
          content: `Failed to edit store item with ID ${itemId}.\n${e.message.toString().slice(0, 1500)}`,
          ephemeral: true,
        });
        throw e;
      }
    },
    options: [
      storeItemFinder(),
      ChatInputOptions.string({
        name: "name",
        description: "The name of the store item.",
        required: true,
        minLength: 2,
        maxLength: 64,
      }),
      ChatInputOptions.string({
        name: "image",
        description: "The image of the store item.",
        required: true,
        minLength: 2,
        maxLength: 256,
      }),
      ChatInputOptions.number({
        name: "price",
        description: "The price of the store item in USD.",
        required: true,
        minValue: 0.0001,
        maxValue: 999999999999.9999,
      }),
      ChatInputOptions.string({
        name: "duration",
        description: "The duration of the store item. (ex: 1d, 1w, 1m, 1y)",
        required: false,
      }),
      ChatInputOptions.string({
        name: "extra",
        description: "Extra data for the store item. (ex: { \"max_points\": 3 })",
        required: false,
      })
    ]
  })

});