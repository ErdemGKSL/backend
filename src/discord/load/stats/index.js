const prisma = require("../../../../db");
const dbi = require("../../dbi");

dbi.register(({ ChatInput }) => {

  ChatInput({
    name: "stats",
    description: "Shows the statistics of Acord.",
    defaultMemberPermissions: ["SendMessages"],
    async onExecute({ interaction }) {
      await interaction.deferReply();

      const totalUserCount = await prisma.user.count();
      const totalUserActiveCount = await prisma.user.count({
        where: {
          last_exchange: {
            gte: new Date(Date.now() - (86400000 * 7))
          },
        }
      });
      const totalUserDeactiveCount = totalUserCount - totalUserActiveCount;
      const joinedLastWeekCount = await prisma.user.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - (86400000 * 7))
          },
        }
      });
      const joinedLastMonthCount = await prisma.user.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - (86400000 * 30))
          },
        }
      });

      

      await interaction.editReply(
        `
        **Total User Count:** ${totalUserCount}
        **Total Active User Count:** ${totalUserActiveCount}
        **Total Deactive User Count:** ${totalUserDeactiveCount}
        **Joined Last Week Count:** ${joinedLastWeekCount}
        **Joined Last Month Count:** ${joinedLastMonthCount}
        `.split("\n").map(x => x.trim()).join("\n")
      )
    }
  });

});