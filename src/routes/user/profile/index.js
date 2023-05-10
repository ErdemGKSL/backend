
const { Router } = require('express');
const Joi = require('joi');
const prisma = require('../../../../db');
const formatifyFeatureDurations = require('../../../other/formatifyFeatureDurations');
const router = Router();
const degRegex = /^([0-9]{1,3})deg$/;
const Prisma = require('@prisma/client');
const dbi = require('../../../discord/dbi');

const patchColorNameScheme = Joi.object({
  points: Joi.array().items(Joi.object({
    color: Joi.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).required(),
    percentage: Joi.number().min(0).max(100).required(),
  })),
  angle: Joi.string().regex(degRegex),
  type: Joi.string().valid("linear", "radial"),
  enabled: Joi.boolean(),
});

const patchProfileMusicScheme = Joi.object({
  uri: Joi.string(),
  position_ms: Joi.number().min(0).max(28_800_000),
  enabled: Joi.boolean(),
  volume_percent: Joi.number().min(0).max(100),
});


router.get('/inventory', async (req, res) => {
  const userId = req.targetUserId;

  if (req.query["include_disabled"] === 'true' && !req.isTargetUserMe)
    return res.status(401).setHeader("Cache-Control", "max-age=360").send({ ok: false, error: "You can't view other users' disabled features." });

  if (req.query.durations === 'true' && !req.isTargetUserMe)
    return res.status(401).setHeader("Cache-Control", "max-age=360").send({ ok: false, error: "You don't have permission to access this inventories durations." });

  await formatifyFeatureDurations({ userId });

  /** @type {string[]} */
  const types = req.query.include?.split(",").map(i => i.trim()).filter(i => Prisma.FeatureType[i]);

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      features: {
        where: {
          enabled: req.query["include_disabled"] === 'true' ? undefined : true,
          durations: req.query["include_disabled"] === 'true' ? undefined : {
            some: {
              consume_end: {
                gte: new Date(),
              }
            }
          },
          type: types?.length ? {
            in: types,
          } : undefined
        },
        select: {
          id: true,
          type: true,
          data: true,
          feature_id: true,
          enabled: true,
          ...((req.query.durations === 'true') ? {
            durations: {
              select: {
                consume_start: true,
                consume_end: true,
                duration: true,
              }
            }
          } : {})
        }
      },
      last_exchange: true,
    }
  });

  if (!user) return res.status(404).setHeader("Cache-Control", "max-age=360").send({ ok: false, error: "User not found." });

  if (!req.isTargetUserMe && (Date.now() - user.last_exchange.getTime()) > 86400000) return res.status(404).setHeader("Cache-Control", "max-age=360").send({ ok: false, error: "User not found." });

  if (req.query.durations === 'true' && user?.features?.length) user.features = user.features.map(formatDuration);

  const exchangeEnd = user.last_exchange.getTime() + (86400000 * 7);

  const guild = dbi.data.clients.first()?.client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
  const member = await guild?.members.fetch(userId).catch(() => null);
  if (member) {
    const connectedBadges = await prisma.badgeRoleConnection.findMany({
      where: {
        role_id: {
          in: member.roles.cache.map(r => r.id),
        }
      },
      select: {
        badge_id: true,
        id: true,
        disabled: {
          where: {
            user_id: userId,
            disabled: true
          },
          select: {
            user_id: true
          }
        }
      }
    });

    if (connectedBadges.length) {
      user.features = user.features ?? [];
      connectedBadges.forEach((connection) => {
        const enabled = !connection.disabled?.length;
        if (!user.features.some(f => f.feature_id === connection.badge_id) && (
          req.query["include_disabled"] === 'true' || enabled
        )) user.features.push({
          id: -1,
          type: "badge",
          feature_id: connection.badge_id,
          enabled,
          role_connection_id: connection.id,
        });
      });
    }
  }

  if (exchangeEnd > Date.now() && (!types?.length || types.includes("badge"))) user.features.push({
    id: -1,
    type: "badge",
    feature_id: 2,
    enabled: true,
    hidden_in_inventory: true,
    ...(req.query.durations === 'true' ? {
      durations: {
        start: user.last_exchange.getTime(),
        end: exchangeEnd,
        now: Date.now(),
      }
    } : {})
  });

  if (!req.isTargetUserMe) res.setHeader("Cache-Control", "max-age=300");

  delete user.last_exchange;

  if (user.features?.length) user.features.forEach(f => !f.data && delete f.data);

  res.send({ ok: true, data: user });
});

