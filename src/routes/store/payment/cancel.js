const prisma = require("../../../../db");

/** @type {import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string,any>>} */
module.exports = async function (req, res, next) {
  const orderId = req.params.id;
  const userId = req.user.id;

  const order = await prisma.order.findUnique({
    where: {
      id: orderId
    }
  });

  if (!order) {
    return res.send({
      ok: false,
      error: "Order not found."
    });
  }

  if (order.user_id !== userId) {
    return res.send({
      ok: false,
      error: "You are not allowed to cancel this order."
    });
  }

  if (order.fulfilled) {
    return res.send({
      ok: false,
      error: "This order is already fulfilled."
    });
  }

  await prisma.order.delete({
    where: {
      id: orderId
    }
  });

  res.send({
    ok: true
  })
}