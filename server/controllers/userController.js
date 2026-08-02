const User = require('../models/User');

const getMe = async (req, res, next) => {
  try {
    const user = req.user.dbUser;
    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMe };
