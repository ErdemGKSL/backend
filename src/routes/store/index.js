const { Router } = require('express');
const router = Router();

router.get('/items', require("./items.js"));

router.get('/packs', require("./packs.js"));

router.get('/featured', require("./featured.js"));

router.use('/payment', require("./payment/index.js"));

module.exports = router;