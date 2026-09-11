const marketService = require("../services/market.service");

exports.prices = async (req, res) => {
  try {
    const prices = await marketService.getPrices();

    res.status(200).json({
      success: true,
      data: prices,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Unable to fetch market prices",
    });
  }
};