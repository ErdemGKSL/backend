const prisma = require("../../db");

setInterval(async () => {

  await prisma.order.deleteMany({
    where: {
      fulfilled: false,
      created_at: {
        lte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 3)
      }
    }
  });

});