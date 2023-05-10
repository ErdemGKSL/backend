const Joi = require("joi");
const prisma = require("../../../../db");
const getExchangeRateUsdToTry = require("../../../other/getExchangeRateUsdToTry.js");

const schema = Joi.object({
  status: Joi.string().valid("success").required(),
  paymentStatus: Joi.string().valid("paymentOk").required(),
  productsTotalPrice: Joi.string().required(),
  orderId: Joi.string().required(),
}).unknown(true);

/** @type {import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string,any>>} */
module.exports = async function (req, res, next) {
  try {
    const body = await schema.validateAsync(req.body);
    const { productsTotalPrice, orderId } = body;

    const exchangeRate = await getExchangeRateUsdToTry();

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId) || -1
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
        },
      }
    });

    if (!order || order.fulfilled) return res.status(400).send({ ok: false, error: "No pending order found." });

    const allItems = [...order.items, ...order.packs].map(item => ({ ...item, item: { ...item.item, price: Math.round((Number(item.item.price) * exchangeRate) * 100) / 100 } }));
    const orderTotalPrice = Math.ceil(allItems.reduce((acc, item) => acc + item.item.price, 0) * 100) / 100;

    // if (orderTotalPrice !== productsTotalPrice) return res.status(400).send({ ok: false, error: "Order total price mismatch." });
    // console.log({
    //   orderTotalPrice,
    //   productsTotalPrice,
    // });

    const unpackedItems = [...order.items.map(item => {
      return item.item
    })];

    order.packs.forEach(pack => {
      pack.item.items.forEach(item => {
        unpackedItems.push(item.item)
      })
    });

    const queries = unpackedItems.map(item => {
      switch (item.feature_type) {
        case "hat": case "badge": {
          return prisma.featureDuration.create({
            data: {
              duration: item.data?.duration || 2592000000,
              user_feature: {
                connectOrCreate: {
                  where: {
                    unq_user_feature_user_id_type_feature_id: {
                      type: item.feature_type,
                      feature_id: item.feature_id,
                      user_id: order.user_id,
                    }
                  },
                  create: {
                    type: item.feature_type,
                    feature_id: item.feature_id,
                    enabled: false,
                    user: {
                      connect: {
                        id: order.user_id,
                      }
                    },
                    data: item.data?.extra ?? {}
                  }
                }
              }
            }
          })
        }
        case "colored_name": {
          return prisma.featureDuration.create({
            data: {
              duration: item.data?.duration || 2592000000,
              user_feature: {
                connectOrCreate: {
                  where: {
                    unq_user_feature_user_id_type_feature_id: {
                      feature_id: -1,
                      type: item.feature_type,
                      user_id: order.user_id,
                    }
                  },
                  create: {
                    feature_id: -1,
                    type: item.feature_type,
                    user: {
                      connect: {
                        id: order.user_id,
                      }
                    },
                    data: {
                      points: [{
                        color: "#ff00ff",
                        percentage: null
                      }],
                      angle: "90deg",
                      type: "linear",
                      ...(item.data?.extra ?? {})
                    }
                  }
                }
              }
            }
          })
        }
        case "profile_music": {
          return prisma.featureDuration.create({
            data: {
              duration: item.data?.duration || 2592000000,
              user_feature: {
                connectOrCreate: {
                  where: {
                    unq_user_feature_user_id_type_feature_id: {
                      feature_id: -1,
                      type: item.feature_type,
                      user_id: order.user_id,
                    }
                  },
                  create: {
                    feature_id: -1,
                    type: item.feature_type,
                    user: {
                      connect: {
                        id: order.user_id,
                      }
                    },
                    data: {
                      uri: "spotify:track:4klMeclMmLvI6OyLz0iMf1",
                      position_ms: 0,
                      volume_percent: null,
                      ...(item.data?.extra ?? {})
                    }
                  }
                }
              }
            }
          })
        }
      }
    });

    await prisma.$transaction(queries);

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        fulfilled: true,
        purchased_at: new Date(),
        // total_price: Math.round(orderTotalPrice * 100) / 100,
      }
    });

    return res.send({ ok: true });
  } catch (err) {
    res.status(400).send({ ok: false, error: err.message });
    throw err;
  }
};