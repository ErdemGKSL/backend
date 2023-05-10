const dbi = require("../../dbi");
const prisma = require("../../../../db");
const { distance } = require('fastest-levenshtein');

dbi.register(({ Event, ChatInput, ChatInputOptions }) => {
  ChatInput({
    name: "keyword define",
    description: "Define a keyword.",
    defaultMemberPermissions: ["Administrator"],
    options: [
      ChatInputOptions.string({
        name: "keyword",
        description: "The keyword to define.",
        required: true,
      }),
      ChatInputOptions.string({
        name: "definition",
        description: "The definition of the keyword.",
        required: true,
      }),
    ],
    async onExecute({ interaction }) {
      const keyword = interaction.options.getString("keyword");
      const definition = interaction.options.getString("definition");

      await prisma.keywordTrigger.create({
        data: {
          keyword,
          definition
        },
      });

      await interaction.reply({
        content: `Keyword \`${keyword}\` has been defined.`,
        ephemeral: true,
      });
    }
  });

  ChatInput({
    name: "keyword un-define",
    description: "Undefine a keyword.",
    defaultMemberPermissions: ["Administrator"],
    options: [
      ChatInputOptions.integerAutocomplete({
        name: "keyword-id",
        description: "The keyword to undefine.",
        required: true,
        async onComplete({ value }) {
          const keywords = await prisma.keywordTrigger.findMany({
            where: value ? {
              keyword: {
                contains: value,
              }
            } : {},
            select: {
              keyword: true,
              id: true,
            },
            take: 10,
          });

          return keywords.map(keyword => ({ name: keyword.keyword, value: keyword.id }));
        }
      })
    ],
    async onExecute({ interaction }) {
      const keywordId = interaction.options.getInteger("keyword-id");

      await prisma.keywordTrigger.delete({
        where: {
          id: keywordId,
        },
      });

      await interaction.reply({
        content: `Keyword \`${keywordId}\` has been undefined.`,
        ephemeral: true,
      });
    }
  });

  Event({
    name: "messageCreate",
    id: "keywordTrigger",
    async onExecute({ message }) {
      if (message.author.bot) return;
      const keywords = await prisma.keywordTrigger.findMany({});
      const content = message.cleanContent.toLowerCase();

      keywords.forEach(({ keyword, definition }) => {
        // console.log(distance(keyword, content), keyword.length, keyword, content);
        if (distance(keyword, content) <= (keyword.length / 2)) {
          message.reply(definition);
        }
      });
    }
  })

});