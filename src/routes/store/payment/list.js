const prisma = require("../../../../db")

/** @type {import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string,any>>} */
module.exports = async function (req, res, next) {

  const type = ["pending", "fulfilled"].includes(req.query.type) ? req.query.type : undefined;

  const orders = await prisma.order.findMany({
    where: {
      fulfilled: type === "fulfilled" ? true : type === "pending" ? false : undefined,
      user_id: req.user.id
    },
    include: {
      items: {
        include: {
          item: true
        }
      },
      packs: {
        include: {
          item: {
            include: {
              items: {
                include: {
                  item: true
                }
              }
            }
          }
        }
      }
    }
  }).then(orders => orders.map(order => {
    const items = order.items.map(item => item.item);
    const packs = order.packs.map(pack => ({
      ...pack.item,
      items: pack.item.items.map(item => item.item)
    }));
    return {
      ...order,
      items,
      packs
    }
  }));

  res.send({ ok: true, data: orders });
}