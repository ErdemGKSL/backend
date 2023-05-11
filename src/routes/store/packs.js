const prisma = require("../../../db");
const getExchangeRateUsdToTry = require("../../other/getExchangeRateUsdToTry");

const pageSize = 10;

/** @type {import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string,any>>} */
module.exports = async (req, res) => {
  const page = Number(req.query.page || 1);
  if (isNaN(page)) return res.status(400).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Invalid page number." });

  const exchangeRate = await getExchangeRateUsdToTry();

  const storeItems = await prisma.storeItemPack.findMany({
    where: {
      enabled: true,
    },
    select: {
      image: true,
      id: true,
      name: true,
      price: true,
      items: {
        select: {
          item: {
            select: {
              feature_type: true,
              price: true,
              name: true,
              image: true,
              id: true,
              feature_id: true
            }
          }
        }
      }
    },
    skip: req.query.all === "true" ? undefined : (page - 1) * pageSize,
    take: req.query.all === "true" ? undefined : pageSize,
  }).then((e) => e.map((e) => {
    e.items = e.items.map((e) => e.item);
    e.price = Number(e.price);
    e.prices = {
      usd: e.price,
      try: Math.floor(e.price * exchangeRate * 100) / 100,
    }
    e.items.forEach((e) => {
      e.price = Number(e.price);
      e.prices = {
        usd: e.price,
        try: Math.floor(e.price * exchangeRate * 100) / 100,
      }
    });
    e.type = "pack"
    return e;
  }));

  res.setHeader("Cache-Control", "max-age=600").send({ ok: true, data: storeItems });
};