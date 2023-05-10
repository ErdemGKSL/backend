const prisma = require("../../db");

async function formatifyFeatureDurations({ userFeatureId, userId }) {
  if (userFeatureId) {
    userFeatureId = parseInt(userFeatureId);
    const userFeature = await prisma.userFeature.findUnique({
      where: {
        id: userFeatureId,
      },
      select: {
        durations: {
          where: {
            OR: [
              {
                consume_end: null,
              },
              {
                consume_end: {
                  gte: new Date(),
                }
              }
            ]
          }
        },
      },
    });

    userFeature.current_duration = userFeature.durations.find(d => d.consume_end) || null;

    if (userFeature.current_duration) return;

    if (userFeature.durations.length === 0) {

      const infinityDuration = await prisma.featureDuration.findFirst({
        where: {
          user_feature_id: userFeatureId,
          duration: -1,
        }
      });
  
      if (infinityDuration) {
        await prisma.featureDuration.update({
          where: {
            id: infinityDuration.id,
          },
          data: {
            consume_start: new Date(Date.now() - 1000 * 60),
            consume_end: new Date(Date.now() + 1000 * 60),
          }
        })
        return;
      }

      // await prisma.userFeature.update({
      //   where: {
      //     id: userFeatureId,
      //   },
      //   data: {
      //     enabled: false,
      //   }
      // });
      await prisma.userFeature.delete({
        where: {
          id: userFeatureId,
        },
      });
      return;
    } else {
      const duration = userFeature.durations[0];
      await prisma.userFeature.update({
        where: {
          id: userFeatureId,
        },
        data: {
          durations: {
            update: {
              where: {
                id: duration.id,
              },
              data: {
                consume_start: new Date(),
                consume_end: new Date(Date.now() + Number(duration.duration)),
              }
            }
          }
        }
      }).catch((e) => {
        console.error(e);
        console.log(require("util").inspect({
          where: {
            id: userFeatureId,
          },
          data: {
            durations: {
              update: {
                where: {
                  id: duration.id,
                },
                data: {
                  consume_start: new Date(),
                  consume_end: new Date(Date.now() + Number(duration.duration)),
                }
              }
            }
          }
        }, { depth: 16, colors: true }));
      });
    }
  } else if (userId) {
    const userFeatures = await prisma.userFeature.findMany({
      where: {
        user_id: userId,
        // enabled: true,
        durations: {
          some: {
            consume_end: null,
          }
        }
      },
      select: {
        id: true,
        durations: true,
      },
    });

    for (const userFeature of userFeatures) {

      userFeature.current_duration = userFeature.durations.reduce((p, c) => c?.consume_end > p?.consume_end ? c : p);

      if (userFeature.current_duration?.consume_end && userFeature.current_duration.consume_end.getTime() > Date.now()) continue;

      if (userFeature.durations.some(y => !y.consume_end).length === 0) {
        // await prisma.userFeature.update({
        //   where: {
        //     id: userFeature.id,
        //   },
        //   data: {
        //     enabled: false,
        //   }
        // });

        const infinityDuration = await prisma.featureDuration.findFirst({
          where: {
            user_feature_id: userFeature.id,
            duration: -1,
          }
        });

        if (infinityDuration) {
          await prisma.featureDuration.update({
            where: {
              id: infinityDuration.id,
            },
            data: {
              consume_start: new Date(Date.now() - 1000 * 60),
              consume_end: new Date(Date.now() + 1000 * 60),
            }
          })
          return;
        }

        await prisma.userFeature.delete({
          where: {
            id: userFeature.id,
          },
        });

      } else {
        const duration = userFeature.durations.find(y => !y.consume_end);
        await prisma.userFeature.update({
          where: {
            id: userFeature.id,
          },
          data: {
            durations: {
              update: {
                where: {
                  id: duration.id,
                },
                data: {
                  consume_start: new Date(),
                  consume_end: new Date(Date.now() + Number(duration.duration)),
                }
              }
            }
          }
        });
      }
    }
  } else {
    throw new Error("No user feature id or user id provided.");
  }
}

module.exports = formatifyFeatureDurations;