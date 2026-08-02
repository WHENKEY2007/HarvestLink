const getMarketTrends = async (req, res, next) => {
  try {
    const marketTrends = {
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      crops: {
        "Wheat": [24, 25, 26, 25, 27, 28],
        "Basmati Rice (1121)": [78, 80, 81, 83, 84, 85],
        "Organic Roma Tomatoes": [20, 35, 55, 30, 25, 40],
        "Red Onions": [18, 16, 20, 24, 25, 22]
      }
    };

    return res.status(200).json({
      success: true,
      data: marketTrends
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMarketTrends };
