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
  });

  const itemPackFinder = (required = true) => ChatInputOptions.integerAutocomplete({
    name: "store-item-pack",
    description: "The store item pack to create.",
    required,
    minValue: 0,
    async onComplete({ interaction, value }) {
      const items = await prisma.storeItemPack.findMany({
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
    }
  })

  ChatInput({
    name: "store pack create",
    description: "Creates a store pack.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const name = interaction.options.get("name")?.value;
      const image = interaction.options.get("image")?.value;
      const price = interaction.options.get("price")?.value;

      await interaction.deferReply();

      const item = await prisma.storeItemPack.create({
        data: {
          name,
          price: new Prisma.Decimal(price),
          image: [image]
        }
      });

      interaction.editReply({
        content: `Created store item pack ${item.name} with ID ${item.id}.`,
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
      })
    ]
  });

  ChatInput({
    name: "store pack add-item",
    description: "Adds an item to a store pack.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const pack = interaction.options.get("store-item-pack")?.value;
      const item = interaction.options.get("store-item")?.value;

      await interaction.deferReply();

      try {
        const itemPack = await prisma.storeItemPack.update({
          where: {
            id: pack,
          },
          data: {
            items: {
              upsert: {
                where: {
                  unq_pack_connecter_pack_id_item_id: {
                    item_id: item,
                    pack_id: pack,
                  }
                },
                create: {
                  item: {
                    connect: {
                      id: item,
                    }
                  }
                },
                update: { }
              }
            }
          }
        });
  
        interaction.editReply({
          content: `Added item ${item} to pack ${itemPack.name}.`,
          ephemeral: true,
        });
      } catch (e) {
        interaction.editReply({
          content: `Failed to add item ${item} to pack ${pack}.\n${e.message}`,
          ephemeral: true,
        });
        throw e;
      }
    },
    options: [
      itemPackFinder(),
      storeItemFinder(),
    ]
  });

  ChatInput({
    name: "store pack view-type",
    description: "Views the type of a store pack.",
    defaultMemberPermissions: ["Administrator"],
    async onExecute({ interaction }) {
      const pack = interaction.options.get("store-item-pack")?.value;
      const type = interaction.options.get("view-type")?.value;
      const order = interaction.options.get("view-order")?.value;

      await interaction.deferReply();

      try {
        const itemPack = await prisma.storeItemPack.update({
          where: {
            id: pack,
          },
          data: {
            view_type: type,
            view_order: order ?? undefined
          }
        });
  
        interaction.editReply({
          content: `Set type of pack ${itemPack.name} to ${itemPack.view_type}.`,
          ephemeral: true,
        });
      } catch (e) {
        interaction.editReply({
          content: `Failed to set type of pack ${pack}.\n${e.message}`,
          ephemeral: true,
        });
        throw e;
      }
    },
    options: [
      itemPackFinder(),
      ChatInputOptions.stringChoices({
        name: "view-type",
        description: "The type of view to set.",
        required: true,
        choices: Object.values(ViewType).map((e) => ({
          name: e,
          value: e,
        })),
      }),
      ChatInputOptions.integer({
        name: "view-order",
        description: "The position of the view.",
        required: false,
        minValue: 0,
        maxValue: 1_000_000,
      })
    ]
  })

});