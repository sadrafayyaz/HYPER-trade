const express = require("express");

const router = express.Router();

const marketController = require("../controllers/market.controller");

router.get("/prices", marketController.prices);

module.exports = router;