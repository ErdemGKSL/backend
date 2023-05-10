const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const limiter = (seconds = 60, limit = 5) => rateLimit({ windowMs: seconds * 1000, max: limit, keyGenerator: (request, response) => request.header("x-forwared-for") });

const router = Router();

router.post('/create-checkout-session', limiter(60, 5), require("../../../middlewares/user-auth"), require('./create-checkout-session.js'));
router.post(`/callback/${process.env.VALLET_WEBHOOK_SECRET}`, require('./callback.js'));

router.get('/list', limiter(60, 5), require("../../../middlewares/user-auth"), require('./list.js'));

router.delete('/:id', limiter(60, 15),require("../../../middlewares/user-auth"), require("./cancel.js"));

module.exports = router;