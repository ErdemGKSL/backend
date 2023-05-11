const prisma = require("../../../db");
const getExchangeRateUsdToTry = require("../../other/getExchangeRateUsdToTry");
const Joi = require('joi');
const { FeatureType } = require('@prisma/client');
const pageSize = 10;
const featureTypeValidation = Joi.string().valid(...Object.values(FeatureType));


/** @type {import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string,any>>} */
module.exports = async (req, res) => {
  const page = Number(req.query.page || 1);
  if (isNaN(page)) return res.status(400).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Invalid page number." });

  const exchangeRate = await getExchangeRateUsdToTry();
  
  const storeItems = await prisma.storeItem.findMany({
    where: {
      feature_type: await featureTypeValidation.validateAsync(req.query.feature_type).then((e) => req.query.feature_type).catch(() => undefined),
      enabled: true
    },
    select: {
      feature_type: true,
      price: true,
      name: true,
      image: true,
      id: true,
      feature_id: true,
    },
    skip: req.query.all === "true" ? undefined : ((page - 1) * pageSize),
    take: req.query.all === "true" ? undefined : pageSize,
  }).then((e) => e.map((e) => {
    e.price = Number(e.price);
    e.prices = {
      usd: e.price,
      try: Math.floor(e.price * exchangeRate * 100) / 100,
    }
    e.type = "single";
    return e;
  }));

  res.setHeader("Cache-Control", "max-age=600").send({ ok: true, data: storeItems });
};