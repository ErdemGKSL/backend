const { Router } = require('express');
const prisma = require('../../../db.js');
const router = Router();
const userIdRegex = /^[0-9]{18,19}$/;

const targetUserMiddleware = (req, res, next) => {
  req.targetUserId = req.params.targetUserId;
  if (req.targetUserId === "@me" || req.targetUserId === req.user.id) {
    req.targetUserId = req.user.id;
    req.isTargetUserMe = true;
  };
  next();
};

router.get('/:targetUserId', targetUserMiddleware, async (req, res, next) => {
  if (!userIdRegex.test(req.targetUserId)) {
    return res
      .status(400)
      .setHeader("Cache-Control", "max-age=360")
      .send({ ok: false, error: "Invalid user id." });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: req.targetUserId,
    },
    select: {
      id: true,
      data: {
        select: {
          key: true,
          value: true,
        }
      }
    }
  });

  if (!user) {
    return res
      .status(404)
      .setHeader("Cache-Control", "max-age=360")
      .send({ ok: false, error: "User not found." });
  }

  user.data = user.data.reduce((acc, cur) => {
    acc[cur.key] = cur.value;
    return acc;
  }, {});

  if (!req.isTargetUserMe) res.setHeader("Cache-Control", "max-age=360")
  else res.setHeader("Cache-Control", "max-age=30");
  res.send({ ok: true, data: user });
});

router.use('/:targetUserId/profile', targetUserMiddleware, require('./profile/index.js'));

module.exports = router;