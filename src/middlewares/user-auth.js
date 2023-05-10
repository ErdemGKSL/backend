const prisma = require("../../db");

/** 
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 *  */
module.exports = async (req, res, next) => {
  let acordToken = req.header("x-acord-token");

  if (!acordToken) return res.status(401).setHeader("Cache-Control", "max-age=60").send({ ok: false, error: "Missing x-acord-token." });

  const userId = (await prisma.user.findUnique({
    where: {
      acord_token: acordToken,
    },
    select: {
      id: true,
    }
  }))?.id;

  if (!userId) return res.status(401).send({ ok: false, error: "Invalid x-acord-token." })

  req.user = {
    id: userId
  };

  next();
}