router.patch('/item/:featureId', async (req, res) => {

  if (!req.isTargetUserMe) return res.status(401).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You can't edit other users' features." });

  if (req.params.featureId == "-1" && !isNaN(req.query.role_connection_id)) {
    const connection = await prisma.badgeRoleConnection.findUnique({
      where: {
        id: parseInt(req.query.role_connection_id),
      },
      select: {
        badge_id: true,
        role_id: true,
        id: true,
      }
    });

    if (!connection) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Connection not found." });

    if (req.body.enabled === true) {
      await prisma.badgeRoleConnection.update({
        where: {
          id: connection.id,
        },
        data: {
          disabled: {
            delete: {
              unq_br_connection_disabler_badge_role_connection_id_user_id: {
                badge_role_connection_id: connection.id,
                user_id: req.user.id,
              }
            }
          }
        }
      });
    } else if (req.body.enabled === false) {
      await prisma.badgeRoleConnection.update({
        where: {
          id: connection.id,
        },
        data: {
          disabled: {
            upsert: {
              where: {
                unq_br_connection_disabler_badge_role_connection_id_user_id: {
                  badge_role_connection_id: connection.id,
                  user_id: req.user.id,
                },
              },
              create: {
                user: {
                  connect: {
                    id: req.user.id,
                  },
                },
                disabled: true,
              },
              update: {
                disabled: true,
              }
            }
          }
        }
      });
    }

    return res.send({ ok: true, data: { enabled: req.body.enabled } });
  }

  const feature = await prisma.userFeature.findUnique({
    where: {
      id: parseInt(req.params.featureId),
    },
  });

  if (!feature) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Feature not found." });

  if (feature.user_id !== req.user.id) return res.status(403).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });

  switch (feature.type) {

    case "colored_name": {

      try {
        const { points, angle, type, enabled } = (await patchColorNameScheme.validateAsync(req.body)) && req.body;

        const data = feature.data;

        if (points) data.points = points.slice(0, data.max_points ?? 1);
        if (angle) data.angle = angle;
        if (type) data.type = type;

        const responseData = await prisma.userFeature.update({
          where: { id: feature.id, },
          data: { data, enabled: typeof enabled === "boolean" ? enabled : feature.enabled }
        }).catch(() => { });

        res.send({ ok: true, data: responseData });

      } catch (e) {
        res.status(400)
          // .setHeader("Cache-Control", "max-age=3600") // TODO: Add cache control
          .send({ ok: false, error: e.message });
      }
      break;
    }

    case "hat": {
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") return res.status(400).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Request body.enabled is missing." });

      if (enabled) {
        await prisma.userFeature.updateMany({
          where: {
            user_id: req.user.id,
            type: "hat",
          },
          data: {
            enabled: false
          }
        })
      }

      const responseData = await prisma.userFeature.update({
        where: { id: feature.id, },
        data: { enabled }
      }).catch(() => { });

      res.send({ ok: true, data: responseData });
      break;
    }

    case "profile_music": {

      try {
        const { uri, position_ms, enabled, volume_percent } = (await patchProfileMusicScheme.validateAsync(req.body)) && req.body;

        const data = feature.data;

        if (uri) data.uri = uri;
        if (position_ms) data.position_ms = position_ms;
        if (volume_percent) data.volume_percent = volume_percent;

        const responseData = await prisma.userFeature.update({
          where: { id: feature.id, },
          data: { data, enabled: typeof enabled === "boolean" ? enabled : feature.enabled }
        }).catch(() => { });

        res.send({ ok: true, data: responseData });
      } catch (e) {
        res.status(400)
          // .setHeader("Cache-Control", "max-age=3600") // TODO: Add cache control
          .send({ ok: false, error: e.message });
      }

      break;
    }

    default: {
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") return res.status(400).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Request body.enabled is missing." });

      const responseData = await prisma.userFeature.update({
        where: { id: feature.id, },
        data: { enabled }
      }).catch(() => { });

      res.send({ ok: true, data: responseData });
      break;
    }

  }

});

