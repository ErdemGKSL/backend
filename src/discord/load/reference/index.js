const prisma = require("../../../../db.js");
const dbi = require("../../dbi.js");

dbi.register(({ ChatInput, ChatInputOptions, InteractionLocale }) => {
  ChatInput({
    name: "inviter set",
    description: "Set your inviter. This command can only be used once.",
    options: [
      ChatInputOptions.user({
        name: "user",
        description: "The one who invited you to Acord.",
        required: true
      })
    ],
    defaultMemberPermissions: ["SendMessages"],
    async onExecute({ interaction, locale }) {
      await interaction.deferReply();

      let inviter = interaction.options.get("user")?.user;

      if (inviter.id === interaction.user.id) return interaction.editReply({
        content: locale.user.data.inviter_set__invalid_user(),
      });

      {
        let dbUser = await prisma.user.findUnique({
          where: {
            id: interaction.user.id,
          },
          select: {
            last_exchange: true,
            invited_by_id: true,
            invited_by: {
              select: {
                last_exchange: true,
              }
            }
          }
        });

        if (!dbUser || ((Date.now() - dbUser.last_exchange.getTime()) > (86400000 * 7))) return interaction.editReply(
          locale.user.data.inviter_set__my_acord_link_required()
        );

        if (dbUser.invited_by && (Date.now() - dbUser.invited_by.last_exchange.getTime()) < (86400000 * 15)) return interaction.editReply({
          content: locale.user.data.inviter_set__already_set(`<@${dbUser.invited_by_id}>`),
          allowedMentions: {}
        });
      }

      {
        let dbInviter = await prisma.user.findUnique({
          where: {
            id: inviter.id,
          }
        });

        if (!dbInviter || ((Date.now() - dbInviter.last_exchange.getTime()) > (86400000 * 7))) return interaction.editReply(
          locale.user.data.inviter_set__inviter_acord_link_required()
        );
      }

      await prisma.user.update({
        where: {
          id: interaction.user.id,
        },
        data: {
          invited_by: {
            connect: {
              id: inviter.id
            }
          }
        }
      });

      await interaction.editReply(
        {
          content: locale.user.data.inviter_set__success(`<@${inviter.id}>`),
          allowedMentions: {}
        }
      );
    }
  });


  ChatInput({
    name: "my-invites list",
    description: "See how many people you have invited to Acord.",
    defaultMemberPermissions: ["SendMessages"],
    async onExecute({ interaction, locale }) {
      await interaction.deferReply();

      let data = await prisma.user.findUnique({
        where: {
          id: interaction.user.id,
        },
        select: {
          invited_by_id: true,
          invitees: {
            where: {
              last_exchange: {
                gte: new Date(Date.now() - (86400000 * 7))
              }
            },
            select: {
              id: true
            },
            take: 10,
          }
        }
      });

      const inviteCount = await prisma.user.count({
        where: {
          invited_by_id: interaction.user.id,
        }
      });

      if (!inviteCount) return interaction.editReply(
        locale.user.data.my_invites_list__none()
      );

      await interaction.editReply(
        {
          content: locale.user.data.my_invites_list__list(data.invited_by_id ? `<@${data.invited_by_id}>` : locale.user.data.none(), inviteCount, data.invitees.map(i => `<@${i.id}>`).join("\n")),
          allowedMentions: {}
        }
      );
    }
  })

  InteractionLocale({
    name: "my-invites list",
    data: {
      tr: {
        name: "davetlerim listele",
        description: "Acord'a kaç kişi davet ettiğini gör.",
        options: {}
      }
    }
  })

  InteractionLocale({
    name: "inviter set",
    data: {
      tr: {
        name: "davetçi ayarla",
        description: "Davetçini ayarla. Bu komut sadece bir kez kullanılabilir.",
        options: {
          user: {
            name: "kullanıcı",
            description: "Acord'a seni davet eden kişi."
          }
        }
      }
    }
  })
});