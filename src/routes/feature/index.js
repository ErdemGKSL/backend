const { Router } = require('express');
const prisma = require('../../../db.js');

const router = Router();

router.get('/badge/:badgeId', async (req, res) => {
  const badgeId = Number(req.params.badgeId);

  if (isNaN(badgeId)) return res.status(400).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Invalid badge id." });

  const badge = await prisma.badge.findUnique({
    where: {
      id: badgeId,
    },
    select: {
      display_name: true,
      id: true,
      image: true,
    }
  });

  if (!badge) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Badge not found." });

  res.setHeader("Cache-Control", "max-age=600").send({ ok: true, data: badge });
});

router.get('/hat/:hatId', async (req, res) => {
  const hatId = Number(req.params.hatId);

  if (isNaN(hatId)) return res.status(400).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Invalid hat id." });

  const hat = await prisma.hat.findUnique({
    where: {
      id: hatId,
    },
    select: {
      display_name: true,
      id: true,
      image: true,
    }
  });

  if (!hat) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Hat not found." });

  res.setHeader("Cache-Control", "max-age=600").send({ ok: true, data: hat });
});

module.exports = router;