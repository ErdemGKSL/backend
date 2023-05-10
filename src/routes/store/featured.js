const prisma = require("../../../db");
const getExchangeRateUsdToTry = require("../../other/getExchangeRateUsdToTry");

/** @type {import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string,any>>} */
module.exports = async (req, res) => {

  const exchangeRate = await getExchangeRateUsdToTry();

  const main = [...(await prisma.storeItem.findMany({
    where: {
      view_type: "featured",
      enabled: true,
    },
  }).then((e) => e.forEach((i) => i.type = "single") || e)), ...(await prisma.storeItemPack.findMany({
    where: {
      view_type: "featured",
      enabled: true
    },
  }).then((e) => e.forEach((i) => i.type = "pack") || e))].sort((a, b) => b.view_order - a.view_order).map((e) => {
    e.price = Number(e.price);
    e.prices = {
      usd: e.price,
      try: Math.floor(e.price * exchangeRate * 100) / 100,
    }
    return e;
  });

  const other = [...(await prisma.storeItem.findMany({
    where: {
      view_type: "main_page",
      enabled: true
    },
  }).then((e) => e.forEach((i) => i.type = "single") || e)), ...(await prisma.storeItemPack.findMany({
    where: {
      view_type: "main_page",
      enabled: true
    },
  }).then((e) => e.forEach((i) => i.type = "pack") || e))].sort((a, b) => b.view_order - a.view_order).map((e) => {
    e.price = Number(e.price);
    e.prices = {
      usd: e.price,
      try: Math.floor(100 * e.price * exchangeRate) / 100,
    }
    return e;
  });

  res.setHeader("Cache-Control", "max-age=600").send({ ok: true, data: { main, other } });
}