const { Router } = require('express');
const prisma = require('../../../db.js');

const router = Router();

router.get('/:badgeId', async (req, res) => {
  const badgeId = Number(req.params.badgeId);

  if (isNaN(badgeId)) return res.status(400).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Invalid badge id." });

  const badge = await prisma.badge.findUnique({
    where: {
      id: badgeId,
    }
  });

  if (!badge) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Badge not found." });

  res.setHeader("Cache-Control", "max-age=600").send({ ok: true, data: badge });
});

module.exports = router;