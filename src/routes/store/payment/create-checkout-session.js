const Joi = require("joi");
const prisma = require("../../../../db");
const crypto = require("crypto");
const getExchangeRateUsdToTry = require("../../../other/getExchangeRateUsdToTry");

const buildOptions = async (order, buyer) => {
  const exchangeRate = buyer.country === "Turkey" ? await getExchangeRateUsdToTry() : 1;
  const myHeaders = new Headers();
  myHeaders.append("Referer", "api.acord.app");
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

  const urlencoded = new URLSearchParams();

  urlencoded.append("userName", process.env.VALLET_USERNAME);
  urlencoded.append("password", process.env.VALLET_PASSWORD);
  urlencoded.append("shopCode", process.env.VALLET_SHOP_CODE);
  urlencoded.append("productName", `${buyer.name}'s Acord Cosmetics`);
  const allItems = [...order.items, ...order.packs].map(item => ({ ...item, item: { ...item.item, price: Math.round((Number(item.item.price) * exchangeRate) * 100) / 100 } }));
  const totalPrice = Math.floor(allItems.reduce((acc, item) => acc + item.item.price, 0) * 100) / 100;
  urlencoded.append("hash",
    crypto.createHash("sha1").update(
      `${process.env.VALLET_USERNAME}${process.env.VALLET_PASSWORD}${process.env.VALLET_SHOP_CODE}${order.id}${buyer.country === "Turkey" ? "TRY" : "USD"}${totalPrice}${totalPrice}DIJITAL_URUN${process.env.VALLET_CALLBACK_OK_URL}${process.env.VALLET_CALLBACK_FAIL_URL}${process.env.VALLET_API_HASH}`
    ).digest("base64")
  );
  urlencoded.append(
    "productData",
    JSON.stringify(
      allItems.map((item) => ({
        productName: item.item.name,
        productPrice: item.item.price,
        productType: "DIJITAL_URUN"
      }))
    )
  );
  urlencoded.append("productType", "DIJITAL_URUN");
  urlencoded.append(
    "productsTotalPrice",
    totalPrice
  );
  urlencoded.append(
    "orderPrice",
    totalPrice
  );
  urlencoded.append("currency", buyer.country === "Turkey" ? "TRY" : "USD");
  urlencoded.append("orderId", order.id.toString());
  urlencoded.append("locale", buyer.locale);
  // urlencoded.append("conversationId", order.id);
  urlencoded.append("buyerName", buyer.name);
  urlencoded.append("buyerSurName", buyer.surname);
  urlencoded.append("buyerGsmNo", buyer.gsm_no);
  urlencoded.append("buyerIp", buyer.ip);
  urlencoded.append("buyerMail", buyer.mail);
  urlencoded.append("buyerAdress", buyer.address);
  urlencoded.append("buyerCountry", buyer.country);
  urlencoded.append("buyerCity", buyer.city);
  urlencoded.append("buyerDistrict", buyer.district);
  urlencoded.append(
    "callbackOkUrl",
    process.env.VALLET_CALLBACK_OK_URL
  );
  urlencoded.append(
    "callbackFailUrl",
    process.env.VALLET_CALLBACK_FAIL_URL
  );

  var requestOptions = {
    headers: myHeaders,
    body: urlencoded,
    totalPrice
  };

  return requestOptions;
}

const schema = Joi.object({
  items: Joi.array().items(Joi.object({
    id: Joi.number().required(),
    type: Joi.string().valid("single", "pack").required(),
  })),
  buyer_name: Joi.string().required(),
  buyer_surname: Joi.string().required(),
  buyer_gsm_no: Joi.string().required(),
  buyer_mail: Joi.string().email().required(),
  buyer_address: Joi.string().required(),
  buyer_country: Joi.string().required(),
  buyer_city: Joi.string().required(),
  buyer_district: Joi.string().required(),
  buyer_locale: Joi.string().valid("tr", "en").required(),
});

/** @type {import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string,any>>} */
module.exports = async function (req, res, next) {
  try {
    const body = await schema.validateAsync(req.body);
    const { items, buyer_name, buyer_surname, buyer_gsm_no, buyer_mail, buyer_address, buyer_country, buyer_city, buyer_district, buyer_locale } = body;
    const userId = req.user.id;

    for (const item of items) {
      switch (item.type) {
        case "single": {
          const itemExists = await prisma.storeItem.findUnique({
            where: {
              id: item.id
            }
          });
    
          if (!itemExists || !itemExists.enabled) {
            return res.send({
              ok: false,
              error: {
                message: "Item not found."
              }
            });
          }
          break;
        }
        case "pack": {
          const packExists = await prisma.storePack.findUnique({
            where: {
              id: item.id
            }
          });

          if (!packExists || !packExists.enabled) {
            return res.send({
              ok: false,
              error: {
                message: "Pack not found."
              }
            });
          }
          break;
        }
      }
    }

    const order = await (await prisma.order.create({
      data: {
        items: {
          createMany: {
            data: items.filter(i => i.type === "single").map((item) => ({
              item_id: item.id,
            }))
          }
        },
        packs: {
          createMany: {
            data: items.filter(i => i.type === "pack").map((item) => ({
              pack_id: item.id,
            }))
          }
        },
        user_id: userId,
        currency: buyer_country === "Turkey" ? "try" : "usd",
      },
      include: {
        items: {
          include: {
            item: true
          }
        },
        packs: {
          include: {
            item: true
          }
        },
      }
    }).catch(async (e) => {
      console.error("something went wrong", e);
      const order = await prisma.order.create({
        data: {
          user: {
            connect: {
              id: userId
            }
          }
        }
      });

      const connecters = items.map((item) => {
        switch (item.type) {
          case "single": {
            return prisma.orderItemConnector.create({
              data: {
                order: {
                  connect: {
                    id: order.id
                  }
                },
                item: {
                  connect: {
                    id: item.id
                  }
                }
              }
            })
          }
          case "pack": {
            return prisma.orderItemPackConnector.create({
              data: {
                order: {
                  connect: {
                    id: order.id
                  }
                },
                item: {
                  connect: {
                    id: item.id
                  }
                }
              }
            })
          }
        }
      });

      await prisma.$transaction(connecters);


      return await prisma.order.findUnique({
        where: {
          id: order.id
        },
        include: {
          items: {
            include: {
              item: true
            }
          },
          packs: {
            include: {
              item: true
            }
          },
        }
      });
    }));

    const options = await buildOptions(order, {
      name: buyer_name,
      surname: buyer_surname,
      gsm_no: buyer_gsm_no,
      mail: buyer_mail,
      address: buyer_address,
      country: buyer_country,
      city: buyer_city,
      district: buyer_district,
      locale: buyer_locale,
      ip: req.header("x-forwarded-for")
    });

    const d = await fetch("https://www.vallet.com.tr/api/v1/create-payment-link", {
      method: 'POST',
      headers: options.headers,
      body: options.body,
      redirect: 'follow'
    }).then(res => res.json());

    const { payment_page_url, ValletOrderId: vallet_id } = d;
    
    console.log(options, d);

    if (!payment_page_url) throw new Error("payment_page_url is not defined");

    await prisma.order.update({
      where: {
        id: order.id
      },
      data: {
        payment_page_url,
        vallet_id: vallet_id?.toString(),
        currency: buyer_country === "Turkey" ? "try" : "usd",
        total_price: options.totalPrice
      }
    });

    res.send({ ok: true, data: { payment_page_url } });
  } catch (e) {
    res.status(400).send({ ok: false, error: e.message });
    throw e;
  }
}