router.get('/item/:featureId', async (req, res) => {

  if (!req.isTargetUserMe) return res.status(401).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });

  const feature = await prisma.userFeature.findUnique({
    where: {
      id: parseInt(req.params.featureId),
    },
    include: {
      durations: true,
    }
  });

  if (!feature) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Feature not found." });

  if (feature.user_id !== req.user.id) return res.status(403).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });

  res.send({ ok: true, data: formatDuration(feature) });

});

router.get('/item/:featureId/durations', async (req, res) => {

  if (!req.isTargetUserMe) return res.status(401).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });

  const userId = req.user.id;
  const featureId = req.params.featureId;

  const feature = await prisma.userFeature.findUnique({
    where: {
      id: featureId,
    },
    select: {
      user_id: true,
      durations: {
        select: {
          consume_start: true,
          consume_end: true,
          duration: true,
          id: true,
        }
      }
    }
  });

  if (!feature) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Feature not found." });

  if (feature.user_id !== userId) return res.status(403).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });

  res.setHeader("Cache-Control", "max-age=60").send({ ok: true, data: feature.durations });
});

router.delete('/item/:featureId', async (req, res) => {

  if (!req.isTargetUserMe) return res.status(401).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });

  if (req.params.featureId === "-1" && req.body.role_connection_id >= 0) {
    const roleConnection = await prisma.badgeRoleConnection.findUnique({
      where: {
        id: req.body.role_connection_id,
      },
      select: {
        role_id: true
      }
    });

    if (!roleConnection) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Role connection not found." });

    const member = await dbi.data.clients.first()?.client.guilds.cache.get(process.env.DISCORD_GUILD_ID)?.members.fetch(req.user.id ?? "-1");
    if (!member) return res.status(403).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });
    if (!member.roles.cache.has(roleConnection.role_id)) return res.status(403).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });
    await member.roles.remove(roleConnection.role_id);
    res.setHeader("Cache-Control", "max-age=3600").send({ ok: true });
    return;
  }


  const feature = await prisma.userFeature.findUnique({
    where: {
      id: parseInt(req.params.featureId),
    },
    include: {
      durations: true,
    }
  });

  if (!feature) return res.status(404).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "Feature not found." });

  if (feature.user_id !== req.user.id) return res.status(403).setHeader("Cache-Control", "max-age=3600").send({ ok: false, error: "You don't have permission to access this feature." });

  await prisma.userFeature.delete({
    where: {
      id: feature.id,
    }
  });

  res.send({ ok: true });

});

function formatDuration(feature) {
  const now = Date.now();
  const start = feature.durations.reduce((prev, current) => ((prev.consume_start) && (prev.consume_start < current.consume_start)) ? prev : current, 0)?.consume_start?.getTime() ?? now;
  let end = feature.durations.reduce((prev, current) => {
    if (current.consume_end && current.consume_start) {
      const duration = Math.max(0, current.consume_end.getTime() - now);
      return prev + duration;
    } else {
      return prev + Number(current.duration);
    }
  }, 0) + now;

  if (end == now) {
    end = feature.durations.reduce((prev, current) => ((prev.consume_end) && (prev.consume_end > current.consume_end)) ? prev : current, 0)?.consume_end?.getTime() ?? now;
  }

  return {
    ...feature,
    durations: {
      start,
      now,
      end,
    },
  }
}

module.exports = router;